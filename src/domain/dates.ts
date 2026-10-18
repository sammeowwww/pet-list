export const TIME_ZONE = 'Asia/Singapore';

export function localDay(timestamp: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp);
}

export function calendarDate(day: string): Date {
  return new Date(`${day}T12:00:00+08:00`);
}

export function addDays(day: string, amount: number): string {
  return localDay(calendarDate(day).getTime() + amount * 86_400_000);
}

export function weekStart(day: string): string {
  const weekday = calendarDate(day).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export function weekDays(day: string): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart(day), index),
  );
}

export function formatDay(
  day: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-GB', {
    ...options,
    timeZone: TIME_ZONE,
  }).format(calendarDate(day));
}

export function resolveDeadline(
  date: string,
  time: string,
  today: string,
): string | null {
  if (!date && !time) return null;
  return new Date(`${date || today}T${time || '23:59:59'}+08:00`).toISOString();
}

export function deadlineFields(deadline: string | null): {
  date: string;
  time: string;
} {
  if (!deadline) return { date: '', time: '' };
  const value = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(deadline));
  return {
    date: localDay(Date.parse(deadline)),
    time: value === '23:59' ? '' : value,
  };
}

export function formatDeadline(deadline: string): string {
  const endOfDay = deadline.endsWith('15:59:59.000Z');
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    ...(endOfDay
      ? {}
      : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const }),
  }).format(new Date(deadline));
}
