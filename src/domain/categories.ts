import { z } from 'zod';
import type { AppState } from './state';

export const categorySchema = z.string().min(1).max(160);
export const categoryNameSchema = z.string().trim().min(1, 'Enter a category name.').max(40, 'Use at most 40 characters.').refine(name => !['general', 'all categories'].includes(name.toLowerCase()), 'That name is reserved for a task scope.');
export const categoryEntrySchema = z.object({ id: categorySchema, name: categoryNameSchema, replacementId: categorySchema.nullable().default(null) });
export type Category = z.infer<typeof categoryEntrySchema>;
export const CATEGORIES = ['Personal', 'Work', 'Wellbeing', 'Health', 'Errand', 'Home'] as const;
export function initialCategories(): Category[] { return CATEGORIES.map(name => ({ id: name, name, replacementId: null })); }
export function activeCategories(categories: Category[]): Category[] { return categories.filter(category => category.replacementId === null); }
export function resolveCategory(categories: Category[], id: string): string {
  const visited = new Set<string>();
  while (!visited.has(id)) {
    visited.add(id);
    const category = categories.find(value => value.id === id);
    if (!category) break;
    if (category.replacementId === null) return id;
    id = category.replacementId;
  }
  throw new Error('This category is unavailable. Review your change in Settings.');
}
export function validateCategoryName(categories: Category[], name: string, exceptId?: string): string {
  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const trimmed = parsed.data;
  if (activeCategories(categories).some(category => category.id !== exceptId && category.name.toLowerCase() === trimmed.toLowerCase())) throw new Error('A category with that name already exists.');
  return trimmed;
}
export function removeCategory(state: AppState, id: string, replacementId: string): AppState {
  if (id === replacementId || resolveCategory(state.categories, id) !== id || resolveCategory(state.categories, replacementId) !== replacementId) throw new Error('Choose another active category as the replacement.');
  return {
    ...state,
    categories: state.categories.map(category => category.id === id ? { ...category, replacementId } : category),
    tasks: state.tasks.map(task => task.category === id ? { ...task, category: replacementId, occurrenceTouched: task.occurrenceTouched || (!!task.seriesId && task.status !== 'done') } : task),
    series: state.series.map(series => series.category === id ? { ...series, category: replacementId } : series),
    preferences: { ...state.preferences, defaultCategory: state.preferences.defaultCategory === id ? replacementId : state.preferences.defaultCategory },
  };
}

export function validCategoryAssignments(categories: Category[], assignments: string[]): boolean {
  const active = activeCategories(categories);
  if (!active.length || new Set(categories.map(category => category.id)).size !== categories.length || new Set(active.map(category => category.name.toLowerCase())).size !== active.length) return false;
  try {
    for (const category of categories) resolveCategory(categories, category.id);
    return assignments.every(id => resolveCategory(categories, id) === id);
  } catch { return false; }
}
