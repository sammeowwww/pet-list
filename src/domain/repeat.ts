import { z } from 'zod';
import { addDays, calendarDate } from './dates';

export const categorySchema = z.enum(['Personal', 'Work', 'Wellbeing', 'Health', 'Errand', 'Home']);
export const CATEGORIES = categorySchema.options;
export const repeatRuleSchema = z.object({
  mode: z.enum(['daily', 'weekdays', 'selected']),
  days: z.array(z.number().int().min(0).max(6)).max(7).default([]),
}).refine(rule => new Set(rule.days).size === rule.days.length && (rule.mode !== 'selected' || rule.days.length > 0), 'Choose at least one unique weekday.');
export type RepeatRule = z.infer<typeof repeatRuleSchema>;
export const seriesSchema = z.object({
  active: z.boolean().default(true),
  id: z.string().min(1).max(100), title: z.string().trim().min(1).max(160), note: z.string().max(500),
  category: categorySchema, rule: repeatRuleSchema,
  deadlineTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/).nullable(),
});
export type Series = z.infer<typeof seriesSchema>;

export function eligibleDay(day: string, rule: RepeatRule): boolean {
  const weekday = calendarDate(day).getUTCDay();
  return rule.mode === 'daily' || (rule.mode === 'weekdays' ? weekday >= 1 && weekday <= 5 : rule.days.includes(weekday));
}
export function nextRepeatDay(day: string, rule: RepeatRule): string {
  for (let offset = 0; offset < 7; offset++) {
    const candidate = addDays(day, offset);
    if (eligibleDay(candidate, rule)) return candidate;
  }
  throw new Error('Choose at least one repeat day.');
}
