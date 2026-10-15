import { advanceWalk, initialWalk, safePosition, type Point, type Rectangle, type WalkState } from './meadow';
import type { PetId } from './state';

export function petObstacle(walk: WalkState, gap = 90): Rectangle {
  const halfWidth = Math.max(40, gap - 50);
  return { left: walk.position.x - halfWidth, right: walk.position.x + halfWidth, top: walk.position.y - 85, bottom: walk.position.y + 3 };
}
export function initialPets(active: PetId[], decorations: Rectangle[], gap = 90): Partial<Record<PetId, WalkState>> {
  const pets: Partial<Record<PetId, WalkState>> = {};
  const positions = rosterPositions(active.length, decorations, gap);
  active.forEach((pet, index) => { pets[pet] = { ...initialWalk(), position: positions[index] ?? initialWalk().position, turns: index * 7, pauseMs: 1500 + index * 700 }; });
  return pets;
}

function rosterPositions(count: number, decorations: Rectangle[], gap: number): Point[] {
  const candidates: Point[] = [];
  for (let x = 360; x <= 740; x += 20) for (let y = 340; y <= 390; y += 10) {
    if (safePosition({ x, y }, decorations)) candidates.push({ x, y });
  }
  function search(placed: Point[]): Point[] | null {
    if (placed.length === count) return placed;
    const preferred = count === 1 ? initialWalk().position : { x: 400 + placed.length * 150, y: 350 };
    const others = placed.map(position => petObstacle({ ...initialWalk(), position }, gap));
    const ordered = [...candidates].sort((a, b) => Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y));
    for (const position of ordered) {
      if (!safePosition(position, others)) continue;
      const result = search([...placed, position]);
      if (result) return result;
    }
    return null;
  }
  return search([]) ?? [];
}

export function advancePets(pets: Partial<Record<PetId, WalkState>>, active: PetId[], elapsed: number, celebrating: boolean, decorations: Rectangle[], gap = 90) {
  const next = { ...pets };
  for (const pet of active) {
    const other = active.filter(id => id !== pet && next[id]).map(id => petObstacle(next[id]!, gap));
    next[pet] = advanceWalk(next[pet]!, elapsed, celebrating, [...decorations, ...other]);
  }
  return next;
}
