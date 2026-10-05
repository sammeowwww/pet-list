import { useState, type FormEvent } from 'react';
import { Coins } from 'lucide-react';
import { useCategories } from './CategoryContext';
import Dialog from './Dialog';
import { deadlineFields, formatDay, formatDeadline, resolveDeadline } from '../domain/dates';
import { type RepeatRule } from '../domain/repeat';
import { TASK_REWARD, type Task, type TaskInput } from '../domain/state';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TaskForm({ task, day, today, defaultCategory, onSave, onClose }: {
  task: Task | null; day: string | null; today: string; defaultCategory: Task['category'];
  onSave: (input: TaskInput) => void; onClose: () => void;
}) {
  const categories = useCategories();
  const fields = deadlineFields(task?.deadline ?? null);
  const [title, setTitle] = useState(task?.title ?? '');
  const [category, setCategory] = useState<Task['category']>(task?.category ?? defaultCategory);
  const [note, setNote] = useState(task?.note ?? '');
  const [assignedDay, setAssignedDay] = useState(task ? task.assignedDay ?? '' : day ?? '');
  const [deadlineDate, setDeadlineDate] = useState(fields.date);
  const [deadlineTime, setDeadlineTime] = useState(fields.time);

  const [repeatMode, setRepeatMode] = useState<RepeatRule['mode'] | 'never'>(task?.repeat?.mode ?? 'never');
  const [repeatDays, setRepeatDays] = useState<number[]>(task?.repeat?.days ?? []);
  const repeating = repeatMode !== 'never';
  const deadline = repeating ? (deadlineTime ? resolveDeadline(assignedDay || today, deadlineTime, today) : null) : resolveDeadline(deadlineDate, deadlineTime, today);
  const plannedLabel = assignedDay ? formatDay(assignedDay, { weekday: 'short', day: 'numeric', month: 'short' }) : 'General';

  function changeRepeat(mode: typeof repeatMode) {
    setRepeatMode(mode);
    if (mode !== 'never' && !assignedDay) setAssignedDay(today);
  }

  function toggleWeekday(day: number, checked: boolean) {
    setRepeatDays(current => checked ? [...current, day].sort() : current.filter(value => value !== day));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || (repeatMode === 'selected' && !repeatDays.length)) return;
    onSave({ title: title.trim(), category, note: note.trim(), assignedDay: assignedDay || null, deadline, repeat: repeating ? { mode: repeatMode, days: repeatDays } : null });
  }

  return <Dialog title={task ? 'Edit task' : 'What needs doing?'} onClose={onClose}>
    <p className="eyebrow">{task ? 'A LITTLE ADJUSTMENT' : 'NEW TASK'}</p>
    <form className="task-form" onSubmit={submit}>
      <label>Task name<input data-autofocus required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Water the plants" /></label>
      <label>Category<select aria-label="Category" value={category} onChange={event => setCategory(event.target.value as Task['category'])}>{categories.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
      <details className="optional-details"><summary>Optional details <span>date, repeat, deadline & notes</span></summary><div className="details-content">
        <label>{repeating ? 'Start date' : 'Plan for'}<input required={repeating} type="date" value={assignedDay} onChange={event => setAssignedDay(event.target.value)} /></label>
        {!repeating && <p className="field-hint">Leave both the planned date and deadline empty to keep this task in General.</p>}
        <label>Repeat<select aria-label="Repeat" value={repeatMode} onChange={event => changeRepeat(event.target.value as typeof repeatMode)}><option value="never">Never</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="selected">Selected weekdays</option></select></label>
        {repeatMode === 'selected' && <fieldset><legend>Repeat on</legend><div className="weekday-choices">{[1, 2, 3, 4, 5, 6, 0].map(value => <label key={value}><input type="checkbox" checked={repeatDays.includes(value)} onChange={event => toggleWeekday(value, event.target.checked)} />{WEEKDAYS[value]}</label>)}</div>{!repeatDays.length && <p role="alert" className="field-hint">Choose at least one weekday.</p>}</fieldset>}
        {repeating && <p className="field-hint">One task at a time. The next appears after your ten-second undo window, on the next eligible day after completion.</p>}
        <fieldset><legend>Deadline <span>optional</span></legend><div className="form-row">
          {!repeating && <label>Date<input type="date" value={deadlineDate} onChange={event => setDeadlineDate(event.target.value)} /></label>}
          <label>Time<input type="time" value={deadlineTime} onChange={event => setDeadlineTime(event.target.value)} /></label>
        </div><p className="field-hint">{repeating ? 'Optional time on each planned day · Singapore time' : deadline ? `Due ${formatDeadline(deadline)} · Singapore time` : 'A time without a date uses today. A date without a time ends at 23:59:59.'}</p></fieldset>
        <label>Notes<textarea rows={2} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Anything you want to remember" /></label>
      </div></details>
      <div className="modal-info"><Coins size={18} /><span>Completing this task earns <b>{TASK_REWARD} coins</b></span></div>
      <button className="primary-button full" type="submit" disabled={repeatMode === 'selected' && !repeatDays.length}>{task ? 'Save changes' : `Add to ${plannedLabel}`}</button>
    </form>
  </Dialog>;
}
