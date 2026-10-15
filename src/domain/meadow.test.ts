import { describe, expect, it } from 'vitest';
import { advanceWalk, avoidNewDecorations, CELEBRATION_SPEED, decorationObstacles, initialWalk, NORMAL_SPEED, planRoute, safePosition, safeSegment } from './meadow';
import { activeCelebration, addCelebration, cancelCelebration } from './celebration';
import { appStateSchema, emptyState } from './state';
import { completionStreak, completedBetween, historyBetween, historyDay, percentComplete } from './progress';
import { createTask } from './state';

describe('meadow routing', () => {
  it('plans entirely within the field and avoids decoration bounds', () => {
    const obstacles = decorationObstacles({ plant: { column: 6, row: 2 }, bed: { column: 5, row: 1 } });
    const start = initialWalk().position;
    for (let turn = 0; turn < 12; turn++) {
      const route = planRoute(start, obstacles, turn);
      expect(route.length).toBeGreaterThan(1);
      let previous = start;
      for (const point of route) {
        expect(safePosition(point, obstacles)).toBe(true);
        expect(safeSegment(previous, point, obstacles)).toBe(true);
        previous = point;
      }
    }
  });
  it('pauses instead of walking when the entire available field is blocked', () => {
    const obstacles = [{ left: 300, right: 800, top: 250, bottom: 450 }];
    expect(planRoute(initialWalk().position, obstacles, 0)).toEqual([]);
    expect(advanceWalk(initialWalk(), 100, false, obstacles).moving).toBe(false);
  });
  it('finds a clear resting spot after a decoration occupies a pet’s paws', () => {
    const obstacles = decorationObstacles({ bed: { column: 3, row: 2 } });
    const occupied = { ...initialWalk(), position: { x: 430, y: 390 } };
    expect(safePosition(occupied.position, obstacles)).toBe(false);
    const resting = avoidNewDecorations(occupied, obstacles);
    expect(safePosition(resting.position, obstacles)).toBe(true);
    expect(resting.moving).toBe(false);
  });
  it('moves faster during celebration and takes shorter rests', () => {
    const state = { ...initialWalk(), pauseMs: 0, route: [{ x: 600, y: 350 }] };
    const normal = advanceWalk(state, 100, false, []);
    const excited = advanceWalk(state, 100, true, []);
    expect(normal.position.x).toBeCloseTo(state.position.x + NORMAL_SPEED / 10);
    expect(excited.position.x).toBeCloseTo(state.position.x + CELEBRATION_SPEED / 10);
    expect(advanceWalk(initialWalk(), 100, true, []).pauseMs).toBe(100);
    expect(advanceWalk(initialWalk(), 100, false, []).pauseMs).toBe(1900);
  });
});

describe('temporary celebrations', () => {
  it('lasts exactly ten seconds and never changes persisted rewards', () => {
    const events = addCelebration([], 'one', 1000);
    expect(activeCelebration(events, 10999)?.taskId).toBe('one');
    expect(activeCelebration(events, 11000)).toBeNull();
  });
  it('extends to the latest completion and undo removes only its contribution', () => {
    const events = addCelebration(addCelebration([], 'one', 1000), 'two', 5000);
    expect(activeCelebration(events, 12000)?.taskId).toBe('two');
    const undone = cancelCelebration(events, 'two');
    expect(activeCelebration(undone, 9000)?.taskId).toBe('one');
    expect(activeCelebration(undone, 11000)).toBeNull();
    expect(activeCelebration(cancelCelebration(undone, 'one'), 6000)).toBeNull();
  });
});

describe('compatibility and real progress', () => {
  const now = Date.parse('2026-10-05T10:00:00+08:00');
  const base = createTask({ title: 'Legacy task', note: '', category: 'Wellbeing', effort: 'small', assignedDay: '2026-10-04', deadline: null }, now);
  it('keeps old category values, purchases, placement, balance, and backup version', () => {
    const old = { ...emptyState(), tasks: [base], coins: 95, owned: ['bed'], placements: { bed: { column: 6, row: 2 } } };
    expect(appStateSchema.parse(JSON.parse(JSON.stringify(old)))).toEqual(old);
    for (const category of ['Health', 'Errand', 'Home']) expect(appStateSchema.safeParse({ ...old, tasks: [{ ...base, category }] }).success).toBe(true);
  });
  it('derives history from completion dates and streaks from finalized completions', () => {
    const sunday = { ...base, status: 'done' as const, completedAt: Date.parse('2026-10-04T10:00:00+08:00'), reward: 5 };
    const saturday = { ...sunday, id: 'saturday', completedAt: Date.parse('2026-10-03T10:00:00+08:00') };
    expect(completionStreak([sunday, saturday], '2026-10-05')).toBe(2);
    expect(completedBetween([sunday, saturday], '2026-09-28', '2026-10-05')).toHaveLength(2);
    expect(completedBetween([sunday, saturday], '2026-10-05', '2026-10-12')).toHaveLength(0);
    expect(percentComplete([])).toBe(0);
  });
  it('includes unfinished history using planned days, deadlines, then creation dates', () => {
    const unscheduled = { ...base, assignedDay: null };
    const due = { ...unscheduled, deadline: '2026-10-06T10:00:00.000Z', status: 'inprogress' as const };
    expect(historyDay(base)).toBe('2026-10-04');
    expect(historyDay(unscheduled)).toBe('2026-10-05');
    expect(historyDay(due)).toBe('2026-10-06');
    expect(historyBetween([base, unscheduled, due], '2026-10-05', '2026-10-12')).toEqual([unscheduled, due]);
  });
});
