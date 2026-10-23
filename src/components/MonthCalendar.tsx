import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { addDays, formatDay, localDay } from '../domain/dates';
import {
  calendarTasksByDay,
  monthDays,
  monthLabel,
  moveMonth,
  overdueCalendarTasks,
} from '../domain/monthCalendar';
import type { AppState } from '../domain/state';
import TaskRow, { type TaskActions } from './TaskRow';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthCalendar({
  state,
  now,
  day,
  onSelect,
  onBack,
  onAdd,
  actions,
}: {
  state: AppState;
  now: number;
  day: string;
  onSelect: (day: string) => void;
  onBack: () => void;
  onAdd: (day: string) => void;
  actions: TaskActions;
}) {
  const today = localDay(now);
  const [month, setMonth] = useState(day.slice(0, 7));
  const focusDay = useRef<string | null>(null);
  const dateButtons = useRef(new Map<string, HTMLButtonElement>());
  const dates = monthDays(`${month}-01`);
  const tasksByDay = calendarTasksByDay(state.tasks);
  const datedTasks = tasksByDay.get(day) ?? [];
  const carryovers =
    day === today ? overdueCalendarTasks(state.tasks, today) : [];

  useEffect(() => {
    if (!focusDay.current) return;
    dateButtons.current.get(focusDay.current)?.focus();
    focusDay.current = null;
  });

  function selectDate(next: string, fromKeyboard = false) {
    if (fromKeyboard) focusDay.current = next;
    setMonth(next.slice(0, 7));
    onSelect(next);
  }

  function changeMonth(offset: number) {
    selectDate(moveMonth(day, offset));
  }

  function handleDateKey(
    event: React.KeyboardEvent<HTMLButtonElement>,
    date: string,
  ) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const offset = offsets[event.key];
    if (offset !== undefined) {
      event.preventDefault();
      selectDate(addDays(date, offset), true);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const weekday = new Date(`${date}T12:00:00+08:00`).getUTCDay();
      selectDate(
        addDays(date, (event.key === 'Home' ? 1 : 7) - (weekday || 7)),
        true,
      );
    }
  }

  return (
    <div className="page month-calendar-page">
      <header className="month-calendar-header">
        <button
          className="secondary-button"
          onClick={onBack}
        >
          <ArrowLeft size={17} /> Back to Today
        </button>
        <div>
          <p className="eyebrow">YOUR MONTH AT A GLANCE</p>
          <h1>Calendar</h1>
        </div>
      </header>

      <section
        className="month-calendar-card"
        aria-label="Monthly task calendar"
      >
        <div className="month-calendar-toolbar">
          <h2>{monthLabel(`${month}-01`)}</h2>
          <div className="month-calendar-controls">
            <button
              className="secondary-button"
              onClick={() => selectDate(today)}
            >
              Today
            </button>
            <button
              className="icon-button"
              aria-label="Previous month"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="icon-button"
              aria-label="Next month"
              onClick={() => changeMonth(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="month-calendar-grid">
          {WEEKDAYS.map((weekday) => (
            <span
              className="month-calendar-weekday"
              key={weekday}
              aria-hidden="true"
            >
              {weekday}
            </span>
          ))}
          {dates.map((date) => {
            const tasks = tasksByDay.get(date) ?? [];
            const sameMonth = date.slice(0, 7) === month;
            const label = formatDay(date, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            return (
              <button
                key={date}
                ref={(element) => {
                  if (element) dateButtons.current.set(date, element);
                  else dateButtons.current.delete(date);
                }}
                className={`month-calendar-day${sameMonth ? '' : ' outside'}${day === date ? ' selected' : ''}${today === date ? ' today' : ''}`}
                aria-label={`${label}, ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
                aria-pressed={day === date}
                aria-current={today === date ? 'date' : undefined}
                onClick={() => selectDate(date)}
                onKeyDown={(event) => handleDateKey(event, date)}
              >
                <span className="month-calendar-number">
                  {Number(date.slice(-2))}
                </span>
                <span
                  className="month-calendar-snippets"
                  aria-hidden="true"
                >
                  {tasks.slice(0, 2).map((task, index) => (
                    <span
                      className={`month-calendar-snippet ${task.status}${index ? ' second' : ''}`}
                      key={task.id}
                    >
                      {task.title}
                    </span>
                  ))}
                  {tasks.length > 1 && (
                    <small className="mobile-count">+{tasks.length - 1}</small>
                  )}
                  {tasks.length > 2 && (
                    <small className="desktop-count">+{tasks.length - 2}</small>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="month-calendar-list"
        aria-live="polite"
      >
        <div className="month-calendar-list-header">
          <div>
            <p className="eyebrow">SELECTED DAY</p>
            <h2>
              {formatDay(day, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
          </div>
          <button
            className="primary-button"
            onClick={() => onAdd(day)}
          >
            <Plus size={18} /> Add task
          </button>
        </div>
        <div className="task-list large">
          {datedTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              now={now}
              actions={actions}
              showStatus
            />
          ))}
        </div>
        {!datedTasks.length && (
          <p className="month-calendar-empty">No tasks on this date yet.</p>
        )}
        {carryovers.length > 0 && (
          <div className="month-calendar-carryovers">
            <h3>Overdue carryovers</h3>
            <p>
              Unfinished tasks from earlier dates appear here until you complete
              or reschedule them.
            </p>
            <div className="task-list large">
              {carryovers.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  now={now}
                  actions={actions}
                  showStatus
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
