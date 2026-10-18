import { expect, it } from 'vitest';
import {
  advancePets,
  fittedPetGap,
  initialPets,
  petObstacle,
} from './petMotion';
import { decorationObstacles, safePosition, type Point } from './meadow';

const active = ['dog', 'cat', 'bunny'] as const;
const decorations = decorationObstacles({
  bed: { column: 3, row: 2 },
  lamp: { column: 6, row: 1 },
});

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

it.each([90, 130, 220])(
  'keeps three pets roaming around decorations with requested spacing %i',
  (requestedGap) => {
    const gap = fittedPetGap(active.length, decorations, requestedGap);
    let pets = initialPets([...active], decorations, gap);
    expect(
      new Set(active.map((id) => JSON.stringify(pets[id]!.position))).size,
    ).toBe(3);

    for (let window = 0; window < 4; window++) {
      const travelled = Object.fromEntries(
        active.map((id) => [id, 0]),
      ) as Record<(typeof active)[number], number>;
      for (let tick = 0; tick < 300; tick++) {
        const before = pets;
        pets = advancePets(pets, [...active], 100, false, decorations, gap);
        for (const id of active) {
          travelled[id] += distance(before[id]!.position, pets[id]!.position);
          const others = active
            .filter((other) => other !== id)
            .map((other) => petObstacle(pets[other]!, gap));
          expect(
            safePosition(pets[id]!.position, [...decorations, ...others]),
          ).toBe(true);
        }
      }
      for (const id of active) expect(travelled[id]).toBeGreaterThan(20);
    }
  },
);

it('does not stack pets when every route is blocked', () => {
  const blocked = [{ left: 300, right: 800, top: 0, bottom: 430 }];
  const pets = initialPets([...active], blocked, 130);
  expect(
    new Set(active.map((id) => JSON.stringify(pets[id]!.position))).size,
  ).toBe(3);
  const next = advancePets(pets, [...active], 4000, false, blocked, 90);
  for (const id of active) expect(next[id]!.moving).toBe(false);
});
