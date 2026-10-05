import type { AppState, Placement } from './state';

export type Point = { x: number; y: number };
export type WalkState = { position: Point; route: Point[]; pauseMs: number; facing: 'left' | 'right'; turns: number; moving: boolean };
export type Rectangle = { left: number; right: number; top: number; bottom: number };
export const NORMAL_SPEED = 19;
export const CELEBRATION_SPEED = 53;
export const START_POSITION: Point = { x: 480, y: 350 };
const X_STEP = 20;
const Y_STEP = 10;

export function itemPosition(cell: Placement): Point {
  return { x: (8 + (cell.column + .5) * 10.5) * 9.6, y: (57 + (cell.row + .5) * 12.66) * 4.3 };
}

export function decorationObstacles(placements: AppState['placements']): Rectangle[] {
  return Object.entries(placements).flatMap(([id, cell]) => {
    if (!cell || id === 'picture') return [];
    const position = itemPosition(cell);
    return [{ left: position.x - 33, right: position.x + 33, top: position.y - 40, bottom: position.y + 26 }];
  });
}

export function safePosition(point: Point, obstacles: Rectangle[]): boolean {
  if (point.x < 360 || point.x > 740 || point.y < 340 || point.y > 390) return false;
  const dog = { left: point.x - 50, right: point.x + 50, top: point.y - 96, bottom: point.y + 3 };
  return obstacles.every(item => dog.right < item.left || dog.left > item.right || dog.bottom < item.top || dog.top > item.bottom);
}

export function safeSegment(from: Point, to: Point, obstacles: Rectangle[]): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 5));
  for (let index = 0; index <= steps; index++) {
    const fraction = index / steps;
    if (!safePosition({ x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction }, obstacles)) return false;
  }
  return true;
}

function key(point: Point): string { return `${point.x}:${point.y}`; }
function neighbours(point: Point): Point[] {
  return [{ x: point.x + X_STEP, y: point.y }, { x: point.x - X_STEP, y: point.y },
    { x: point.x, y: point.y + Y_STEP }, { x: point.x, y: point.y - Y_STEP }];
}

export function planRoute(position: Point, obstacles: Rectangle[], turn: number): Point[] {
  const origin = { x: Math.round(position.x / X_STEP) * X_STEP, y: Math.round(position.y / Y_STEP) * Y_STEP };
  if (!safeSegment(position, origin, obstacles)) return [];
  const queue = [origin];
  const parents = new Map<string, Point | null>([[key(origin), null]]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const neighbour of neighbours(queue[cursor])) {
      if (parents.has(key(neighbour)) || !safeSegment(queue[cursor], neighbour, obstacles)) continue;
      parents.set(key(neighbour), queue[cursor]);
      queue.push(neighbour);
    }
  }
  const minimumDistance = obstacles.length >= 2 ? 20 : 70;
  const candidates = queue.filter(point => Math.hypot(point.x - origin.x, point.y - origin.y) >= minimumDistance);
  if (candidates.length === 0) return [];
  const target = candidates[(turn * 29 + 17) % candidates.length];
  const path: Point[] = [];
  let current: Point | null = target;
  while (current) { path.unshift(current); current = parents.get(key(current)) ?? null; }
  return path;
}

export function initialWalk(): WalkState {
  return { position: START_POSITION, route: [], pauseMs: 2000, facing: 'left', turns: 0, moving: false };
}

export function avoidNewDecorations(state: WalkState, obstacles: Rectangle[]): WalkState {
  if (safePosition(state.position, obstacles)) return state;
  const candidates: Point[] = [];
  for (let x = 360; x <= 740; x += X_STEP) {
    for (let y = 340; y <= 390; y += Y_STEP) {
      if (safePosition({ x, y }, obstacles)) candidates.push({ x, y });
    }
  }
  candidates.sort((a, b) => Math.hypot(a.x - state.position.x, a.y - state.position.y)
    - Math.hypot(b.x - state.position.x, b.y - state.position.y));
  return { ...state, position: candidates[0] ?? state.position, route: [], pauseMs: 1000, moving: false };
}

export function advanceWalk(state: WalkState, elapsed: number, celebrating: boolean, obstacles: Rectangle[]): WalkState {
  if (!safePosition(state.position, obstacles)) return avoidNewDecorations(state, obstacles);
  if (state.pauseMs > 0) return { ...state, pauseMs: Math.max(0, (celebrating ? Math.min(200, state.pauseMs) : state.pauseMs) - elapsed), moving: false };
  const route = state.route.length ? state.route : planRoute(state.position, obstacles, state.turns);
  if (!route.length) return { ...state, pauseMs: 2000, moving: false };
  const target = route[0];
  if (!safeSegment(state.position, target, obstacles)) return { ...state, route: [], pauseMs: 1000, moving: false };
  const dx = target.x - state.position.x;
  const dy = target.y - state.position.y;
  const distance = Math.hypot(dx, dy);
  const travel = (celebrating ? CELEBRATION_SPEED : NORMAL_SPEED) * elapsed / 1000;
  const facing = Math.abs(dx) > .1 ? (dx > 0 ? 'right' : 'left') : state.facing;
  if (distance <= travel) {
    const remaining = route.slice(1);
    return { ...state, position: target, route: remaining, facing, moving: remaining.length > 0,
      pauseMs: remaining.length ? 0 : celebrating ? 200 : 2400, turns: remaining.length ? state.turns : state.turns + 1 };
  }
  return { ...state, route, position: { x: state.position.x + dx / distance * travel, y: state.position.y + dy / distance * travel }, facing, moving: true };
}
