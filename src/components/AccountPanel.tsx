import { useEffect, useRef, useState } from 'react';
import type { usePlannerState } from '../hooks/usePlannerState';
import type { Command } from '../domain/commands';

type GoogleIdentity = { accounts: { id: { initialize: (options: { client_id: string; nonce: string; callback: (response: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: { theme: string; size: string; text: string }) => void } } };
declare global { interface Window { google?: GoogleIdentity } }
let loadingGoogle: Promise<void> | null = null;
function loadGoogle(): Promise<void> {
  if (window.google) return Promise.resolve();
  if (loadingGoogle) return loadingGoogle;
  loadingGoogle = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = () => resolve(); script.onerror = () => { loadingGoogle = null; reject(new Error('Google sign-in could not load. Check your connection.')); };
    document.head.appendChild(script);
  });
  return loadingGoogle;
}

export default function AccountPanel({ planner, onReview }: { planner: ReturnType<typeof usePlannerState>; onReview: (command: Command) => void }) {
  const button = useRef<HTMLDivElement>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { session } = planner;
  useEffect(() => {
    let cancelled = false;
    if (session.user || !session.clientId || !session.nonce || !planner.online) return;
    void loadGoogle().then(() => {
      if (cancelled || !button.current) return;
      window.google!.accounts.id.initialize({ client_id: session.clientId!, nonce: session.nonce!, callback: response => void planner.signIn(response.credential) });
      window.google!.accounts.id.renderButton(button.current, { theme: 'outline', size: 'large', text: 'signin_with' });
    }).catch(reason => setLoginError(reason.message));
    return () => { cancelled = true; };
  }, [session.clientId, session.nonce, session.user?.id, planner.online]);
  const local = planner.localProgress;
  const hasLocal = local.tasks.length > 0 || local.coins > 0 || local.owned.length > 0 || local.pets.owned.length > 1;
  function migrate() {
    if (!window.confirm('Replace your cloud planner with the progress saved on this device? Export your cloud progress first if you want to keep it.')) return;
    planner.dispatch({ kind: 'replace', state: local, expectedRevision: planner.revision });
  }
  return <section className="settings-section account-panel"><h3>Your account & sync</h3>
    {session.user ? <><p>Signed in as <b>{session.user.email}</b>. Your planner is shared across devices using this Google account.</p>
      <p role="status">{!planner.online ? 'Offline · changes are saved on this device' : planner.syncing ? 'Syncing…' : planner.queued ? `${planner.queued} changes waiting to sync` : planner.syncError ? 'Sync needs attention' : 'Up to date'}{planner.queued > 0 && ` · ${planner.queued} queued`}</p>
      <div className="settings-actions"><button className="secondary-button" disabled={!planner.online || planner.syncing} onClick={() => void planner.sync()}>Sync now</button><button className="secondary-button" disabled={!planner.online || planner.queued > 0} onClick={() => void planner.signOut()}>Sign out</button></div>
      {hasLocal && <><p>Progress from before sign-in is still saved on this device. Move it online only from the device containing the version you want to keep.</p><button className="secondary-button" disabled={!planner.online || planner.queued > 0} onClick={migrate}>Move this device’s progress online</button></>}
    </> : <><p>Sign in with the same Google account on your phone and laptop to share your planner. Until then, this planner is saved only on this device.</p>
      {!session.clientId && <p>Google sign-in is awaiting the app’s Google Client ID.</p>}<div ref={button} />
    </>}
    {(planner.syncError || loginError) && <p className="danger-text" role="status">{loginError ?? planner.syncError}</p>}
    {planner.conflicts.length > 0 && <div className="sync-conflicts"><h4>Changes to review</h4>{planner.conflicts.map(conflict => <article key={conflict.command.id}><p>{conflict.message}</p>{conflict.command.action.kind === 'edit' && <button className="text-button" onClick={() => onReview(conflict.command)}>Review my task edit</button>}<button className="text-button" onClick={() => planner.dismissConflict(conflict.command.id)}>Dismiss notice</button></article>)}</div>}
  </section>;
}
