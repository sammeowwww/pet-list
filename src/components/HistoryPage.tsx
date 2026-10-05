import { useState } from 'react';
import { Plus } from 'lucide-react';
import { formatDay } from '../domain/dates';
import { historyDay } from '../domain/progress';
import { generalTasks, type AppState } from '../domain/state';
import TaskRow, { type TaskActions } from './TaskRow';

export default function HistoryPage({ state, now, actions, onAdd }: { state: AppState; now: number; actions: TaskActions; onAdd: () => void }) {
  const [filter, setFilter] = useState<'general' | 'all' | 'completed'>('general');
  const tasks = filter === 'general' ? generalTasks(state.tasks) : filter === 'completed' ? state.tasks.filter(task => task.status === 'done') : state.tasks;
  const dates = [...new Set(tasks.map(historyDay))].sort().reverse();
  const rows = (date?: string) => <div className="task-list large">{tasks.filter(task => !date || historyDay(task) === date).map(task => <TaskRow key={task.id} task={task} now={now} actions={actions} showStatus />)}</div>;
  return <div className="page simple-page"><section className="page-title history-title"><div><p className="eyebrow">YOUR PLANNER</p><h1>Tasks</h1></div><button className="primary-button" aria-label="Add general task" onClick={onAdd}><Plus size={19} /> Add task</button></section>
    <section className="history-card"><div className="planner-tabs">{([['general', 'General'], ['all', 'All tasks'], ['completed', 'Completed']] as const).map(([id, label]) => <button key={id} className={filter === id ? 'selected' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
      {!tasks.length && <div className="empty-state"><h3>{filter === 'general' ? 'A little space for flexible plans' : 'A new page in your story'}</h3><p>{filter === 'general' ? 'Tasks without a planned date or deadline live here.' : 'Your tasks will be remembered here.'}</p></div>}
      {filter === 'general' ? rows() : dates.map(date => <section className="history-day" key={date}><h2>{formatDay(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>{rows(date)}</section>)}
    </section>
  </div>;
}
