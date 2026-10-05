import { useState, type FormEvent } from 'react';
import { CalendarDays, Coins, Flag } from 'lucide-react';
import Dialog from './Dialog';
import { deadlineFields, formatDeadline, resolveDeadline } from '../domain/dates';
import { EFFORT_REWARDS, type Effort, type Task, type TaskInput } from '../domain/state';

export default function TaskForm({ task, day, today, onSave, onClose }: {
  task: Task | null; day: string | null; today: string;
  onSave: (input: TaskInput) => void; onClose: () => void;
}) {
  const fields = deadlineFields(task?.deadline ?? null);
  const [title, setTitle] = useState(task?.title ?? '');
  const [note, setNote] = useState(task?.note ?? '');
  const [assignedDay, setAssignedDay] = useState(task ? task.assignedDay ?? '' : day ?? '');
  const [deadlineDate, setDeadlineDate] = useState(fields.date);
  const [deadlineTime, setDeadlineTime] = useState(fields.time);
  const [effort, setEffort] = useState<Effort>(task?.effort ?? 'small');
  const [category, setCategory] = useState<Task['category']>(task?.category ?? 'Personal');
  const deadline = resolveDeadline(deadlineDate, deadlineTime, today);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), note: note.trim(), assignedDay: assignedDay || null, deadline, effort, category });
  }

  return <Dialog title={task ? 'Edit task' : 'Make a little plan'} onClose={onClose}>
    <p className="dialog-intro">Big days start with small steps.</p>
    <form onSubmit={submit} className="task-form">
      <label>What would you like to do?<input autoFocus required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Finish the first draft" /></label>
      <label>Notes <span className="optional">optional</span><textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Anything you want to remember…" rows={2} /></label>
      <div className="form-row">
        <label><span className="label-icon"><CalendarDays size={15} /> Plan for</span><input type="date" value={assignedDay} onChange={event => setAssignedDay(event.target.value)} /></label>
        <label>Area<select value={category} onChange={event => setCategory(event.target.value as Task['category'])}><option>Personal</option><option>Work</option><option>Wellbeing</option></select></label>
      </div>
      <p className="field-hint">Leave “Plan for” empty to keep this task in your backlog.</p>
      <fieldset><legend><Flag size={15} /> Deadline <span className="optional">optional</span></legend>
        <div className="form-row"><label>Date<input type="date" value={deadlineDate} onChange={event => setDeadlineDate(event.target.value)} /></label><label>Time<input type="time" value={deadlineTime} onChange={event => setDeadlineTime(event.target.value)} /></label></div>
        <p className="field-hint">{deadline ? `Due ${formatDeadline(deadline)} · Singapore time · +5 coins on time` : 'No deadline. A time without a date uses today.'}</p>
      </fieldset>
      <fieldset><legend>How much effort?</legend><div className="effort-options">{(['small', 'medium', 'large'] as Effort[]).map(value => <label key={value} className={effort === value ? 'selected' : ''}><input type="radio" name="effort" value={value} checked={effort === value} onChange={() => setEffort(value)} /><span>{value}</span><small><Coins size={13} /> {EFFORT_REWARDS[value]}</small></label>)}</div></fieldset>
      <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" type="submit">{task ? 'Save changes' : 'Add task'}</button></div>
    </form>
  </Dialog>;
}
