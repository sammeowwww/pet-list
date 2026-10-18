import { useRef } from 'react';
import { Check, Download, Upload } from 'lucide-react';
import { activeCategories } from '../domain/categories';
import CategoryManager from './CategoryManager';
import { emptyState, type AppState } from '../domain/state';
import { exportBackup, parseBackup } from '../domain/storage';
import { exampleState } from '../domain/examples';
import AccountPanel from './AccountPanel';
import type { usePlannerState } from '../hooks/usePlannerState';
import type { Command } from '../domain/commands';

export default function SettingsDialog({
  state,
  error,
  onReplace,
  onError,
  onClose,
  planner,
  onReview,
  onTour,
}: {
  state: AppState;
  error: string | null;
  onReplace: (state: AppState) => void;
  onError: (message: string) => void;
  onClose: () => void;
  onTour: () => void;
  planner: ReturnType<typeof usePlannerState>;
  onReview: (command: Command) => void;
}) {
  const importRef = useRef<HTMLInputElement>(null);

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('File too large');
      const next = parseBackup(await file.text());
      if (
        window.confirm(
          'Replace your planner with this backup? Export current progress first if you want to keep it.',
        )
      )
        onReplace(next);
    } catch {
      onError(
        'This backup could not be imported. Choose a valid PetList or Little by Little JSON backup. Your progress is unchanged.',
      );
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  }

  function loadExample() {
    if (
      !window.confirm(
        'Replace your planner with example tasks? Export current progress first if you want to keep it.',
      )
    )
      return;
    onReplace(exampleState(Date.now()));
    onClose();
  }

  function reset() {
    if (
      !window.confirm(
        'Clear all tasks, coins, pets, and decorations in this planner? This cannot be undone without a backup.',
      )
    )
      return;
    onReplace(emptyState());
    onClose();
  }

  return (
    <div className="page simple-page settings-page">
      <section className="page-title history-title">
        <div>
          <p className="eyebrow">MAKE IT YOURS</p>
          <h1>Settings</h1>
        </div>
      </section>
      <section className="history-card">
        <p className="dialog-intro">
          Dates and daily rewards use Singapore time.
        </p>
        <section className="settings-section">
          <h3>Task preferences</h3>
          <label className="preference-label">
            Default task category
            <select
              aria-label="Default task category"
              value={state.preferences.defaultCategory}
              onChange={(event) =>
                planner.dispatch({
                  kind: 'preference',
                  previous: state.preferences.defaultCategory,
                  category: event.target
                    .value as typeof state.preferences.defaultCategory,
                })
              }
            >
              {activeCategories(state.categories).map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <p>Used for new tasks. Existing tasks keep their category.</p>
        </section>
        <CategoryManager
          state={state}
          dispatch={planner.dispatch}
        />
        <section className="settings-section">
          <h3>A little help getting started</h3>
          <p>
            Explore planning, rewards, feeding, and sync in an illustrated
            guide.
          </p>
          <button
            className="secondary-button"
            onClick={onTour}
          >
            Replay walkthrough
          </button>
        </section>
        <AccountPanel
          planner={planner}
          onReview={onReview}
        />
        <section className="settings-section">
          <h3>Keep a copy of your progress</h3>
          <p>
            Export before clearing browser data or switching devices. Backups
            from the previous app still work.
          </p>
          <div className="settings-actions">
            <button
              className="secondary-button"
              onClick={() => exportBackup(state)}
            >
              <Download size={16} /> Export backup
            </button>
            <button
              className="secondary-button"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={16} /> Import backup
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => void importFile(event.target.files?.[0])}
            />
          </div>
        </section>
        <section className="settings-section">
          <h3>Explore an example week</h3>
          <p>
            Load sample tasks and a previous completion. This replaces your
            current planner.
          </p>
          <button
            className="secondary-button"
            onClick={loadExample}
          >
            Try an example week
          </button>
        </section>
        <section className="settings-section">
          <h3>Start with a clean page</h3>
          <p>
            Remove tasks, coins, purchased pets, and decorations from this
            planner. Your starter Bob stays.
          </p>
          <button
            className="text-button danger-text"
            onClick={reset}
          >
            Reset planner
          </button>
        </section>
        {!error && (
          <p className="saved-note">
            <Check size={15} />{' '}
            {planner.session.user
              ? 'Changes saved locally and queued for cloud sync'
              : 'Saved automatically on this device'}
          </p>
        )}
      </section>
    </div>
  );
}
