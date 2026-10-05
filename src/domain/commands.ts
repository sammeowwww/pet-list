import { z } from 'zod';
import { appStateSchema, buyItem, claimBonus, completeTask, itemSchema, petIdSchema, placeItem, placementSchema, removeTask, setTaskStatus, settleRewards, taskSchema, UNDO_MS, type AppState, type Task, type TaskInput } from './state';
import { buyPet, feedPet, setPetActive } from './pets';
import { addPlannerTask, editPlannerTask, removeUntouchedSuccessor, stopSeries } from './recurrence';
import { categorySchema, repeatRuleSchema } from './repeat';
import { categoryNameSchema, resolveCategory, removeCategory, validateCategoryName } from './categories';
import { localDay } from './dates';

const id = z.string().min(1).max(160);
export const taskInputSchema = z.object({ title: taskSchema.shape.title, note: taskSchema.shape.note, category: taskSchema.shape.category, assignedDay: taskSchema.shape.assignedDay, deadline: taskSchema.shape.deadline, repeat: repeatRuleSchema.nullable().optional() });
export const actionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), taskId: id, input: taskInputSchema }),
  z.object({ kind: z.literal('edit'), taskId: id, before: taskInputSchema, input: taskInputSchema }),
  z.object({ kind: z.literal('status'), taskId: id, status: z.enum(['todo', 'inprogress']), previous: z.enum(['todo', 'inprogress']) }),
  z.object({ kind: z.literal('complete'), taskId: id }),
  z.object({ kind: z.literal('undo'), taskId: id, completionId: id.nullable() }),
  z.object({ kind: z.literal('delete'), taskId: id, before: taskSchema }),
  z.object({ kind: z.literal('buyItem'), item: itemSchema }),
  z.object({ kind: z.literal('place'), item: itemSchema, position: placementSchema.nullable() }),
  z.object({ kind: z.literal('bonus') }),
  z.object({ kind: z.literal('buyPet'), pet: petIdSchema }),
  z.object({ kind: z.literal('activatePet'), pet: petIdSchema, active: z.boolean() }),
  z.object({ kind: z.literal('feed'), pet: petIdSchema }),
  z.object({ kind: z.literal('createCategory'), categoryId: categorySchema, name: categoryNameSchema }),
  z.object({ kind: z.literal('renameCategory'), categoryId: categorySchema, previous: categoryNameSchema, name: categoryNameSchema }),
  z.object({ kind: z.literal('removeCategory'), categoryId: categorySchema, previous: categoryNameSchema, replacementId: categorySchema }),
  z.object({ kind: z.literal('preference'), category: categorySchema, previous: categorySchema }),
  z.object({ kind: z.literal('replace'), state: appStateSchema, expectedRevision: z.number().int().nonnegative() }),
]);
export const commandSchema = z.object({ id: z.string().uuid(), at: z.number().finite().nonnegative(), order: z.number().finite(), action: actionSchema });
export type PlannerAction = z.infer<typeof actionSchema>;
export type Command = z.infer<typeof commandSchema>;
export type CloudSnapshot = { state: AppState; revision: number };
export type Receipt = { id: string; error: string | null };
export class CommandConflict extends Error {}

function editedTask(state: AppState, taskId: string, before: TaskInput, input: TaskInput): AppState {
  const current = state.tasks.find(task => task.id === taskId);
  if (!current || current.status === 'done') throw new CommandConflict('This task was completed or removed on another device.');
  before = canonicalInput(state, before);
  input = canonicalInput(state, input);
  const merged = taskInputSchema.parse(current);
  for (const field of Object.keys(taskInputSchema.shape) as (keyof typeof merged)[]) {
    if (sameValue(input[field], before[field])) continue;
    if (!sameValue(current[field], before[field]) && !sameValue(current[field], input[field])) throw new CommandConflict(`Another device changed this task’s ${field}. Your edit is kept in Settings for review.`);
    Object.assign(merged, { [field]: input[field] });
  }
  return editPlannerTask(state, taskId, merged);
}

function canonicalInput(state: AppState, input: TaskInput): TaskInput { return { ...input, category: resolveCategory(state.categories, input.category) }; }

function sameValue(a: unknown, b: unknown): boolean { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); }

function undoneTask(state: AppState, command: Command, taskId: string, completionId: string | null): AppState {
  const task = state.tasks.find(task => task.id === taskId);
  if (!task || task.status !== 'done') return state;
  if (task.completionId !== completionId || command.at < task.completedAt! || command.at >= task.completedAt! + UNDO_MS) throw new CommandConflict('This completion can no longer be undone.');
  state = removeUntouchedSuccessor(state, task);
  return { ...state, coins: task.pending ? state.coins : Math.max(0, state.coins - task.reward), tasks: state.tasks.map(value => value.id === taskId
    ? { ...value, status: value.pending?.previousStatus ?? value.completionPreviousStatus, completedAt: null, pending: null, reward: 0, completionId: null } : value) };
}

function requireTransition(before: AppState, after: AppState, message: string): AppState {
  if (before === after) throw new CommandConflict(message);
  return after;
}

export function applyCommand(state: AppState, command: Command, now: number, revision = 0): AppState {
  const action = command.action;
  const at = Math.min(command.at, now);
  switch (action.kind) {
    case 'create': {
      return addPlannerTask(state, action.taskId, canonicalInput(state, action.input), at);
    }
    case 'edit': return editedTask(state, action.taskId, action.before, action.input);
    case 'status': {
      const task = state.tasks.find(task => task.id === action.taskId);
      if (!task || task.status === 'done' || (task.status !== action.previous && task.status !== action.status)) throw new CommandConflict('This task’s status changed on another device.');
      return setTaskStatus(state, action.taskId, action.status);
    }
    case 'complete': {
      const task = state.tasks.find(task => task.id === action.taskId);
      if (!task) throw new CommandConflict('This task was removed on another device.');
      if (task.status === 'done') return state;
      if (task.seriesId && task.assignedDay! > localDay(at)) throw new CommandConflict('This repeating task is not due yet.');
      const next = completeTask(state, action.taskId, at);
      return { ...next, tasks: next.tasks.map(task => task.id === action.taskId && task.status === 'done' && task.completionId === null
        ? { ...task, completionId: command.id } : task) };
    }
    case 'undo': return undoneTask(state, command, action.taskId, action.completionId);
    case 'delete': {
      const task = state.tasks.find(task => task.id === action.taskId);
      if (!task) return state;
      if (task.pending) throw new CommandConflict('Wait for the undo window before deleting.');
      if (JSON.stringify(task) !== JSON.stringify(action.before)) throw new CommandConflict('This task changed on another device. Review it before deleting.');
      if (task.seriesId && task.status !== 'done') state = stopSeries(state, task.seriesId);
      return requireTransition(state, removeTask(state, action.taskId), 'Wait for the undo window before deleting.');
    }
    case 'buyItem': return requireTransition(state, buyItem(state, action.item), 'This purchase is already owned, pending, or needs more coins.');
    case 'place': return requireTransition(state, placeItem(state, action.item, action.position), 'That decoration cannot be placed there.');
    case 'bonus': return requireTransition(state, claimBonus(state, now), 'The daily bonus is not available or has already been claimed.');
    case 'buyPet': return requireTransition(state, buyPet(state, action.pet), 'This pet is owned, pending, or needs more coins.');
    case 'activatePet': return requireTransition(state, setPetActive(state, action.pet, action.active), 'Only three owned pets can be active.');
    case 'feed': return requireTransition(state, feedPet(state, action.pet, at), 'This pet is inactive or has already been fed that day.');
    case 'createCategory': {
      if (state.categories.some(category => category.id === action.categoryId)) throw new CommandConflict('This category ID already exists. Review it in Settings.');
      if (state.categories.length >= 1000) throw new CommandConflict('The category catalog is full.');
      const name = validateCategoryName(state.categories, action.name);
      return { ...state, categories: [...state.categories, { id: action.categoryId, name, replacementId: null }] };
    }
    case 'renameCategory':
    case 'removeCategory': {
      const category = state.categories.find(category => category.id === action.categoryId && category.replacementId === null);
      if (!category || category.name !== action.previous) throw new CommandConflict('This category changed on another device. Your change is kept in Settings for review.');
      if (action.kind === 'removeCategory') return removeCategory(state, category.id, action.replacementId);
      const name = validateCategoryName(state.categories, action.name, category.id);
      return { ...state, categories: state.categories.map(value => value.id === category.id ? { ...value, name } : value) };
    }
    case 'preference': {
      const previous = resolveCategory(state.categories, action.previous);
      const category = resolveCategory(state.categories, action.category);
      if (state.preferences.defaultCategory !== previous && state.preferences.defaultCategory !== category) throw new CommandConflict('Your default category changed on another device. Review it in Settings.');
      return { ...state, preferences: { ...state.preferences, defaultCategory: category } };
    }
    case 'replace': {
      if (revision !== action.expectedRevision) throw new CommandConflict('Your cloud planner changed. Refresh before replacing it.');
      return action.state;
    }
  }
}

export function replayCommands(snapshot: CloudSnapshot, commands: Command[], now: number): AppState {
  let state = snapshot.state;
  for (const command of commands) {
    try { state = applyCommand(settleRewards(state, Math.min(command.at, now)), command, now, snapshot.revision); }
    catch { /* Rejected previews remain in the outbox until the server returns a receipt. */ }
  }
  return state;
}

export function taskFields(task: Task): z.infer<typeof taskInputSchema> { return taskInputSchema.parse(task); }
