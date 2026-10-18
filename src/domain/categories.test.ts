import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  taskFields,
  type Command,
  type PlannerAction,
} from './commands';
import { initialCategories, resolveCategory } from './categories';
import {
  appStateSchema,
  createTask,
  emptyState,
  settleRewards,
  type AppState,
} from './state';

const NOW = Date.parse('2026-10-06T10:00:00+08:00');
const command = (action: PlannerAction, at = NOW): Command => ({
  id: crypto.randomUUID(),
  at,
  order: at,
  action,
});
const apply = (state: AppState, action: PlannerAction) =>
  applyCommand(state, command(action), NOW);
const input = {
  title: 'A flexible task',
  note: '',
  category: 'Personal',
  assignedDay: null,
  deadline: null,
};
describe('editable category catalog', () => {
  it.each([1, 2, 3])(
    'migrates version %i with stable category IDs and progress',
    (version) => {
      const state = emptyState();
      const { categories: _, ...old } = {
        ...state,
        version,
        coins: 87,
        preferences: { defaultCategory: 'Work' },
        tasks: [createTask(input, NOW)],
      };
      const migrated = appStateSchema.parse(old);
      expect(migrated.version).toBe(4);
      expect(migrated.categories).toEqual(initialCategories());
      expect(migrated.preferences.defaultCategory).toBe('Work');
      expect(migrated.coins).toBe(87);
      expect(migrated.tasks).toEqual(old.tasks);
      expect(
        appStateSchema.parse(JSON.parse(JSON.stringify(migrated))),
      ).toEqual(migrated);
    },
  );
  it('trims names, keeps IDs on rename, and rejects duplicates or reserved names', () => {
    const state = apply(emptyState(), {
      kind: 'createCategory',
      categoryId: 'study',
      name: '  Studies  ',
    });
    const renamed = apply(state, {
      kind: 'renameCategory',
      categoryId: 'study',
      previous: 'Studies',
      name: 'Learning',
    });
    expect(
      renamed.categories.find((category) => category.id === 'study')?.name,
    ).toBe('Learning');
    for (const name of [
      '',
      '  ',
      'personal',
      'General',
      'All categories',
      'a'.repeat(41),
    ])
      expect(() =>
        apply(state, { kind: 'createCategory', categoryId: 'extra', name }),
      ).toThrow();
    expect(() =>
      apply(renamed, {
        kind: 'renameCategory',
        categoryId: 'study',
        previous: 'Studies',
        name: 'Other',
      }),
    ).toThrow('another device');
    expect(() =>
      apply(state, {
        kind: 'createCategory',
        categoryId: 'study',
        name: 'Other',
      }),
    ).toThrow();
  });
  it('atomically replaces tasks, completed history, series and defaults without changing rewards', () => {
    let state = apply(emptyState(), {
      kind: 'create',
      taskId: 'routine',
      input: {
        ...input,
        assignedDay: '2026-10-06',
        repeat: { mode: 'daily', days: [] },
      },
    });
    const done = command({ kind: 'complete', taskId: state.tasks[0].id });
    state = settleRewards(applyCommand(state, done, NOW), NOW + 10000);
    const original = state.tasks;
    const moved = apply(state, {
      kind: 'removeCategory',
      categoryId: 'Personal',
      previous: 'Personal',
      replacementId: 'Work',
    });
    expect(moved.coins).toBe(5);
    expect(moved.tasks.map((task) => task.category)).toEqual(['Work', 'Work']);
    expect(moved.tasks[0]).toEqual({ ...original[0], category: 'Work' });
    expect(moved.tasks[1].occurrenceTouched).toBe(true);
    expect(moved.series[0].category).toBe('Work');
    expect(moved.preferences.defaultCategory).toBe('Work');
    expect(appStateSchema.parse(moved)).toEqual(moved);
    expect(() =>
      applyCommand(
        moved,
        command(
          { kind: 'undo', taskId: original[0].id, completionId: done.id },
          NOW + 1000,
        ),
        NOW + 20000,
      ),
    ).toThrow('another device');
  });
  it('resolves offline creates, edits and preferences through redirect chains without resurrection', () => {
    let state = apply(emptyState(), { kind: 'create', taskId: 'one', input });
    const before = taskFields(state.tasks[0]);
    state = apply(state, {
      kind: 'removeCategory',
      categoryId: 'Personal',
      previous: 'Personal',
      replacementId: 'Work',
    });
    state = apply(state, {
      kind: 'removeCategory',
      categoryId: 'Work',
      previous: 'Work',
      replacementId: 'Health',
    });
    state = apply(state, { kind: 'create', taskId: 'offline', input });
    state = apply(state, {
      kind: 'edit',
      taskId: 'one',
      before,
      input: { ...before, note: 'Saved while offline' },
    });
    state = apply(state, {
      kind: 'preference',
      previous: 'Personal',
      category: 'Work',
    });
    expect(state.tasks.map((task) => task.category)).toEqual([
      'Health',
      'Health',
    ]);
    expect(state.tasks[0].note).toBe('Saved while offline');
    expect(state.preferences.defaultCategory).toBe('Health');
    expect(resolveCategory(state.categories, 'Personal')).toBe('Health');
    expect(() =>
      apply(state, {
        kind: 'createCategory',
        categoryId: 'Personal',
        name: 'Restored',
      }),
    ).toThrow();
  });
  it('rejects redirect cycles, missing references, and removal of the last category', () => {
    const state = {
      ...emptyState(),
      categories: [{ id: 'Personal', name: 'Personal', replacementId: null }],
    };
    expect(() =>
      apply(state, {
        kind: 'removeCategory',
        categoryId: 'Personal',
        previous: 'Personal',
        replacementId: 'Personal',
      }),
    ).toThrow();
    expect(() =>
      apply(state, {
        kind: 'removeCategory',
        categoryId: 'Personal',
        previous: 'Personal',
        replacementId: 'missing',
      }),
    ).toThrow();
    expect(appStateSchema.safeParse({ ...state, categories: [] }).success).toBe(
      false,
    );
    expect(
      appStateSchema.safeParse({
        ...state,
        categories: [
          { id: 'Personal', name: 'Personal', replacementId: 'Personal' },
        ],
      }).success,
    ).toBe(false);
    expect(
      appStateSchema.safeParse({
        ...emptyState(),
        preferences: { defaultCategory: 'missing' },
      }).success,
    ).toBe(false);
  });
});
