import {
  appStateSchema,
  emptyState,
  settleRewards,
  STORAGE_KEY,
  type AppState,
} from './state';

export function readState(): { state: AppState; error: string | null } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return {
      state: saved
        ? settleRewards(appStateSchema.parse(JSON.parse(saved)), Date.now())
        : emptyState(),
      error: null,
    };
  } catch {
    return {
      state: emptyState(),
      error:
        'Your saved data could not be loaded. It has not been overwritten. Import a backup, or explicitly start fresh in Settings.',
    };
  }
}

export function persistState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function parseBackup(contents: string): AppState {
  return settleRewards(appStateSchema.parse(JSON.parse(contents)), Date.now());
}

export function exportBackup(state: AppState): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'petlist-backup.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
