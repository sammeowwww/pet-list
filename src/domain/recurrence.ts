import { addDays, localDay, resolveDeadline } from './dates';
import { nextRepeatDay, type Series } from './repeat';
import { createTask, type AppState, type Task, type TaskInput } from './state';

export function taskFingerprint(task: Task): string {
  return JSON.stringify([
    task.title,
    task.note,
    task.category,
    task.assignedDay,
    task.deadline,
    task.repeat,
    task.seriesId,
  ]);
}
function deadlineTime(deadline: string | null): string | null {
  if (!deadline) return null;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(Date.parse(deadline));
}
function seriesFromInput(id: string, input: TaskInput): Series {
  return {
    id,
    active: true,
    title: input.title,
    note: input.note,
    category: input.category,
    rule: input.repeat!,
    deadlineTime: deadlineTime(input.deadline),
  };
}
function occurrence(
  series: Series,
  day: string,
  now: number,
  parent: string | null,
): Task {
  const task = {
    ...createTask(
      {
        title: series.title,
        note: series.note,
        category: series.category,
        assignedDay: day,
        deadline: series.deadlineTime
          ? resolveDeadline(day, series.deadlineTime, day)
          : null,
        repeat: series.rule,
      },
      now,
    ),
    id: `${series.id}:${day}`,
    seriesId: series.id,
    generatedFrom: parent,
  };
  return { ...task, generatedBaseline: taskFingerprint(task) };
}
export function addPlannerTask(
  state: AppState,
  taskId: string,
  input: TaskInput,
  now: number,
): AppState {
  if (
    state.tasks.some((task) => task.id === taskId || task.seriesId === taskId)
  )
    return state;
  if (!input.repeat)
    return {
      ...state,
      tasks: [...state.tasks, { ...createTask(input, now), id: taskId }],
    };
  if (!input.assignedDay) throw new Error('Repeating tasks need a start date.');
  const series = seriesFromInput(taskId, input);
  const first = occurrence(
    series,
    nextRepeatDay(input.assignedDay, series.rule),
    now,
    null,
  );
  return {
    ...state,
    series: [...state.series, series],
    tasks: [...state.tasks, first],
  };
}
export function advanceRecurring(state: AppState, now: number): AppState {
  let tasks = state.tasks;
  for (const series of state.series) {
    if (!series.active) continue;
    const linked = tasks.filter((task) => task.seriesId === series.id);
    if (linked.some((task) => task.status !== 'done' || task.pending)) continue;
    const last = [...linked].sort(
      (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0),
    )[0];
    if (!last?.completedAt) continue;
    const day = nextRepeatDay(
      addDays(localDay(last.completedAt), 1),
      series.rule,
    );
    const id = `${series.id}:${day}`;
    if (!tasks.some((task) => task.id === id))
      tasks = [...tasks, occurrence(series, day, now, last.id)];
  }
  return tasks === state.tasks ? state : { ...state, tasks };
}
export function stopSeries(state: AppState, seriesId: string): AppState {
  return {
    ...state,
    series: state.series.map((series) =>
      series.id === seriesId ? { ...series, active: false } : series,
    ),
    tasks: state.tasks.map((task) =>
      task.seriesId === seriesId && task.status !== 'done'
        ? {
            ...task,
            seriesId: null,
            repeat: null,
            generatedFrom: null,
            generatedBaseline: null,
          }
        : task,
    ),
  };
}
export function editPlannerTask(
  state: AppState,
  taskId: string,
  input: TaskInput,
): AppState {
  const task = state.tasks.find((task) => task.id === taskId)!;
  if (task.seriesId && !input.repeat) state = stopSeries(state, task.seriesId);
  const seriesId = input.repeat ? (task.seriesId ?? task.id) : null;
  const series = seriesId ? seriesFromInput(seriesId, input) : null;
  if (series && !input.assignedDay)
    throw new Error('Repeating tasks need a start date.');
  const assignedDay = series
    ? nextRepeatDay(input.assignedDay!, series.rule)
    : input.assignedDay;
  const updated = {
    ...task,
    ...input,
    repeat: input.repeat ?? null,
    seriesId,
    assignedDay,
    occurrenceTouched: true,
    generatedFrom: seriesId ? task.generatedFrom : null,
    generatedBaseline: seriesId ? task.generatedBaseline : null,
    deadline: series
      ? series.deadlineTime
        ? resolveDeadline(assignedDay!, series.deadlineTime, assignedDay!)
        : null
      : input.deadline,
  };
  return {
    ...state,
    series: series
      ? [...state.series.filter((value) => value.id !== series.id), series]
      : state.series,
    tasks: state.tasks.map((value) => (value.id === taskId ? updated : value)),
  };
}
export function removeUntouchedSuccessor(
  state: AppState,
  task: Task,
): AppState {
  const successor = state.tasks.find(
    (value) =>
      value.generatedFrom === task.id && value.seriesId === task.seriesId,
  );
  if (!task.seriesId || !successor) return state;
  if (
    successor.occurrenceTouched ||
    successor.status !== 'todo' ||
    successor.pending ||
    successor.generatedBaseline !== taskFingerprint(successor)
  ) {
    throw new Error(
      'The next repeating task was changed on another device. Review it before undoing this completion.',
    );
  }
  return {
    ...state,
    tasks: state.tasks.filter((value) => value.id !== successor.id),
  };
}
