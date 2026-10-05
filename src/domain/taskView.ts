import { addDays, localDay } from './dates';
import type { Task } from './state';

export type TaskScope = { kind: 'general' } | { kind: 'all' } | { kind: 'category'; id: string };
export function plannedDay(task: Task): string | null { return task.assignedDay ?? (task.deadline ? localDay(Date.parse(task.deadline)) : null); }
export function scopedTasks(tasks: Task[], scope: TaskScope, search: string): Task[] {
  const query = search.trim().toLowerCase();
  return tasks.filter(task => {
    const included = scope.kind === 'all' || (scope.kind === 'general' ? !task.assignedDay && !task.deadline : task.category === scope.id);
    return included && (!query || `${task.title} ${task.note}`.toLowerCase().includes(query));
  });
}
export function unfinishedTasks(tasks: Task[]): Task[] {
  return tasks.filter(task => task.status !== 'done').sort((a, b) => (plannedDay(a) ?? '').localeCompare(plannedDay(b) ?? '') || a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
export function completedTasks(tasks: Task[], now: number, recent: boolean): Task[] {
  const today = localDay(now), first = addDays(today, -29);
  return tasks.filter(task => {
    if (task.status !== 'done') return false;
    const day = localDay(task.completedAt!);
    return !recent || (day >= first && day <= today);
  }).sort((a, b) => b.completedAt! - a.completedAt! || a.id.localeCompare(b.id));
}
