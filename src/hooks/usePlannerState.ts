import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyCommand, replayCommands, type CloudSnapshot, type Command, type PlannerAction, type Receipt } from '../domain/commands';
import { acknowledge, addConflict, cachedSnapshot, cacheSnapshot, dismissConflict, enqueue, queuedCommands, readConflicts, type SyncConflict } from '../domain/offline';
import { emptyState, settleRewards, STORAGE_KEY } from '../domain/state';
import { persistState, readState } from '../domain/storage';

export type Account = { id: string; email: string; name: string };
type Session = { user: Account | null; clientId: string | null; nonce: string | null };
type SyncResponse = CloudSnapshot & { receipts?: Receipt[] };
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError(response.status, 'Cloud sync is not available on this server.');
  const value = await response.json();
  if (!response.ok) throw new ApiError(response.status, value.error ?? 'Sync unavailable.');
  return value;
}
function rememberedAccount(): Account | null {
  try { return JSON.parse(localStorage.getItem('petlist:last-account') ?? 'null'); } catch { return null; }
}

export function usePlannerState() {
  const [initial] = useState(readState);
  const [session, setSession] = useState<Session>(() => ({ user: rememberedAccount(), clientId: null, nonce: null }));
  const owner = useRef(session.user?.id ?? null);
  const [snapshot, setSnapshot] = useState<CloudSnapshot>(() => {
    try { return owner.current ? cachedSnapshot(owner.current) ?? { state: emptyState(), revision: 0 } : { state: initial.state, revision: 0 }; }
    catch { return { state: emptyState(), revision: 0 }; }
  });
  const snapshotRef = useRef(snapshot);
  const [queue, setQueue] = useState<Command[]>(() => { try { return owner.current ? queuedCommands(owner.current) : []; } catch { return []; } });
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [now, setNow] = useState(Date.now());
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [error, setError] = useState(initial.error);
  const [saveBlocked, setSaveBlocked] = useState(initial.error !== null);
  const busy = useRef(false);
  const counter = useRef(0);
  const state = useMemo(() => settleRewards(replayCommands(snapshot, queue, now), now), [snapshot, queue, now]);
  const localProgress = useMemo(() => readState().state, [session.user?.id]);

  function updateSnapshot(next: CloudSnapshot) { snapshotRef.current = next; setSnapshot(next); }
  const refreshLocal = useCallback(() => {
    const id = owner.current;
    if (!id) return;
    try {
      const next = cachedSnapshot(id);
      if (next) updateSnapshot(next);
      setQueue(queuedCommands(id)); setConflicts(readConflicts(id));
    } catch { setSyncError('Your offline cache could not be read. It has not been cleared.'); }
  }, []);

  function switchAccount(user: Account | null) {
    const id = user?.id ?? null;
    localStorage.setItem('petlist:last-account', JSON.stringify(user));
    if (owner.current === id) return;
    owner.current = id;
    updateSnapshot(id ? cachedSnapshot(id) ?? { state: emptyState(), revision: 0 } : { state: readState().state, revision: 0 });
    setQueue(id ? queuedCommands(id) : []); setConflicts(id ? readConflicts(id) : []);
  }

  const refreshSession = useCallback(async () => {
    try {
      const next = await api<Session>('/api/session');
      switchAccount(next.user); setSession(next); setSyncError(null);
    } catch (reason) { setSyncError(reason instanceof Error ? reason.message : 'Sign-in is unavailable.'); }
  }, []);

  const sync = useCallback(async () => {
    const id = owner.current;
    if (!id || busy.current || !navigator.onLine) return;
    busy.current = true; setSyncing(true);
    try {
      const commands = queuedCommands(id).slice(0, 50);
      const response = commands.length ? await api<SyncResponse>('/api/sync', { commands }) : await api<SyncResponse>('/api/planner');
      // Save the canonical base before removing receipts, so a crash never loses acknowledged changes.
      const latest = cacheSnapshot(id, response);
      for (const receipt of response.receipts ?? []) {
        const command = commands.find(value => value.id === receipt.id);
        if (receipt.error && command) addConflict(id, { command, message: receipt.error });
        acknowledge(id, receipt.id);
      }
      if (owner.current === id) { updateSnapshot(latest); refreshLocal(); setSyncError(null); }
    } catch (reason) {
      setSyncError(reason instanceof Error ? reason.message : 'Changes will sync when connected.');
      if (reason instanceof ApiError && reason.status === 401) await refreshSession();
    } finally { busy.current = false; setSyncing(false); }
  }, [refreshLocal, refreshSession]);

  useEffect(() => { void refreshSession(); }, [refreshSession]);
  useEffect(() => { void sync(); const timer = setInterval(() => { if (!document.hidden) void sync(); }, 5000); return () => clearInterval(timer); }, [sync, session.user?.id]);
  useEffect(() => {
    const reconnect = () => { setOnline(navigator.onLine); if (navigator.onLine) void refreshSession().then(sync); };
    const visibility = () => { if (!document.hidden) void sync(); };
    const storage = (event: StorageEvent) => {
      if (event.key?.startsWith('petlist:')) refreshLocal();
      else if (event.key === STORAGE_KEY && !owner.current && event.newValue) updateSnapshot({ state: readState().state, revision: 0 });
    };
    window.addEventListener('online', reconnect); window.addEventListener('offline', reconnect); window.addEventListener('storage', storage); document.addEventListener('visibilitychange', visibility);
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => { clearInterval(timer); window.removeEventListener('online', reconnect); window.removeEventListener('offline', reconnect); window.removeEventListener('storage', storage); document.removeEventListener('visibilitychange', visibility); };
  }, [sync, refreshLocal, refreshSession]);
  useEffect(() => {
    if (owner.current || saveBlocked) return;
    const settled = settleRewards(snapshotRef.current.state, now);
    if (settled !== snapshotRef.current.state) {
      if (persistState(settled)) updateSnapshot({ state: settled, revision: 0 });
      else setError('Changes could not be saved. Export a backup before closing.');
    }
  }, [now, saveBlocked]);

  function dispatch(action: PlannerAction): boolean {
    const at = Date.now();
    const command: Command = { id: crypto.randomUUID(), at, order: at * 1000 + counter.current++ % 1000, action };
    try {
      if (owner.current) {
        const preview = settleRewards(replayCommands(snapshotRef.current, queuedCommands(owner.current), at), at);
        applyCommand(preview, command, at, snapshotRef.current.revision);
        if (action.kind === 'replace' && (!navigator.onLine || queuedCommands(owner.current).length)) throw new Error('Sync queued changes before replacing your cloud planner.');
        enqueue(owner.current, command); refreshLocal(); void sync();
      } else {
        if (saveBlocked && action.kind !== 'replace') throw new Error('Restore a valid backup before saving new changes.');
        const next = applyCommand(settleRewards(snapshotRef.current.state, at), command, at);
        if (!persistState(next)) throw new Error('This change could not be saved on your device.');
        updateSnapshot({ state: next, revision: 0 }); setSaveBlocked(false);
      }
      setError(null); return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Change could not be saved.'); return false; }
  }

  async function signIn(credential: string) {
    try { await api('/api/login', { credential }); await refreshSession(); await sync(); }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'Sign-in failed.'; await refreshSession(); setSyncError(message); }
  }
  async function signOut() {
    if (!online || queue.length) { setSyncError('Reconnect and sync your queued changes before signing out.'); return; }
    try { await api('/api/logout', {}); switchAccount(null); setSession(current => ({ ...current, user: null })); await refreshSession(); }
    catch (reason) { setSyncError(reason instanceof Error ? reason.message : 'Sign-out failed.'); }
  }
  function dismiss(id: string) { if (owner.current) { dismissConflict(owner.current, id); refreshLocal(); } }

  return { state, dispatch, now, error, setError, session, online, syncing, syncError, queued: queue.length, conflicts,
    revision: snapshot.revision, signIn, signOut, sync, dismissConflict: dismiss, localProgress };
}
