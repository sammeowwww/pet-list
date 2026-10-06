import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { formatDay } from '../domain/dates';
import { completedTasks, taskGroups, scopedTasks, unfinishedTasks, type TaskScope } from '../domain/taskView';
import type { AppState, Task } from '../domain/state';
import { activeCategories } from '../domain/categories';
import TaskRow, { type TaskActions } from './TaskRow';

function TaskGroups({ tasks, completedOnly, now, actions }: { tasks: Task[]; completedOnly: boolean; now: number; actions: TaskActions }) {
  return taskGroups(tasks, completedOnly).map(group => <section className="history-day" key={group.day ?? 'undated'}>
    <h2>{group.day ? formatDay(group.day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Undated tasks'}</h2>
    <div className="task-list large">{group.tasks.map(task => <TaskRow key={task.id} task={task} now={now} actions={actions} showStatus />)}</div>
  </section>);
}
function ShowMore({ total, shown, label, onMore }: { total: number; shown: number; label: string; onMore: () => void }) {
  return total > shown && <button className="secondary-button show-more" onClick={onMore}>Show more {label} · {Math.min(shown, total)} of {total}</button>;
}
export default function HistoryPage({ state, now, actions, onAdd, initialScope = 'all' }: { state: AppState; now: number; actions: TaskActions; onAdd: () => void; initialScope?: string }) {
  const [scopeValue, setScope] = useState(initialScope);
  const [filter, setFilter] = useState<'all' | 'completed'>('all');
  const [showCompleted, setShowCompleted] = useState(true);
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
  const completedVisible = filter === 'completed' || showCompleted;
  const visible = [...(filter === 'all' ? unfinished.slice(0, unfinishedLimit) : []), ...(completedVisible ? completed.slice(0, completedLimit) : [])];
  return <div className="page simple-page"><section className="page-title history-title tasks-title"><div><p className="eyebrow">YOUR PLANNER</p><h1>Tasks</h1></div><button className="primary-button" aria-label="Add general task" onClick={onAdd}><Plus size={19} /> Add task</button></section>
    <section className="history-card">
      <div className="task-view-controls"><label className="scope-picker"><span className="sr-only">Task scope</span><select value={selection} onChange={event => { setScope(event.target.value); resetLimits(); }}><option value="general">General</option><option value="all">All categories</option>{categories.map(category => <option key={category.id} value={`category:${category.id}`}>{category.name}</option>)}</select></label>
        <div className="planner-tabs">{(['all', 'completed'] as const).map(id => <button key={id} className={filter === id ? 'selected' : ''} aria-pressed={filter === id} onClick={() => { setFilter(id); resetLimits(); }}>{id === 'all' ? 'All tasks' : 'Completed'}</button>)}</div>
        {filter === 'all' && <label className="pixel-toggle"><input type="checkbox" role="switch" checked={showCompleted} onChange={event => { setShowCompleted(event.target.checked); setCompletedLimit(25); }} /><span className="pixel-toggle-track" aria-hidden="true" /><span>Show completed</span></label>}
      </div>
      <div className="task-search-row"><label className="task-search"><Search size={17} aria-hidden="true" /><input aria-label="Search tasks" type="search" placeholder="Search tasks and notes" value={search} onChange={event => { setSearch(event.target.value); resetLimits(); }} /></label>{filter === 'completed' && <label className="history-range"><span className="sr-only">Completed date range</span><select value={range} onChange={event => { setRange(event.target.value); resetLimits(); }}><option value="recent">Last 30 days</option><option value="all">All time</option></select></label>}</div>
      <TaskGroups tasks={visible} completedOnly={filter === 'completed'} now={now} actions={actions} />
      <div className="task-pagination">
        {filter === 'all' && <ShowMore total={unfinished.length} shown={unfinishedLimit} label="unfinished" onMore={() => setUnfinishedLimit(limit => limit + 25)} />}
        {completedVisible && <ShowMore total={completed.length} shown={completedLimit} label="completed" onMore={() => setCompletedLimit(limit => limit + 25)} />}
      </div>
      {!visible.length && <p className="empty-state">No tasks match this view.</p>}
    </section>
  </div>;
}
