import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  replayCommands,
  taskFields,
  type Command,
  type PlannerAction,
} from './commands';
import {
  appStateSchema,
  createTask,
  dailyBonusAvailable,
  emptyState,
  generalTasks,
  settleRewards,
  type AppState,
  type TaskInput,
} from './state';
import { nextRepeatDay, repeatRuleSchema } from './repeat';
import { localDay } from './dates';

const NOW = Date.parse('2026-10-06T10:00:00+08:00');
const input: TaskInput = {
  title: 'Water plants',
  category: 'Personal',
  note: '',
  assignedDay: '2026-10-06',
  deadline: null,
  repeat: { mode: 'daily', days: [] },
};
const command = (action: PlannerAction, at = NOW): Command => ({
  id: crypto.randomUUID(),
  at,
  order: at,
  action,
});
function started(value = input): AppState {
  return applyCommand(
    emptyState(),
    command({ kind: 'create', taskId: 'series', input: value }),
    NOW,
  );
}
function completed(state = started(), at = NOW) {
  const c = command({ kind: 'complete', taskId: state.tasks[0].id }, at);
  return { state: applyCommand(state, c, at), c };
}

describe('recurring tasks and compatible planner preferences', () => {
  it('migrates older backups and filters only unfinished undated tasks', () => {
    const ordinary = createTask(
      { ...input, repeat: null, assignedDay: null },
      NOW,
    );
    const old = appStateSchema.parse({
      version: 1,
      tasks: [ordinary],
      coins: 100,
      bonusDays: [],
      owned: ['bed'],
      placements: { bed: { column: 6, row: 2 } },
    });
    expect(old.preferences.defaultCategory).toBe('Personal');
    expect(old.series).toEqual([]);
    expect(old.coins).toBe(100);
    expect(
      generalTasks([
        { ...ordinary, status: 'inprogress' },
        { ...ordinary, id: 'dated', assignedDay: '2026-10-06' },
        { ...ordinary, id: 'due', deadline: '2026-10-06T12:00:00Z' },
      ]),
    ).toHaveLength(1);
    const state = applyCommand(
      old,
      command({ kind: 'preference', category: 'Home', previous: 'Personal' }),
      NOW,
    );
    expect(state.preferences.defaultCategory).toBe('Home');
    expect(state.tasks[0].category).toBe('Personal');
    expect(appStateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(
      state,
    );
  });
  it('starts on eligible days, rejects empty selections, and keeps deadlines on the planned day', () => {
    expect(nextRepeatDay('2026-10-10', { mode: 'weekdays', days: [] })).toBe(
      '2026-10-12',
    );
    expect(
      nextRepeatDay('2026-10-06', { mode: 'selected', days: [1, 5] }),
    ).toBe('2026-10-09');
    expect(
      repeatRuleSchema.safeParse({ mode: 'selected', days: [] }).success,
    ).toBe(false);
    const state = started({
      ...input,
      assignedDay: '2026-10-10',
      repeat: { mode: 'weekdays', days: [] },
      deadline: '2026-10-10T10:00:00.000Z',
    });
    expect(state.tasks[0].assignedDay).toBe('2026-10-12');
    expect(state.tasks[0].deadline).toBe('2026-10-12T10:00:00.000Z');
    expect(() =>
      applyCommand(
        state,
        command({ kind: 'complete', taskId: state.tasks[0].id }),
        NOW,
      ),
    ).toThrow('not due');
    expect(() => started({ ...input, assignedDay: null })).toThrow(
      'start date',
    );
  });
  it('settles once, generates one successor, and preserves missed dates without piling up', () => {
    const { state } = completed();
    expect(settleRewards(state, NOW + 9999).tasks).toHaveLength(1);
    const settled = settleRewards(state, NOW + 10000);
    expect(settled.coins).toBe(5);
    expect(settled.tasks[1].id).toBe('series:2026-10-07');
    const later = settleRewards(settled, NOW + 30 * 86400000);
    expect(later.tasks).toHaveLength(2);
    expect(later.tasks[1].assignedDay).toBe('2026-10-07');
    expect(later.coins).toBe(5);
    const missedCompletion = applyCommand(
      later,
      command(
        { kind: 'complete', taskId: later.tasks[1].id },
        NOW + 30 * 86400000,
      ),
      NOW + 30 * 86400000,
    );
    const next = settleRewards(missedCompletion, NOW + 30 * 86400000 + 10000);
    expect(next.tasks[2].assignedDay).toBe('2026-11-06');
    expect(next.coins).toBe(10);
  });
  it('uses Singapore completion day at midnight and skips weekends', () => {
    const friday = started({
      ...input,
      assignedDay: '2026-10-09',
      repeat: { mode: 'weekdays', days: [] },
    });
    const at = Date.parse('2026-10-09T23:59:58+08:00');
    const { state } = completed(friday, at);
    expect(localDay(at + 10000)).toBe('2026-10-10');
    expect(settleRewards(state, at + 10000).tasks[1].assignedDay).toBe(
      '2026-10-12',
    );
  });
  it('undo cancels succession; delayed offline undo removes only untouched successors', () => {
    const { state, c } = completed();
    const undo = command(
      { kind: 'undo', taskId: state.tasks[0].id, completionId: c.id },
      NOW + 1000,
    );
    expect(
      settleRewards(applyCommand(state, undo, NOW + 1000), NOW + 20000).tasks,
    ).toHaveLength(1);
    const settled = settleRewards(state, NOW + 20000);
    const restored = applyCommand(settled, undo, NOW + 20000);
    expect(restored.tasks).toHaveLength(1);
    expect(restored.coins).toBe(0);
    const next = settled.tasks[1];
    const touched = applyCommand(
      settled,
      command(
        {
          kind: 'status',
          taskId: next.id,
          status: 'inprogress',
          previous: 'todo',
        },
        NOW + 20000,
      ),
      NOW + 20000,
    );
    expect(() => applyCommand(touched, undo, NOW + 20000)).toThrow(
      'another device',
    );
    const edited = applyCommand(
      settled,
      command(
        {
          kind: 'edit',
          taskId: next.id,
          before: taskFields(next),
          input: { ...taskFields(next), title: 'Changed' },
        },
        NOW + 20000,
      ),
      NOW + 20000,
    );
    expect(() => applyCommand(edited, undo, NOW + 20000)).toThrow(
      'another device',
    );
    expect(edited.tasks[0]).toEqual(settled.tasks[0]);
  });
  it('updates only the unfinished occurrence; stopping and deleting preserve completed records', () => {
    const settled = settleRewards(completed().state, NOW + 10000);
    const next = settled.tasks[1];
    const edited = applyCommand(
      settled,
      command({
        kind: 'edit',
        taskId: next.id,
        before: taskFields(next),
        input: {
          ...taskFields(next),
          title: 'Water herbs',
          repeat: { mode: 'selected', days: [5] },
        },
      }),
      NOW,
    );
    expect(edited.tasks[0]).toEqual(settled.tasks[0]);
    expect(edited.tasks[1].assignedDay).toBe('2026-10-09');
    const stopped = applyCommand(
      edited,
      command({
        kind: 'edit',
        taskId: next.id,
        before: taskFields(edited.tasks[1]),
        input: { ...taskFields(edited.tasks[1]), repeat: null },
      }),
      NOW,
    );
    expect(stopped.tasks[1].seriesId).toBeNull();
    expect(stopped.tasks[0]).toEqual(settled.tasks[0]);
    const deleted = applyCommand(
      edited,
      command({ kind: 'delete', taskId: next.id, before: edited.tasks[1] }),
      NOW,
    );
    expect(settleRewards(deleted, NOW + 86400000).tasks).toEqual([
      settled.tasks[0],
    ]);
  });
  it('protects a successor that another device completed and then undid', () => {
    const { state, c } = completed();
    const settled = settleRewards(state, NOW + 10000);
    const nextAt = NOW + 86400000;
    const nextCompletion = command(
      { kind: 'complete', taskId: settled.tasks[1].id },
      nextAt,
    );
    const nextDone = applyCommand(settled, nextCompletion, nextAt);
    const nextUndo = command(
      {
        kind: 'undo',
        taskId: settled.tasks[1].id,
        completionId: nextCompletion.id,
      },
      nextAt + 1000,
    );
    const restored = applyCommand(nextDone, nextUndo, nextAt + 1000);
    const parentUndo = command(
      { kind: 'undo', taskId: settled.tasks[0].id, completionId: c.id },
      NOW + 1000,
    );
    expect(() => applyCommand(restored, parentUndo, nextAt + 2000)).toThrow(
      'another device',
    );
  });
  it('replays an offline edit of a newly derived occurrence in command order', () => {
    const state = started();
    const complete = command({ kind: 'complete', taskId: state.tasks[0].id });
    const preview = settleRewards(
      applyCommand(state, complete, NOW),
      NOW + 11000,
    );
    const next = preview.tasks[1];
    const edit = command(
      {
        kind: 'edit',
        taskId: next.id,
        before: taskFields(next),
        input: { ...taskFields(next), note: 'Offline note' },
      },
      NOW + 12000,
    );
    const replayed = replayCommands(
      { state, revision: 0 },
      [complete, edit],
      NOW + 15000,
    );
    expect(replayed.tasks[1].note).toBe('Offline note');
    expect(replayed.coins).toBe(5);
  });
  it('unfinished general tasks do not prevent the daily bonus', () => {
    const general = createTask(
      { ...input, assignedDay: null, repeat: null },
      NOW,
    );
    const settled = settleRewards(completed().state, NOW + 10000);
    expect(
      dailyBonusAvailable(
        { ...settled, tasks: [...settled.tasks, general] },
        NOW + 10000,
      ),
    ).toBe(true);
  });
});
