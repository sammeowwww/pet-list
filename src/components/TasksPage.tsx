import { CalendarDays, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatDay, localDay } from '../domain/dates';
import { percentComplete, weekTasks } from '../domain/progress';
import { sortTasksByStatus } from '../domain/taskView';
import { EFFORT_REWARDS, tasksForDay, type AppState } from '../domain/state';
import CalendarStrip from './CalendarStrip';
import TaskRow, { Coin, type TaskActions } from './TaskRow';

export default function TasksPage({
  state,
  now,
  day,
  onSelect,
  actions,
  onAdd,
}: {
  state: AppState;
  now: number;
  day: string;
  onSelect: (day: string) => void;
  actions: TaskActions;
  onAdd: (day: string | null) => void;
}) {
  const [general, setGeneral] = useState(false);
  const today = localDay(now);
  const selectedTasks = tasksForDay(state.tasks, day, today, now);
  const generalTasks = state.tasks.filter(
    (task) => !task.assignedDay && !task.deadline && task.status !== 'done',
  );
  const tasks = sortTasksByStatus(general ? generalTasks : selectedTasks);
  const weeklyTasks = weekTasks(state.tasks, day);
  const progress = percentComplete(weeklyTasks);
  const completed = weeklyTasks.filter((task) => task.status === 'done').length;

  function selectDate(date: string) {
    onSelect(date);
    setGeneral(false);
  }

  return (
    <div className="page tasks-page">
      <section className="page-title">
        <div>
          <p className="eyebrow">YOUR DAILY PLAN</p>
          <h1>{`${formatDay(day, { weekday: 'long' })}’s tasks`}</h1>
          <p>Small steps count. Keep your day moving.</p>
        </div>
        <button
          className="primary-button"
          aria-label="Add task"
          onClick={() => onAdd(general ? null : day)}
        >
          <Plus size={19} /> Add task
        </button>
      </section>
      <CalendarStrip
        day={day}
        today={today}
        tasks={state.tasks}
        now={now}
        onSelect={selectDate}
      />
      <div className="planner-grid">
        <section className="planner-card">
          <div className="planner-tabs">
            <button
              className={!general ? 'selected' : ''}
              onClick={() => setGeneral(false)}
            >
              Planned tasks <span>{selectedTasks.length}</span>
            </button>
            <button
              className={general ? 'selected' : ''}
              onClick={() => setGeneral(true)}
            >
              General <span>{generalTasks.length}</span>
            </button>
          </div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {general
                  ? 'WHENEVER YOU’RE READY'
                  : formatDay(day, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                    }).toUpperCase()}
              </p>
              <h2>
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}{' '}
                {general ? 'for later' : 'planned'}
              </h2>
            </div>
            <Coin
              amount={tasks.reduce(
                (sum, task) =>
                  sum +
                  (task.status === 'done'
                    ? task.reward
                    : EFFORT_REWARDS[task.effort]),
                0,
              )}
            />
          </div>
          <div className="task-list large">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                now={now}
                actions={actions}
              />
            ))}
          </div>
          {!tasks.length && (
            <div className="empty-state">
              <CalendarDays size={30} />
              <h3>{general ? 'A little space for later' : 'A clear day'}</h3>
              <p>
                {general
                  ? 'Keep ideas here until you’re ready to plan them.'
                  : 'Add something when you’re ready.'}
              </p>
              <button
                className="text-button"
                onClick={() => onAdd(general ? null : day)}
              >
                + {general ? 'Add to general' : 'Plan a task'}
              </button>
            </div>
          )}
        </section>
        <aside className="progress-card">
          <p className="eyebrow">WEEKLY PROGRESS</p>
          <div
            className="progress-ring"
            style={
              { '--progress': `${progress * 3.6}deg` } as React.CSSProperties
            }
          >
            <div>
              <b>{progress}%</b>
              <span>complete</span>
            </div>
          </div>
          <h3>Progress at your pace</h3>
          <p>
            {completed} of {weeklyTasks.length} tasks completed this week.
          </p>
          <div className="reward-preview">
            <span className="pixel-crate">?</span>
            <div>
              <small>A LITTLE EXTRA</small>
              <b>Finish today for a 10-coin bonus.</b>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
