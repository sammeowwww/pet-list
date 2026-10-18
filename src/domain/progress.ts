import { addDays, localDay, weekStart } from './dates';
import type { Task } from './state';

export function percentComplete(tasks: Task[]): number {
  return tasks.length
    ? Math.round(
        (tasks.filter((task) => task.status === 'done').length / tasks.length) *
          100,
      )
    : 0;
}

export function completedBetween(
  tasks: Task[],
  start: string,
  end: string,
): Task[] {
  return tasks.filter(
    (task) =>
      task.completedAt !== null &&
      localDay(task.completedAt) >= start &&
      localDay(task.completedAt) < end,
  );
}

export function historyDay(task: Task): string {
  if (task.completedAt !== null) return localDay(task.completedAt);
  return (
    task.assignedDay ??
    (task.deadline
      ? localDay(Date.parse(task.deadline))
      : localDay(task.createdAt))
  );
}

export function historyBetween(
  tasks: Task[],
  start: string,
  end: string,
): Task[] {
  return tasks.filter(
    (task) => historyDay(task) >= start && historyDay(task) < end,
  );
}

export function weekTasks(tasks: Task[], day: string): Task[] {
  const start = weekStart(day);
  const end = addDays(start, 7);
  return tasks.filter((task) => {
    const planned =
      task.assignedDay !== null &&
      task.assignedDay >= start &&
      task.assignedDay < end;
    const due =
      task.deadline !== null &&
      localDay(Date.parse(task.deadline)) >= start &&
      localDay(Date.parse(task.deadline)) < end;
    const completed =
      task.completedAt !== null &&
      localDay(task.completedAt) >= start &&
      localDay(task.completedAt) < end;
    return planned || due || completed;
  });
}

export function completionStreak(tasks: Task[], today: string): number {
  const days = new Set(
    tasks
      .filter((task) => task.status === 'done' && !task.pending)
      .map((task) => localDay(task.completedAt!)),
  );
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}
