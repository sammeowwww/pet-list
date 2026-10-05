import { addDays, localDay, resolveDeadline, weekStart, calendarDate } from './dates';
import { createTask, emptyState, type AppState, type Task } from './state';

export function exampleState(now: number): AppState {
  const today = localDay(now);
  const monday = weekStart(today);
  const task = (title: string, day: string | null, category: Task['category'], effort: Task['effort'] = 'small') => createTask({ title, assignedDay: day, category, effort, deadline: null, note: '' }, now);
  const draft = task('Make a little progress on the project', today, 'Work', 'large');
  const walk = task('Take a walk, without your phone', today, 'Wellbeing');
  const plan = task('Plan something lovely for the weekend', today, 'Personal', 'medium');
  const previous = task('Clear a little space on the desk', addDays(monday, -3), 'Personal');
  const completedAt = calendarDate(addDays(monday, -3)).getTime();
  return {
    ...emptyState(), tasks: [
      { ...draft, status: 'inprogress', note: 'One focused session is enough for today.' },
      walk, { ...plan, deadline: resolveDeadline(today, '', today) },
      task('Pick up a few groceries', addDays(today, 1), 'Personal'),
      task('Read a chapter of your book', addDays(today, 2), 'Wellbeing'),
      task('Write down ideas for the next project', null, 'Work'),
      { ...previous, status: 'done', completedAt, reward: 5 },
    ], coins: 5,
  };
}
