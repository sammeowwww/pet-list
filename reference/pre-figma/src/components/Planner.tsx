import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, Circle, Inbox, Plus, Sparkles, Sprout, Clock3 } from 'lucide-react';
import TaskCard, { type TaskActions } from './TaskCard';
import { addDays, formatDay, localDay, weekDays, weekStart } from '../domain/dates';
import { tasksForDay, type AppState, type Task } from '../domain/state';

type PlannerProps = {
  state: AppState; now: number; day: string; setDay: (day: string) => void;
  actions: TaskActions; addTask: (day: string | null) => void; goHome: () => void;
};

export function WeekSelector({ day, today, tasks, now, onSelect }: {
  day: string; today: string; tasks: Task[]; now: number; onSelect: (day: string) => void;
}) {
  return <div className="week-selector" aria-label="Choose a day">{weekDays(day).map(date => {
    const count = tasksForDay(tasks, date, today, now).filter(task => task.status !== 'done').length;
    return <button key={date} className={`day-pill ${date === day ? 'selected' : ''} ${date === today ? 'is-today' : ''}`} onClick={() => onSelect(date)} aria-pressed={date === day} aria-label={formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' })}><span>{formatDay(date, { weekday: 'short' })}</span><strong>{formatDay(date, { day: 'numeric' })}</strong><span className={`day-dot ${count ? 'has-tasks' : ''}`} /></button>;
  })}</div>;
}

function DateNavigation({ day, today, onChange, weekly = false }: {
  day: string; today: string; onChange: (day: string) => void; weekly?: boolean;
}) {
  return <div className="date-navigation"><span>{weekly ? `${formatDay(weekStart(day), { day: 'numeric', month: 'short' })} – ${formatDay(addDays(weekStart(day), 6), { day: 'numeric', month: 'short', year: 'numeric' })}` : formatDay(day, { month: 'long', year: 'numeric' })}</span><div><button className="icon-button" aria-label="Previous week" onClick={() => onChange(addDays(day, -7))}><ArrowLeft size={16} /></button><button className="today-button" onClick={() => onChange(today)}>Today</button><button className="icon-button" aria-label="Next week" onClick={() => onChange(addDays(day, 7))}><ArrowRight size={16} /></button></div></div>;
}

function TaskSection({ title, tasks, now, actions }: { title: string; tasks: Task[]; now: number; actions: TaskActions }) {
  if (!tasks.length) return null;
  return <section className="task-section"><h2>{title}<span>{tasks.length}</span></h2><div className="task-stack">{tasks.map(task => <TaskCard key={task.id} task={task} now={now} actions={actions} />)}</div></section>;
}

export function DayPlanner({ state, now, day, setDay, actions, addTask, goHome }: PlannerProps) {
  const [showBacklog, setShowBacklog] = useState(false);
  const today = localDay(now);
  const selectedTasks = tasksForDay(state.tasks, day, today, now);
  const backlog = state.tasks.filter(task => task.assignedDay === null && task.deadline === null && task.status !== 'done');
  const visible = showBacklog ? backlog : selectedTasks;
  const inProgress = visible.filter(task => task.status === 'inprogress');
  const todo = visible.filter(task => task.status === 'todo');
  const done = visible.filter(task => task.status === 'done');
  const percent = selectedTasks.length ? Math.round(selectedTasks.filter(task => task.status === 'done').length / selectedTasks.length * 100) : 0;
  const heading = day === today ? 'A little focus. A good day.' : formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' });

  return <>
    <div className="page-heading"><div><p className="eyebrow"><span className="tiny-sun">✳</span> {day === today ? 'ONE DAY AT A TIME' : 'MAKE ROOM FOR WHAT MATTERS'}</p><h1>{heading}</h1><p>A clear plan, a small step, and a little room to breathe.</p></div><button className="button primary" onClick={() => addTask(showBacklog ? null : day)}><Plus size={18} /> Add task</button></div>
    <div className="planner-layout"><div className="planner-main">
      <section className="calendar-panel"><DateNavigation day={day} today={today} onChange={setDay} /><WeekSelector day={day} today={today} tasks={state.tasks} now={now} onSelect={date => { setDay(date); setShowBacklog(false); }} /></section>
      <div className="list-toolbar"><div className="segmented"><button className={!showBacklog ? 'active' : ''} onClick={() => setShowBacklog(false)}>Your day <span>{selectedTasks.length}</span></button><button className={showBacklog ? 'active' : ''} onClick={() => setShowBacklog(true)}>Backlog <span>{backlog.length}</span></button></div><span className="list-date">{showBacklog ? 'Whenever you’re ready' : formatDay(day, { weekday: 'long', day: 'numeric', month: 'short' })}</span></div>
      <TaskSection title="In progress" tasks={inProgress} now={now} actions={actions} />
      <TaskSection title="To do" tasks={todo} now={now} actions={actions} />
      <TaskSection title="Completed" tasks={done} now={now} actions={actions} />
      {visible.length === 0 && <div className="empty-state"><div className="empty-illustration"><CalendarDays size={34} /><span><Sprout size={22} /></span></div><h2>{showBacklog ? 'A little space for later.' : 'Your day is a blank page.'}</h2><p>{showBacklog ? 'Keep ideas and unscheduled tasks here until you’re ready to plan them.' : 'Add what matters today. You don’t have to fill every moment.'}</p><button className="button secondary" onClick={() => addTask(showBacklog ? null : day)}><Plus size={16} />{showBacklog ? 'Add to backlog' : 'Plan your first task'}</button></div>}
    </div>
    <aside className="day-sidebar"><section className="progress-panel"><p className="eyebrow">YOUR DAILY PICTURE</p><div className="progress-ring" style={{ '--progress': `${percent}%` } as React.CSSProperties}><div><strong>{percent}<small>%</small></strong><span>complete</span></div></div><p>{selectedTasks.filter(task => task.status === 'done').length} of {selectedTasks.length} tasks done</p><div className="stat-line"><span><Circle size={12} /> To do</span><strong>{selectedTasks.filter(task => task.status === 'todo').length}</strong></div><div className="stat-line"><span><Clock3 size={12} /> In progress</span><strong>{selectedTasks.filter(task => task.status === 'inprogress').length}</strong></div><div className="stat-line"><span><Check size={13} /> Completed</span><strong>{selectedTasks.filter(task => task.status === 'done').length}</strong></div></section>
      <section className="gentle-note"><Sprout size={25} /><h3>Progress, at your pace.</h3><p>A small step still moves you forward. Your little companion is cheering you on.</p><button onClick={goHome}>Visit your home <ArrowUpRight size={15} /></button></section>
      <p className="sidebar-footnote"><Sparkles size={13} /> Finish a task. Enjoy a little spark.</p>
    </aside></div>
  </>;
}

export function WeekPlanner({ state, now, day, setDay, actions, addTask, openDay }: PlannerProps & { openDay: (day: string) => void }) {
  const [history, setHistory] = useState(false);
  const today = localDay(now);
  const historyStart = addDays(weekStart(today), -7);
  const displayedDay = history ? historyStart : day;
  const days = weekDays(displayedDay);
  const completedLastWeek = state.tasks.filter(task => task.completedAt !== null && localDay(task.completedAt) >= historyStart && localDay(task.completedAt) < weekStart(today));

  function tasksOn(date: string): Task[] {
    if (history) return completedLastWeek.filter(task => localDay(task.completedAt!) === date);
    return tasksForDay(state.tasks, date, today, now);
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow"><CalendarDays size={14} /> THE BIGGER PICTURE</p><h1>{history ? 'Look how far you’ve come.' : 'A week, with a little intention.'}</h1><p>{history ? 'A record of the things you finished last week. Every step counts.' : 'See what’s ahead. Give each task a place in your week.'}</p></div><button className="button primary" onClick={() => addTask(day)}><Plus size={18} /> Add task</button></div>
    <div className="week-toolbar"><div className="segmented"><button className={!history ? 'active' : ''} onClick={() => setHistory(false)}>Weekly plan</button><button className={history ? 'active' : ''} onClick={() => setHistory(true)}>Last week’s wins <span>{completedLastWeek.length}</span></button></div>{!history && <DateNavigation day={day} today={today} onChange={setDay} weekly />}{history && <span className="list-date">{formatDay(days[0], { day: 'numeric', month: 'short' })} – {formatDay(days[6], { day: 'numeric', month: 'short' })}</span>}</div>
    <div className="week-board">{days.map(date => {
      const tasks = tasksOn(date);
      return <section key={date} className={`week-column ${date === today && !history ? 'current' : ''}`}><header><button onClick={() => openDay(date)}><span>{formatDay(date, { weekday: 'short' })}</span><strong>{formatDay(date, { day: 'numeric' })}</strong></button><span className="column-count">{tasks.length}</span></header><div className="week-task-stack">{tasks.map(task => <TaskCard key={task.id} task={task} now={now} actions={actions} compact />)}</div>{!tasks.length && <p className="column-empty">{history ? 'A little breathing room' : 'Room to make a plan'}</p>}{!history && <button className="column-add" aria-label={`Add task for ${formatDay(date, { weekday: 'long' })}`} onClick={() => addTask(date)}><Plus size={14} /> Add task</button>}</section>;
    })}</div>
    <div className="week-note"><Inbox size={18} /><p>{history ? `${completedLastWeek.length} tasks completed last week. Your history is saved on this device.` : 'Not sure when to do something? Leave its planned date empty to keep it in your backlog.'}</p></div>
  </>;
}
