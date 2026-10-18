import { expect, it } from 'vitest';
import { appStateSchema, createTask, emptyState, settleRewards } from './state';
import { buyPet, feedPet, isHungry, setPetActive } from './pets';
import {
  applyCommand,
  taskFields,
  type Command,
  type PlannerAction,
} from './commands';
import { advancePets, initialPets, petObstacle } from './petMotion';
import { decorationObstacles, safePosition } from './meadow';

const now = Date.parse('2026-10-05T10:00:00+08:00');
const command = (action: PlannerAction, at = now): Command => ({
  id: crypto.randomUUID(),
  at,
  order: at,
  action,
});
it('feeds with zero coins, rewards once, and hunger persists through missed days and reloads', () => {
  const fed = feedPet(emptyState(), 'dog', now);
  expect(fed.coins).toBe(3);
  expect(feedPet(fed, 'dog', now)).toBe(fed);
  expect(isHungry(appStateSchema.parse(fed), 'dog', now)).toBe(false);
  expect(isHungry(fed, 'dog', Date.parse('2026-10-05T16:00:00Z'))).toBe(true);
  const later = now + 7 * 86_400_000;
  expect(isHungry(appStateSchema.parse(fed), 'dog', later)).toBe(true);
  expect(feedPet(fed, 'dog', later).coins).toBe(6);
});
it('limits active pets and daily gifts to three despite swaps', () => {
  let state = { ...emptyState(), coins: 200 };
  for (const pet of ['cat', 'bunny', 'hamster'] as const)
    state = buyPet(state, pet);
  expect(state.pets.active).toHaveLength(3);
  expect(setPetActive(state, 'hamster', true)).toBe(state);
  for (const pet of ['dog', 'cat', 'bunny'] as const)
    state = feedPet(state, pet, now);
  expect(state.coins).toBe(29);
  state = setPetActive(setPetActive(state, 'dog', false), 'hamster', true);
  const fed = feedPet(state, 'hamster', now);
  expect(fed.coins).toBe(29);
  expect(isHungry(fed, 'hamster', now)).toBe(false);
});
it('migrates old backups without altering historical rewards or purchases', () => {
  const task = {
    ...createTask({
      title: 'Past',
      note: '',
      category: 'Personal',
      assignedDay: null,
      deadline: null,
    }),
    status: 'done',
    completedAt: now,
    reward: 15,
    effort: 'large',
  };
  const migrated = appStateSchema.parse({
    version: 1,
    tasks: [task],
    coins: 50,
    owned: ['bed'],
    placements: {},
    bonusDays: [],
  });
  expect(migrated.version).toBe(4);
  expect(migrated.coins).toBe(50);
  expect(migrated.tasks[0].reward).toBe(15);
  expect(migrated.owned).toEqual(['bed']);
  expect(migrated.pets.active).toEqual(['dog']);
});
it('merges independent fields and rejects conflicting task edits', () => {
  const task = createTask(
    {
      title: 'Original',
      note: '',
      category: 'Personal',
      assignedDay: null,
      deadline: null,
    },
    now,
  );
  const before = taskFields(task);
  const state = { ...emptyState(), tasks: [task] };
  const renamed = applyCommand(
    state,
    command({
      kind: 'edit',
      taskId: task.id,
      before,
      input: { ...before, title: 'Laptop edit' },
    }),
    now,
  );
  const merged = applyCommand(
    renamed,
    command({
      kind: 'edit',
      taskId: task.id,
      before,
      input: { ...before, note: 'Phone note' },
    }),
    now,
  );
  expect(merged.tasks[0].title).toBe('Laptop edit');
  expect(merged.tasks[0].note).toBe('Phone note');
  expect(() =>
    applyCommand(
      renamed,
      command({
        kind: 'edit',
        taskId: task.id,
        before,
        input: { ...before, title: 'Phone edit' },
      }),
      now,
    ),
  ).toThrow(/Another device/);
});
it('does not double-pay completions and honors offline undo within the original window', () => {
  const task = createTask(
    {
      title: 'Draft',
      note: '',
      category: 'Personal',
      assignedDay: null,
      deadline: null,
    },
    now,
  );
  const completion = command({ kind: 'complete', taskId: task.id });
  const done = applyCommand(
    { ...emptyState(), tasks: [task] },
    completion,
    now,
  );
  const settled = settleRewards(done, now + 20_000);
  expect(
    applyCommand(
      settled,
      command({ kind: 'complete', taskId: task.id }),
      now + 20_000,
    ),
  ).toBe(settled);
  const undo = command(
    { kind: 'undo', taskId: task.id, completionId: completion.id },
    now + 1000,
  );
  const undone = applyCommand(settled, undo, now + 20_000);
  expect(undone.coins).toBe(0);
  expect(undone.tasks[0].status).toBe('todo');
  expect(() =>
    applyCommand(settled, { ...undo, at: now + 10_000 }, now + 20_000),
  ).toThrow(/no longer/);
});
it('keeps three moving pets inside the safe field and clear of each other and decorations', () => {
  const active = ['dog', 'cat', 'bunny'] as const;
  const obstacles = decorationObstacles({ bed: { column: 6, row: 2 } });
  let pets = initialPets([...active], obstacles);
  const movedNormally = new Set<string>();
  let normalStart = pets;
  for (let tick = 0; tick < 600; tick++) {
    if (tick === 100) normalStart = pets;
    pets = advancePets(pets, [...active], 100, tick < 100, obstacles);
    for (const id of active) {
      const others = active
        .filter((other) => other !== id)
        .map((other) => petObstacle(pets[other]!));
      expect(safePosition(pets[id]!.position, [...obstacles, ...others])).toBe(
        true,
      );
      if (
        tick >= 100 &&
        Math.hypot(
          pets[id]!.position.x - normalStart[id]!.position.x,
          pets[id]!.position.y - normalStart[id]!.position.y,
        ) > 2
      )
        movedNormally.add(id);
    }
  }
  expect(movedNormally).toEqual(new Set(active));
});
it('retains the original feeding day when an offline action reconnects after midnight', () => {
  const action = command({ kind: 'feed', pet: 'dog' });
  const nextDay = now + 86_400_000;
  const fed = applyCommand(emptyState(), action, nextDay);
  expect(fed.pets.fedDays.dog).toBe('2026-10-05');
  expect(isHungry(fed, 'dog', nextDay)).toBe(true);
  const todayFed = feedPet(fed, 'dog', nextDay);
  expect(feedPet(todayFed, 'dog', now)).toBe(todayFed);
});
