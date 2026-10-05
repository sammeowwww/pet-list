import { ArrowLeft, ArrowRight } from 'lucide-react';
import { addDays, formatDay, weekDays, weekStart } from '../domain/dates';
import { tasksForDay, type Task } from '../domain/state';

export default function CalendarStrip({ day, today, tasks, now, onSelect }: {
  day: string; today: string; tasks: Task[]; now: number; onSelect: (day: string) => void;
}) {
  return <section aria-label="Weekly dates">
    <div className="calendar-tools"><span>{formatDay(weekStart(day), { day: 'numeric', month: 'short' })} – {formatDay(addDays(weekStart(day), 6), { day: 'numeric', month: 'short', year: 'numeric' })}</span><div><button className="icon-button" aria-label="Previous week" onClick={() => onSelect(addDays(day, -7))}><ArrowLeft size={17} /></button><button className="text-button" onClick={() => onSelect(today)}>Today</button><button className="icon-button" aria-label="Next week" onClick={() => onSelect(addDays(day, 7))}><ArrowRight size={17} /></button></div></div>
    <div className="calendar-row">{weekDays(day).map(date => <button key={date} className={date === day ? 'selected' : ''} onClick={() => onSelect(date)} aria-pressed={date === day} aria-label={formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' })}><span>{formatDay(date, { weekday: 'short' }).toUpperCase()}</span><b>{formatDay(date, { day: 'numeric' })}</b><i>{tasksForDay(tasks, date, today, now).length}</i></button>)}</div>
  </section>;
}
