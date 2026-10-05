import { Check, Clock3, MoreHorizontal, Pencil, Play, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { localDay, formatDeadline } from '../domain/dates';
import { EFFORT_REWARDS, isOverdue, type Task } from '../domain/state';

export type TaskActions = {
  complete: (id: string) => void; undo: (id: string) => void;
  status: (id: string, status: 'todo' | 'inprogress') => void;
  edit: (task: Task) => void; remove: (task: Task) => void;
};

export function Coin({ amount }: { amount: number }) {
  return <span className="coin"><span className="coin-dot" aria-hidden="true">$</span>{amount}</span>;
}

export default function TaskRow({ task, now, actions, showStatus = false }: { task: Task; now: number; actions: TaskActions; showStatus?: boolean }) {
  const [menu, setMenu] = useState(false);
  const future = !!task.seriesId && !!task.assignedDay && task.assignedDay > localDay(now);
  const done = task.status === 'done';
  const progress = task.status === 'inprogress';
  const overdue = isOverdue(task, now);
  const reward = done ? task.reward : EFFORT_REWARDS[task.effort];
  const statusLabel = done ? `Completed ${task.title}` : progress ? `Complete ${task.title}` : `Start ${task.title}`;

  function advanceStatus() {
    if (progress) actions.complete(task.id);
    else actions.status(task.id, 'inprogress');
  }

  return <article className={`task-row ${progress ? 'progress' : task.status}`} data-task-id={task.id}>
    <button className="status-button" disabled={done || (future && progress)} aria-label={statusLabel} onClick={advanceStatus}>
      {done ? <Check size={17} /> : progress ? <span className="progress-square" /> : null}
    </button>
    <div className="task-copy">
      <h3>{task.title}</h3>
      <div className="task-tags"><span className={`category ${task.category.toLowerCase()}`}>{task.category}</span>
        {task.repeat && <span className="repeat-label">{future ? 'Upcoming · ' : ''}Repeats</span>}
        {showStatus && <span>{done ? 'Completed' : progress ? 'In progress' : 'To do'}</span>}
        {task.deadline && <span className={`deadline-label ${overdue ? 'overdue' : ''}`}><Clock3 size={12} />{overdue ? 'Overdue · ' : ''}{formatDeadline(task.deadline)}</span>}
      </div>
      {task.note && <p className="task-note">{task.note}</p>}
      {task.pending && <button className="undo-task" onClick={() => actions.undo(task.id)}><RotateCcw size={12} /> Undo · {Math.max(1, Math.ceil((task.pending.expiresAt - now) / 1000))}s</button>}
    </div>
    {progress && !showStatus && <span className="status-label"><Clock3 size={14} /> In progress</span>}
    <Coin amount={reward} />
    {!task.pending && <div className="task-options"><button className="icon-button" aria-label={`Options for ${task.title}`} onClick={() => setMenu(!menu)} aria-expanded={menu}><MoreHorizontal size={17} /></button>
      {menu && <><button className="menu-dismiss" aria-label="Close task options" onClick={() => setMenu(false)} />
        <div className="task-menu">
          {!done && <><button disabled={future} onClick={() => { actions.complete(task.id); setMenu(false); }}><Check size={14} /> Mark done</button><button onClick={() => { actions.edit(task); setMenu(false); }}><Pencil size={14} /> Edit task</button></>}
          {progress && <button onClick={() => { actions.status(task.id, 'todo'); setMenu(false); }}><Play size={14} /> Back to to do</button>}
          <button className="danger-text" onClick={() => { actions.remove(task); setMenu(false); }}><Trash2 size={14} /> Delete task</button>
        </div>
      </>}
    </div>}
  </article>;
}
