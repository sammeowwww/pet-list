import { describe, expect, it } from 'vitest';
import { addDays, localDay, resolveDeadline, weekStart } from './dates';
import { appStateSchema, buyItem, claimBonus, completeTask, createTask, dailyBonusAvailable, emptyState, placeItem, setTaskStatus, settleRewards, tasksForDay, undoTask, UNDO_MS, type Task } from './state';

const now = Date.parse('2026-10-04T10:00:00+08:00');
const today = localDay(now);
function task(overrides: Partial<Task> = {}): Task {
  return { ...createTask({ title: 'A task', note: '', category: 'Personal', effort: 'medium', assignedDay: today, deadline: null }, now), ...overrides };
}

describe('planning by day', () => {
  it('uses Singapore midnight and Monday week boundaries', () => {
    expect(localDay(Date.parse('2026-10-04T15:59:59Z'))).toBe('2026-10-04');
    expect(localDay(Date.parse('2026-10-04T16:00:00Z'))).toBe('2026-10-05');
    expect(weekStart('2026-10-04')).toBe('2026-09-28');
    expect(weekStart('2026-10-05')).toBe('2026-10-05');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('resolves optional deadlines including time without date', () => {
    expect(resolveDeadline('', '', today)).toBeNull();
    expect(resolveDeadline(today, '', today)).toBe('2026-10-04T15:59:59.000Z');
    expect(resolveDeadline('', '18:00', today)).toBe('2026-10-04T10:00:00.000Z');
  });
  it('shows scheduled tasks, due tasks and unfinished carryovers only once', () => {
    const scheduled = task();
    const due = task({ assignedDay: '2026-10-08', deadline: resolveDeadline(today, '18:00', today) });
    const carried = task({ assignedDay: '2026-10-02' });
    const future = task({ assignedDay: '2026-10-06' });
    const unscheduled = task({ assignedDay: null });
    expect(tasksForDay([scheduled, due, carried, future, unscheduled], today, today, now)).toEqual([scheduled, due, carried]);
    expect(tasksForDay([carried], '2026-10-05', today, now)).toEqual([]);
  });
  it('supports in progress without rewarding or losing the planned date', () => {
    const value = task();
    const state = setTaskStatus({ ...emptyState(), tasks: [value] }, value.id, 'inprogress');
    expect(state.tasks[0].status).toBe('inprogress');
    expect(state.tasks[0].assignedDay).toBe(today);
    expect(state.coins).toBe(0);
  });
});

describe('task rewards and undo', () => {
  it('awards once after the undo window, even with duplicate clicks and reload', () => {
    const value = task();
    const pending = completeTask({ ...emptyState(), tasks: [value] }, value.id, now);
    expect(pending.coins).toBe(0);
    expect(completeTask(pending, value.id, now + 500)).toEqual(pending);
    expect(settleRewards(pending, now + UNDO_MS - 1)).toBe(pending);
    const recovered = appStateSchema.parse(JSON.parse(JSON.stringify(pending)));
    const finalized = settleRewards(recovered, now + UNDO_MS);
    expect(finalized.coins).toBe(10);
    expect(settleRewards(finalized, now + UNDO_MS * 2)).toBe(finalized);
  });
  it('restores the previous in-progress status without coins on undo', () => {
    const value = task({ status: 'inprogress' });
    const initial = { ...emptyState(), tasks: [value] };
    expect(undoTask(completeTask(initial, value.id, now), value.id, now + 1000)).toEqual(initial);
  });
  it('locks undo at expiry and preserves the completion reward when finalized later', () => {
    const value = task();
    const pending = completeTask({ ...emptyState(), tasks: [value] }, value.id, now);
    expect(undoTask(pending, value.id, now + UNDO_MS)).toEqual(pending);
    expect(settleRewards(pending, now + UNDO_MS).coins).toBe(10);
  });
  it('adds five coins through the exact deadline and leaves late base rewards intact', () => {
    const value = task({ deadline: new Date(now).toISOString() });
    const initial = { ...emptyState(), tasks: [value] };
    expect(completeTask(initial, value.id, now).tasks[0].reward).toBe(15);
    expect(completeTask(initial, value.id, now + 1).tasks[0].reward).toBe(10);
  });
});

describe('daily bonus', () => {
  it('requires actual completion today, not an empty list or pending reward', () => {
    expect(dailyBonusAvailable(emptyState(), now)).toBe(false);
    const value = task();
    const pending = completeTask({ ...emptyState(), tasks: [value] }, value.id, now);
    expect(dailyBonusAvailable(pending, now)).toBe(false);
    const settled = settleRewards(pending, now + UNDO_MS);
    expect(dailyBonusAvailable(settled, now + UNDO_MS)).toBe(true);
    expect(claimBonus(settled, now + UNDO_MS).coins).toBe(20);
  });
  it('does not let future tasks block a bonus, and cannot be farmed with later additions', () => {
    const value = task();
    const future = task({ assignedDay: '2026-10-08' });
    const settled = settleRewards(completeTask({ ...emptyState(), tasks: [value, future] }, value.id, now), now + UNDO_MS);
    const claimed = claimBonus(settled, now + UNDO_MS);
    expect(claimed.coins).toBe(20);
    const second = task();
    const later = settleRewards(completeTask({ ...claimed, tasks: [...claimed.tasks, second] }, second.id, now + UNDO_MS), now + UNDO_MS * 2);
    expect(later.coins).toBe(30);
    expect(claimBonus(later, now + UNDO_MS * 2)).toBe(later);
    expect(later.bonusDays).toEqual([today]);
  });
  it('blocks the bonus while an overdue task is unfinished', () => {
    const done = task({ status: 'done', completedAt: now, reward: 10 });
    const overdue = task({ assignedDay: null, deadline: resolveDeadline('2026-10-03', '', today) });
    expect(dailyBonusAvailable({ ...emptyState(), tasks: [done, overdue] }, now)).toBe(false);
  });
});

describe('purchases, placement and backups', () => {
  it('guards against overspending, duplicate purchases and spending pending coins', () => {
    expect(buyItem(emptyState(), 'bed').coins).toBe(0);
    const pendingTask = completeTask({ ...emptyState(), tasks: [task()], coins: 100 }, 'missing', now);
    const bed = buyItem(pendingTask, 'bed');
    expect(bed.coins).toBe(80);
    expect(buyItem(bed, 'bed')).toBe(bed);
    const value = task();
    const pending = completeTask({ ...emptyState(), coins: 100, tasks: [value] }, value.id, now);
    expect(buyItem(pending, 'bed')).toBe(pending);
  });
  it('reserves the dog and house, prevents overlap, and preserves stored ownership', () => {
    let state = { ...emptyState(), coins: 200 };
    state = buyItem(buyItem(buyItem(state, 'bed'), 'plant'), 'picture');
    expect(placeItem(state, 'bed', { column: 3, row: 1 })).toBe(state);
    state = placeItem(state, 'bed', { column: 6, row: 2 });
    expect(placeItem(state, 'plant', { column: 6, row: 2 })).toBe(state);
    expect(placeItem(state, 'picture', { column: 6, row: 2 })).toBe(state);
    state = placeItem(state, 'picture', { column: 1, row: 0 });
    state = placeItem(state, 'bed', null);
    expect(state.owned).toContain('bed');
    expect(state.placements.bed).toBeUndefined();
    expect(appStateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
  it('rejects malformed, inconsistent or overlapping imported data', () => {
    expect(() => appStateSchema.parse({ ...emptyState(), coins: -1 })).toThrow();
    expect(() => appStateSchema.parse({ ...emptyState(), tasks: [task({ assignedDay: '2026-02-30' })] })).toThrow();
    expect(() => appStateSchema.parse({ ...emptyState(), tasks: [task({ status: 'done' })] })).toThrow();
    expect(() => appStateSchema.parse({ ...emptyState(), owned: ['bed', 'plant'], placements: { bed: { column: 6, row: 2 }, plant: { column: 6, row: 2 } } })).toThrow();
  });
});
