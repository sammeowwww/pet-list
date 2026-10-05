export const CELEBRATION_MS = 10_000;
export type CelebrationEvent = { taskId: string; startedAt: number; expiresAt: number };

export function addCelebration(events: CelebrationEvent[], taskId: string, now: number): CelebrationEvent[] {
  return [...events.filter(event => event.expiresAt > now && event.taskId !== taskId),
    { taskId, startedAt: now, expiresAt: now + CELEBRATION_MS }];
}

export function cancelCelebration(events: CelebrationEvent[], taskId: string): CelebrationEvent[] {
  return events.filter(event => event.taskId !== taskId);
}

export function activeCelebration(events: CelebrationEvent[], now: number): CelebrationEvent | null {
  return events.filter(event => event.expiresAt > now).sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;
}
