import { addDays, calendarDate, localDay, weekStart } from './dates';
import type { Task } from './state';
import { sortTasksByStatus } from './taskView';

export function monthLabel(day: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  }).format(calendarDate(day));
}

export function monthDays(day: string): string[] {
  const first = `${day.slice(0, 7)}-01`;
  const next = moveMonth(first, 1);
  const last = addDays(next, -1);
  const start = weekStart(first);
  const end = addDays(weekStart(last), 6);
  const count = Math.round(
    (calendarDate(end).getTime() - calendarDate(start).getTime()) / 86_400_000,
  );
  return Array.from({ length: count + 1 }, (_, index) => addDays(start, index));
}

export function moveMonth(day: string, offset: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDate = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return [
    first.getUTCFullYear(),
    String(first.getUTCMonth() + 1).padStart(2, '0'),
    String(Math.min(date, lastDate)).padStart(2, '0'),
  ].join('-');
}

export function calendarTaskDay(task: Task): string | null {
  if (!task.assignedDay && !task.deadline) return null;
  if (task.status === 'done') {
    return task.completedAt === null ? null : localDay(task.completedAt);
  }
  return task.deadline ? localDay(Date.parse(task.deadline)) : task.assignedDay;
}

export function calendarTasksByDay(
  tasks: readonly Task[],
): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const day = calendarTaskDay(task);
    if (!day) continue;
    const group = groups.get(day) ?? [];
    group.push(task);
    groups.set(day, group);
  }
  for (const [day, group] of groups) {
    groups.set(day, sortTasksByStatus(group));
  }
  return groups;
}

export function overdueCalendarTasks(
  tasks: readonly Task[],
  today: string,
): Task[] {
  return sortTasksByStatus(
    tasks.filter((task) => {
      const day = calendarTaskDay(task);
      return task.status !== 'done' && day !== null && day < today;
    }),
  );
}
