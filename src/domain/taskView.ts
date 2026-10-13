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
  return tasks.filter(task => task.status !== 'done').sort((a, b) => compareTaskDays(plannedDay(a), plannedDay(b)) || compareTaskStatus(a, b));
}
export function completedTasks(tasks: Task[], now: number, recent: boolean): Task[] {
  const today = localDay(now), first = addDays(today, -29);
  return tasks.filter(task => {
    if (task.status !== 'done') return false;
    const day = localDay(task.completedAt!);
    return !recent || (day >= first && day <= today);
  }).sort((a, b) => b.completedAt! - a.completedAt! || a.id.localeCompare(b.id));
}

function statusOrder(task: Task): number { return task.status === 'todo' ? 0 : task.status === 'inprogress' ? 1 : 2; }
function compareTaskStatus(a: Task, b: Task): number {
  return statusOrder(a) - statusOrder(b)
    || (a.status === 'done' && b.status === 'done' ? b.completedAt! - a.completedAt! : a.createdAt - b.createdAt)
    || a.id.localeCompare(b.id);
}
export function sortTasksByStatus(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(compareTaskStatus);
}
export function groupedTaskDay(task: Task): string | null {
  return task.status === 'done' ? localDay(task.completedAt!) : plannedDay(task);
}
function compareTaskDays(a: string | null, b: string | null): number {
  if (a === null) return b === null ? 0 : -1;
  if (b === null) return 1;
  return b.localeCompare(a);
}
export function taskGroups(tasks: Task[]): { day: string | null; tasks: Task[] }[] {
  const groups = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const day = groupedTaskDay(task);
    const group = groups.get(day) ?? [];
    group.push(task);
    groups.set(day, group);
  }
  return [...groups.entries()].sort(([a], [b]) => compareTaskDays(a, b)).map(([day, tasks]) => ({
    day, tasks: sortTasksByStatus(tasks),
  }));
}
