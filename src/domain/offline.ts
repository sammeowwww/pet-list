import { commandSchema, type CloudSnapshot, type Command } from './commands';
import { appStateSchema } from './state';

export type SyncConflict = { command: Command; message: string };
const prefix = (owner: string) => `petlist:outbox:${owner}:`;
export function queuedCommands(owner: string): Command[] {
  const commands: Command[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)!;
    if (!key.startsWith(prefix(owner))) continue;
    commands.push(commandSchema.parse(JSON.parse(localStorage.getItem(key)!)));
  }
  return commands.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
export function enqueue(owner: string, command: Command): void { localStorage.setItem(prefix(owner) + command.id, JSON.stringify(command)); }
export function acknowledge(owner: string, id: string): void { localStorage.removeItem(prefix(owner) + id); }
export function cachedSnapshot(owner: string): CloudSnapshot | null {
  const raw = localStorage.getItem(`petlist:cache:${owner}`);
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (!Number.isInteger(value.revision) || value.revision < 0) throw new Error('Invalid cloud cache.');
  return { state: appStateSchema.parse(value.state), revision: value.revision };
}
export function cacheSnapshot(owner: string, snapshot: CloudSnapshot): CloudSnapshot {
  const previous = cachedSnapshot(owner);
  const latest = previous && previous.revision > snapshot.revision ? previous : snapshot;
  localStorage.setItem(`petlist:cache:${owner}`, JSON.stringify(latest));
  return latest;
}
export function readConflicts(owner: string): SyncConflict[] {
  return JSON.parse(localStorage.getItem(`petlist:conflicts:${owner}`) ?? '[]');
}
export function addConflict(owner: string, conflict: SyncConflict): void {
  const previous = readConflicts(owner).filter(value => value.command.id !== conflict.command.id);
  localStorage.setItem(`petlist:conflicts:${owner}`, JSON.stringify([...previous, conflict]));
}
export function dismissConflict(owner: string, id: string): void {
  localStorage.setItem(`petlist:conflicts:${owner}`, JSON.stringify(readConflicts(owner).filter(value => value.command.id !== id)));
}
