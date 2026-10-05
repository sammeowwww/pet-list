import { useEffect, useRef, useState } from 'react';
import { CalendarDays, CalendarRange, Check, Coins, Download, Home as HomeIcon, Leaf, PawPrint, RotateCcw, Settings, Upload, X } from 'lucide-react';
import { DayPlanner, WeekPlanner } from './components/Planner';
import Home from './components/Home';
import Dialog from './components/Dialog';
import TaskForm from './components/TaskForm';
import { type TaskActions } from './components/TaskCard';
import { formatDay, localDay } from './domain/dates';
import { buyItem, claimBonus, completeTask, createTask, editTask, emptyState, placeItem, removeTask, rewardFor, setTaskStatus, settleRewards, STORAGE_KEY, undoTask, type AppState, type Task, type TaskInput } from './domain/state';
import { exportBackup, parseBackup, persistState, readState } from './domain/storage';
import { exampleState } from './domain/examples';

type Tab = 'day' | 'home' | 'week';
type Editor = { task: Task | null; day: string | null };

export default function App() {
  const [initial] = useState(readState);
  const [state, setState] = useState(initial.state);
  const [saveBlocked, setSaveBlocked] = useState(initial.error !== null);
  const [error, setError] = useState<string | null>(initial.error);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<Tab>('day');
  const [day, setDay] = useState(localDay());
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [settings, setSettings] = useState(false);
  const [toast, setToast] = useState<{ id: string; title: string; reward: number; expiresAt: number } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const today = localDay(now);
  const previousToday = useRef(today);

  useEffect(() => {
    if (saveBlocked) return;
    if (!persistState(state)) setError('Your latest changes could not be saved. Export a backup from Settings before closing this page.');
    else setError(null);
  }, [state, saveBlocked]);

  useEffect(() => {
    const timer = setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      setState(current => settleRewards(current, timestamp));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (previousToday.current !== today) {
      setDay(current => current === previousToday.current ? today : current);
      previousToday.current = today;
    }
  }, [today]);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setState(parseBackup(event.newValue));
      } catch {
        setError('Another tab saved data this version cannot read. Export your current progress before reloading.');
        setSaveBlocked(true);
      }
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(false), 2500);
    return () => clearTimeout(timer);
  }, [celebrate]);

  function openDay(date: string) { setDay(date); setTab('day'); }
  function goToday() { openDay(today); }

  function finish(id: string) {
    const task = state.tasks.find(task => task.id === id);
    if (!task || task.status === 'done') return;
    const timestamp = Date.now();
    setState(current => completeTask(current, id, timestamp));
    setToast({ id, title: task.title, reward: rewardFor(task, timestamp), expiresAt: timestamp + 10_000 });
    setCelebrate(true);
  }

  function undo(id: string) {
    setState(current => undoTask(current, id, Date.now()));
    setToast(current => current?.id === id ? null : current);
    setCelebrate(false);
  }

  function saveTask(input: TaskInput) {
    setState(current => editor?.task ? editTask(current, editor.task.id, input) : { ...current, tasks: [...current.tasks, createTask(input)] });
    setEditor(null);
  }

  function replaceState(next: AppState) {
    setState(next);
    setSaveBlocked(false);
    setError(null);
    setToast(null);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('File too large');
      const next = parseBackup(await file.text());
      if (window.confirm('Replace your current planner with this backup? Export your current data first if you want to keep it.')) replaceState(next);
    } catch {
      setError('This backup could not be imported. Choose a valid Little by Little JSON backup. Your current progress is unchanged.');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  }

  const actions: TaskActions = {
    complete: finish, undo,
    status: (id, status) => setState(current => setTaskStatus(current, id, status)),
    edit: task => setEditor({ task, day: task.assignedDay }), remove: setDeleting,
  };
  const plannerProps = { state, now, day, setDay, actions, addTask: (date: string | null) => setEditor({ task: null, day: date }), goHome: () => setTab('home') };
  const toastVisible = toast !== null && now < toast.expiresAt && state.tasks.some(task => task.id === toast.id && task.pending);

  return <div className="app-shell">
    <header className="app-header"><button className="brand" onClick={goToday} aria-label="Little by Little, go to today"><span className="brand-mark"><PawPrint size={22} fill="currentColor" /></span><span>little by little<small>A LITTLE PLAN. A LITTLE PROGRESS.</small></span></button><div className="header-actions"><span className="header-date">{formatDay(today, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span className="coin-balance" aria-label={`${state.coins} coins`}><Coins size={16} /><strong>{state.coins}</strong><span>coins</span></span><button className="icon-button settings-button" aria-label="Settings and backups" onClick={() => setSettings(true)}><Settings size={19} /></button></div></header>
    <main className={tab === 'week' ? 'wide-page' : ''}>{error && <div className="error-banner" role="alert"><p>{error}</p><button className="text-button" onClick={() => setSettings(true)}>Open settings</button></div>}
      {tab === 'day' && <DayPlanner {...plannerProps} />}
      {tab === 'week' && <WeekPlanner {...plannerProps} openDay={openDay} />}
      {tab === 'home' && <Home state={state} now={now} onBuy={id => setState(current => buyItem(current, id))} onPlace={(id, position) => setState(current => placeItem(current, id, position))} onClaim={() => setState(current => claimBonus(current, Date.now()))} goTasks={goToday} />}
    </main>
    <footer className="page-footer"><span><Leaf size={13} /> Little steps add up.</span><span>Made for your everyday.</span></footer>
    <nav className="bottom-nav" aria-label="Main navigation">{([{ id: 'day', label: 'Day', icon: CalendarDays }, { id: 'home', label: 'Home', icon: HomeIcon }, { id: 'week', label: 'Week', icon: CalendarRange }] as const).map(item => <button key={item.id} className={`${tab === item.id ? 'active' : ''} ${item.id === 'home' ? 'home-nav' : ''}`} onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}><item.icon size={21} strokeWidth={1.7} /><span>{item.label}</span>{tab === item.id && <i />}</button>)}</nav>
    {toastVisible && <div className="completion-toast" role="status"><div className="toast-dog"><img src="/dog.png" alt="" /></div><div><strong>A little win. Nicely done!</strong><span>+{toast.reward} coins <span className="toast-pending">· settling in {Math.max(1, Math.ceil((toast.expiresAt - now) / 1000))}s</span></span></div><button onClick={() => undo(toast.id)}><RotateCcw size={14} /> Undo</button><button className="icon-button" aria-label="Dismiss reward message" onClick={() => setToast(null)}><X size={15} /></button></div>}
    {celebrate && <div className="little-celebration" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <span key={index} style={{ '--i': index } as React.CSSProperties}>✦</span>)}</div>}
    {editor && <TaskForm task={editor.task} day={editor.day} today={today} onSave={saveTask} onClose={() => setEditor(null)} />}
    {deleting && <Dialog title="Delete this task?" onClose={() => setDeleting(null)}><p className="dialog-intro">“{deleting.title}” will be removed from your planner{deleting.status === 'done' ? ' and completed history. Coins already earned are yours to keep.' : '.'}</p><div className="dialog-actions"><button className="button secondary" onClick={() => setDeleting(null)}>Keep task</button><button className="button danger" onClick={() => { setState(current => removeTask(current, deleting.id)); setDeleting(null); }}>Delete task</button></div></Dialog>}
    {settings && <Dialog title="A few little settings" onClose={() => setSettings(false)}><p className="dialog-intro">Your planner is saved in this browser on this device. Dates and daily rewards use Singapore time.</p><section className="settings-section"><h3>Keep a copy of your progress</h3><p>Export a backup before clearing browser data or switching devices.</p><div className="settings-actions"><button className="button secondary" onClick={() => exportBackup(state)}><Download size={15} /> Export backup</button><button className="button secondary" onClick={() => importRef.current?.click()}><Upload size={15} /> Import backup</button><input ref={importRef} type="file" accept=".json,application/json" hidden onChange={event => void importFile(event.target.files?.[0])} /></div></section><section className="settings-section"><h3>Explore the idea</h3><p>Load an example week with sample tasks and a previous completion. This replaces your current planner.</p><button className="button secondary" onClick={() => { if (window.confirm('Replace your planner with example tasks? Export your current progress first if you want to keep it.')) { replaceState(exampleState(Date.now())); setSettings(false); goToday(); } }}>Try an example week</button></section><section className="settings-section"><h3>Start with a clean page</h3><p>Remove tasks, coins, and decorations from this browser.</p><button className="text-button danger-text" onClick={() => { if (window.confirm('Clear all tasks, coins, and decorations? This cannot be undone without a backup.')) { replaceState(emptyState()); setSettings(false); goToday(); } }}>Reset planner</button></section>{!error && <p className="saved-note"><Check size={14} /> Saved automatically on this device</p>}</Dialog>}
  </div>;
}
