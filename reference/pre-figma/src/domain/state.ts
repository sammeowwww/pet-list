import { z } from 'zod';
import { localDay } from './dates';

export const STORAGE_KEY = 'little-by-little:v1';
export const UNDO_MS = 10_000;
export const DAILY_BONUS = 10;
export const EFFORT_REWARDS = { small: 5, medium: 10, large: 15 } as const;
export type Effort = keyof typeof EFFORT_REWARDS;
export type Status = 'todo' | 'inprogress' | 'done';

export const CATALOG = [
  { id: 'bed', name: 'Cozy bed', price: 20, kind: 'floor', description: 'A soft spot for little naps.' },
  { id: 'rug', name: 'Picnic rug', price: 30, kind: 'floor', description: 'Make yourself at home.' },
  { id: 'plant', name: 'Little plant', price: 40, kind: 'floor', description: 'A little more green.' },
  { id: 'bowl', name: 'Food bowl', price: 50, kind: 'floor', description: 'The most important accessory.' },
  { id: 'lamp', name: 'Garden lantern', price: 60, kind: 'floor', description: 'A warm glow for your garden.' },
  { id: 'picture', name: 'Paw plaque', price: 80, kind: 'wall', description: 'A personal touch for the house.' },
] as const;
export type ItemId = typeof CATALOG[number]['id'];
export type Placement = { column: number; row: number };

const calendarDaySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
const timestampSchema = z.number().finite().nonnegative();
const pendingSchema = z.object({
  previousStatus: z.enum(['todo', 'inprogress']), expiresAt: timestampSchema,
});
const taskSchema = z.object({
  id: z.string().min(1), title: z.string().trim().min(1).max(160),
  note: z.string().max(500), category: z.enum(['Personal', 'Work', 'Wellbeing']),
  effort: z.enum(['small', 'medium', 'large']), status: z.enum(['todo', 'inprogress', 'done']),
  assignedDay: calendarDaySchema.nullable(), deadline: z.string().datetime().nullable(),
  createdAt: timestampSchema, completedAt: timestampSchema.nullable(),
  reward: z.number().int().nonnegative(), pending: pendingSchema.nullable(),
}).superRefine((task, context) => {
  if ((task.status === 'done') !== (task.completedAt !== null)) {
    context.addIssue({ code: 'custom', message: 'Task completion is inconsistent.' });
  }
  if (task.pending && task.status !== 'done') {
    context.addIssue({ code: 'custom', message: 'Only completed tasks can have pending rewards.' });
  }
  if (task.reward !== 0 && task.status !== 'done') {
    context.addIssue({ code: 'custom', message: 'Incomplete tasks cannot have rewards.' });
  }
});

const itemSchema = z.enum(['bed', 'rug', 'plant', 'bowl', 'lamp', 'picture']);
const placementSchema = z.object({ column: z.number().int().min(0).max(7), row: z.number().int().min(0).max(2) });
export const appStateSchema = z.object({
  version: z.literal(1), tasks: z.array(taskSchema).max(10000),
  coins: z.number().int().nonnegative(), bonusDays: z.array(calendarDaySchema),
  owned: z.array(itemSchema), placements: z.partialRecord(itemSchema, placementSchema),
}).superRefine((state, context) => {
  if (new Set(state.tasks.map(task => task.id)).size !== state.tasks.length ||
      new Set(state.owned).size !== state.owned.length ||
      new Set(state.bonusDays).size !== state.bonusDays.length) {
    context.addIssue({ code: 'custom', message: 'Backup contains duplicate records.' });
  }
  const occupied = new Set<string>();
  for (const [id, position] of Object.entries(state.placements)) {
    if (!position) continue;
    const cell = `${position.column}:${position.row}`;
    if (!state.owned.includes(id as ItemId) || occupied.has(cell) || !isValidCell(id as ItemId, position)) {
      context.addIssue({ code: 'custom', message: 'Backup contains invalid furniture placement.' });
    }
    occupied.add(cell);
  }
});
export type Task = z.infer<typeof taskSchema>;
export type AppState = z.infer<typeof appStateSchema>;
export type TaskInput = Pick<Task, 'title' | 'note' | 'category' | 'effort' | 'assignedDay' | 'deadline'>;

export function emptyState(): AppState {
  return { version: 1, tasks: [], coins: 0, bonusDays: [], owned: [], placements: {} };
}

export function createTask(input: TaskInput, now = Date.now()): Task {
  return taskSchema.parse({
    ...input, title: input.title.trim(), id: crypto.randomUUID(), status: 'todo',
    createdAt: now, completedAt: null, reward: 0, pending: null,
  });
}

export function rewardFor(task: Task, now: number): number {
  const onTime = task.deadline !== null && now <= Date.parse(task.deadline);
  return EFFORT_REWARDS[task.effort] + (onTime ? 5 : 0);
}

export function completeTask(state: AppState, id: string, now: number): AppState {
  return { ...state, tasks: state.tasks.map(task => {
    if (task.id !== id || task.status === 'done') return task;
    return {
      ...task, status: 'done', completedAt: now, reward: rewardFor(task, now),
      pending: { previousStatus: task.status, expiresAt: now + UNDO_MS },
    };
  }) };
}

export function undoTask(state: AppState, id: string, now: number): AppState {
  return { ...state, tasks: state.tasks.map(task => {
    if (task.id !== id || !task.pending || now >= task.pending.expiresAt) return task;
    return { ...task, status: task.pending.previousStatus, completedAt: null, reward: 0, pending: null };
  }) };
}

export function settleRewards(state: AppState, now: number): AppState {
  const ready = state.tasks.filter(task => task.pending && now >= task.pending.expiresAt);
  if (ready.length === 0) return state;
  const ids = new Set(ready.map(task => task.id));
  return {
    ...state, coins: state.coins + ready.reduce((sum, task) => sum + task.reward, 0),
    tasks: state.tasks.map(task => ids.has(task.id) ? { ...task, pending: null } : task),
  };
}

export function setTaskStatus(state: AppState, id: string, status: 'todo' | 'inprogress'): AppState {
  return { ...state, tasks: state.tasks.map(task =>
    task.id === id && task.status !== 'done' ? { ...task, status } : task) };
}

export function editTask(state: AppState, id: string, input: TaskInput): AppState {
  return { ...state, tasks: state.tasks.map(task =>
    task.id === id && task.status !== 'done' ? taskSchema.parse({ ...task, ...input }) : task) };
}

export function removeTask(state: AppState, id: string): AppState {
  return { ...state, tasks: state.tasks.filter(task => task.id !== id || task.pending) };
}

export function isOverdue(task: Task, now: number): boolean {
  return task.status !== 'done' && task.deadline !== null && Date.parse(task.deadline) < now;
}

export function tasksForDay(tasks: Task[], day: string, today: string, now: number): Task[] {
  return tasks.filter(task => {
    const assigned = task.assignedDay === day;
    const due = task.deadline !== null && localDay(Date.parse(task.deadline)) === day;
    const completed = task.completedAt !== null && localDay(task.completedAt) === day;
    const carried = day === today && task.status !== 'done' &&
      ((task.assignedDay !== null && task.assignedDay < today) || isOverdue(task, now));
    return assigned || due || completed || carried;
  });
}

export function dailyBonusAvailable(state: AppState, now: number): boolean {
  const today = localDay(now);
  if (state.bonusDays.includes(today) || state.tasks.some(task => task.pending)) return false;
  const tasks = tasksForDay(state.tasks, today, today, now);
  return tasks.length > 0 && tasks.every(task => task.status === 'done') &&
    tasks.some(task => task.completedAt !== null && localDay(task.completedAt) === today);
}

export function claimBonus(state: AppState, now: number): AppState {
  if (!dailyBonusAvailable(state, now)) return state;
  return { ...state, coins: state.coins + DAILY_BONUS, bonusDays: [...state.bonusDays, localDay(now)] };
}

export function buyItem(state: AppState, id: ItemId): AppState {
  const item = CATALOG.find(item => item.id === id)!;
  if (state.owned.includes(id) || state.coins < item.price || state.tasks.some(task => task.pending)) return state;
  return { ...state, coins: state.coins - item.price, owned: [...state.owned, id] };
}

export function isValidCell(id: ItemId, position: Placement): boolean {
  if (position.column < 0 || position.column > 7 || position.row < 0 || position.row > 2) return false;
  if (id === 'picture') return position.column === 1 && position.row === 0;
  const reserved = (position.row === 0 && position.column <= 3) ||
    (position.row === 1 && position.column >= 3 && position.column <= 4);
  return !reserved;
}

export function placeItem(state: AppState, id: ItemId, position: Placement | null): AppState {
  if (!state.owned.includes(id)) return state;
  if (position === null) {
    const placements = { ...state.placements };
    delete placements[id];
    return { ...state, placements };
  }
  if (!isValidCell(id, position)) return state;
  const blocked = Object.entries(state.placements).some(([otherId, cell]) =>
    otherId !== id && cell?.column === position.column && cell?.row === position.row);
  if (blocked) return state;
  return { ...state, placements: { ...state.placements, [id]: position } };
}
