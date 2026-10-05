import { Check, Clock3, MoreHorizontal, Play, Pencil, Trash2, CalendarDays, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { formatDay, formatDeadline } from '../domain/dates';
import { EFFORT_REWARDS, isOverdue, type Task } from '../domain/state';

export type TaskActions = {
  complete: (id: string) => void; undo: (id: string) => void;
  status: (id: string, status: 'todo' | 'inprogress') => void;
  edit: (task: Task) => void; remove: (task: Task) => void;
};

export default function TaskCard({ task, now, actions, compact = false }: {
  task: Task; now: number; actions: TaskActions; compact?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const done = task.status === 'done';
  const overdue = isOverdue(task, now);
  return <article className={`task-card ${task.status} ${compact ? 'compact' : ''}`}>
    <button className="task-check" disabled={done} aria-label={`Complete ${task.title}`} onClick={() => actions.complete(task.id)}>{done && <Check size={16} strokeWidth={2.8} />}</button>
    <div className="task-content"><div className="task-title-line"><h3>{task.title}</h3>{!compact && <span className="task-coins">+{done ? task.reward : EFFORT_REWARDS[task.effort]} <span>coins</span></span>}</div>
      {!compact && task.note && <p className="task-note">{task.note}</p>}
      <div className="task-meta"><span className={`category ${task.category.toLowerCase()}`}>{task.category}</span>
        {task.deadline && <span className={overdue ? 'overdue-label' : ''}><Clock3 size={12} />{overdue ? 'Overdue · ' : ''}{formatDeadline(task.deadline)}</span>}
        {!compact && !task.deadline && task.assignedDay && <span><CalendarDays size={12} />{formatDay(task.assignedDay, { day: 'numeric', month: 'short' })}</span>}
      </div>
      {task.pending ? <button className="undo-inline" onClick={() => actions.undo(task.id)}><RotateCcw size={12} /> Undo · {Math.max(1, Math.ceil((task.pending.expiresAt - now) / 1000))}s</button> : !done && <button className={`status-control ${task.status}`} onClick={() => actions.status(task.id, task.status === 'todo' ? 'inprogress' : 'todo')}><Play size={11} fill={task.status === 'inprogress' ? 'currentColor' : 'none'} />{task.status === 'inprogress' ? 'In progress' : 'Start task'}</button>}
    </div>
    {!task.pending && <div className="task-menu-wrap"><button className="icon-button task-menu-trigger" aria-label={`Options for ${task.title}`} onClick={() => setMenu(!menu)} aria-expanded={menu}><MoreHorizontal size={19} /></button>{menu && <><button className="menu-dismiss" aria-label="Close task options" onClick={() => setMenu(false)} /><div className="task-menu">{!done && <button onClick={() => { setMenu(false); actions.edit(task); }}><Pencil size={14} /> Edit task</button>}<button className="danger-text" onClick={() => { setMenu(false); actions.remove(task); }}><Trash2 size={14} /> Delete task</button></div></>}</div>}
  </article>;
}
