import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { formatDay, localDay } from '../domain/dates';
import { completedTasks, plannedDay, scopedTasks, unfinishedTasks, type TaskScope } from '../domain/taskView';
import type { AppState, Task } from '../domain/state';
import { activeCategories } from '../domain/categories';
import TaskRow, { type TaskActions } from './TaskRow';

function TaskGroups({ tasks, completed, now, actions }: { tasks: Task[]; completed: boolean; now: number; actions: TaskActions }) {
  const dayOf = (task: Task) => completed ? localDay(task.completedAt!) : plannedDay(task);
  const days = [...new Set(tasks.map(dayOf))];
  return days.map(day => <section className="history-day" key={day ?? 'undated'}>
    <h2>{day ? formatDay(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Undated tasks'}</h2>
    <div className="task-list large">{tasks.filter(task => dayOf(task) === day).map(task => <TaskRow key={task.id} task={task} now={now} actions={actions} showStatus />)}</div>
  </section>);
}
function ShowMore({ total, shown, onMore }: { total: number; shown: number; onMore: () => void }) {
  return total > shown && <button className="secondary-button show-more" onClick={onMore}>Show more · {Math.min(shown, total)} of {total}</button>;
}
export default function HistoryPage({ state, now, actions, onAdd }: { state: AppState; now: number; actions: TaskActions; onAdd: () => void }) {
  const [scopeValue, setScope] = useState('general');
  const [filter, setFilter] = useState<'all' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('recent');
  const [unfinishedLimit, setUnfinishedLimit] = useState(25);
  const [completedLimit, setCompletedLimit] = useState(25);
  const categories = activeCategories(state.categories);
  const selection = scopeValue.startsWith('category:') && !categories.some(category => `category:${category.id}` === scopeValue) ? 'all' : scopeValue;
  const scope: TaskScope = selection.startsWith('category:') ? { kind: 'category', id: selection.slice(9) } : { kind: selection === 'general' ? 'general' : 'all' };
  const matching = scopedTasks(state.tasks, scope, search);
  const unfinished = unfinishedTasks(matching);
  const completed = completedTasks(matching, now, filter === 'completed' && range === 'recent');
  function resetLimits() { setUnfinishedLimit(25); setCompletedLimit(25); }
  const completedRows = <><TaskGroups tasks={completed.slice(0, completedLimit)} completed now={now} actions={actions} /><ShowMore total={completed.length} shown={completedLimit} onMore={() => setCompletedLimit(limit => limit + 25)} /></>;
  return <div className="page simple-page"><section className="page-title history-title"><div><p className="eyebrow">YOUR PLANNER</p><h1>Tasks</h1></div><button className="primary-button" aria-label="Add general task" onClick={onAdd}><Plus size={19} /> Add task</button></section>
    <section className="history-card">
      <div className="task-view-controls"><label className="scope-picker"><span className="sr-only">Task scope</span><select value={selection} onChange={event => { setScope(event.target.value); resetLimits(); }}><option value="general">General</option><option value="all">All categories</option>{categories.map(category => <option key={category.id} value={`category:${category.id}`}>{category.name}</option>)}</select></label>
        <div className="planner-tabs">{(['all', 'completed'] as const).map(id => <button key={id} className={filter === id ? 'selected' : ''} aria-pressed={filter === id} onClick={() => { setFilter(id); resetLimits(); }}>{id === 'all' ? 'All tasks' : 'Completed'}</button>)}</div>
      </div>
      <div className="task-search-row"><label className="task-search"><Search size={17} aria-hidden="true" /><input aria-label="Search tasks" type="search" placeholder="Search tasks and notes" value={search} onChange={event => { setSearch(event.target.value); resetLimits(); }} /></label>{filter === 'completed' && <label className="history-range"><span className="sr-only">Completed date range</span><select value={range} onChange={event => { setRange(event.target.value); resetLimits(); }}><option value="recent">Last 30 days</option><option value="all">All time</option></select></label>}</div>
      {filter === 'all' ? <>
        <TaskGroups tasks={unfinished.slice(0, unfinishedLimit)} completed={false} now={now} actions={actions} />
        <ShowMore total={unfinished.length} shown={unfinishedLimit} onMore={() => setUnfinishedLimit(limit => limit + 25)} />
        {!!completed.length && <details className="completed-section"><summary>Completed <span>{completed.length}</span></summary>{completedRows}</details>}
        {!unfinished.length && !completed.length && <p className="empty-state">No tasks match this view.</p>}
      </> : completed.length ? completedRows : <p className="empty-state">No completed tasks match this view.</p>}
    </section>
  </div>;
}
