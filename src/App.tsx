import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Coins,
  ListTodo,
  House,
  PawPrint,
  RotateCcw,
  Settings,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import { CategoryContext } from './components/CategoryContext';
import Walkthrough, {
  hasSeenTour,
  rememberTour,
} from './components/Walkthrough';
import HomePage from './components/HomePage';
import TasksPage from './components/TasksPage';
import MonthCalendar from './components/MonthCalendar';
import HistoryPage from './components/HistoryPage';
import ShopPage from './components/ShopPage';
import SettingsDialog from './components/SettingsDialog';
import TaskForm from './components/TaskForm';
import Dialog from './components/Dialog';
import type { TaskActions } from './components/TaskRow';
import { usePlannerState } from './hooks/usePlannerState';
import { localDay } from './domain/dates';
import { completionStreak } from './domain/progress';
import {
  activeCelebration,
  addCelebration,
  cancelCelebration,
  type CelebrationEvent,
} from './domain/celebration';
import {
  rewardFor,
  type AppState,
  type ItemId,
  type Placement,
  type Task,
  type TaskInput,
  type PetId,
} from './domain/state';
import { taskFields, type Command } from './domain/commands';

type Tab = 'today' | 'calendar' | 'tasks' | 'home' | 'shop' | 'settings';
type Editor = { task: Task | null; day: string | null; before?: Task };
const NAVIGATION = [
  { id: 'today', label: 'Today', icon: Check },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'home', label: 'Home', icon: House },
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export default function App() {
  const planner = usePlannerState();
  const { state, dispatch, now, error, setError } = planner;
  const [tour, setTour] = useState<'welcome' | 'replay' | null>(() =>
    hasSeenTour() ? null : 'welcome',
  );
  function closeTour() {
    rememberTour();
    setTour(null);
  }
  const [hearts, setHearts] = useState<Partial<Record<PetId, number>>>({});
  const today = localDay(now);
  const [taskScope, setTaskScope] = useState('all');
  const [tab, setTab] = useState<Tab>('home');
  const [day, setDay] = useState(today);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [toast, setToast] = useState<{
    id: string;
    reward: number;
    expiresAt: number;
  } | null>(null);
  const [events, setEvents] = useState<CelebrationEvent[]>([]);
  const [decorating, setDecorating] = useState(false);
  const [selected, setSelected] = useState<ItemId | null>(null);
  const previousToday = useRef(today);
  const celebration = activeCelebration(events, now);
  const streak = completionStreak(state.tasks, today);
  const pendingToast =
    toast &&
    toast.expiresAt > now &&
    state.tasks.some((task) => task.id === toast.id && task.pending);

  useEffect(() => {
    if (previousToday.current === today) return;
    const previous = previousToday.current;
    setDay((current) => (current === previous ? today : current));
    previousToday.current = today;
  }, [today]);

  function openDay(date: string) {
    setDay(date);
    setTab('today');
  }
  function selectTab(next: Tab) {
    if (next === 'tasks') setTaskScope('all');
    if (next === 'today') setDay(today);
    setTab(next);
  }
  function addTask(date: string | null) {
    setEditor({ task: null, day: date });
  }

  function finish(id: string) {
    const task = state.tasks.find((task) => task.id === id);
    if (!task || task.status === 'done') return;
    const timestamp = Date.now();
    if (!dispatch({ kind: 'complete', taskId: id })) return;
    setToast({
      id,
      reward: rewardFor(task, timestamp),
      expiresAt: timestamp + 10_000,
    });
    setEvents((current) => addCelebration(current, id, timestamp));
  }

  function undo(id: string) {
    const task = state.tasks.find((task) => task.id === id);
    if (!task?.pending || Date.now() >= task.pending.expiresAt) return;
    if (
      !dispatch({ kind: 'undo', taskId: id, completionId: task.completionId })
    )
      return;
    setToast((current) => (current?.id === id ? null : current));
    setEvents((current) => cancelCelebration(current, id));
  }

  function saveTask(input: TaskInput) {
    const edited = editor?.task;
    const saved = edited
      ? dispatch({
          kind: 'edit',
          taskId: edited.id,
          before: taskFields(editor?.before ?? edited),
          input,
        })
      : dispatch({ kind: 'create', taskId: crypto.randomUUID(), input });
    if (!saved) return;
    setEditor(null);
  }

  function replaceState(next: AppState) {
    if (
      dispatch({
        kind: 'replace',
        state: next,
        expectedRevision: planner.revision,
      })
    ) {
      setError(null);
      setToast(null);
      setEvents([]);
    }
  }

  function feed(pet: PetId) {
    if (!dispatch({ kind: 'feed', pet })) return;
    setHearts((current) => ({ ...current, [pet]: Date.now() }));
  }

  function placeDecoration(id: ItemId, position: Placement | null) {
    dispatch({ kind: 'place', item: id, position });
  }

  function beginDecorating() {
    setTab('home');
    setDecorating(true);
  }

  function reviewConflict(command: Command) {
    const action = command.action;
    if (action.kind !== 'edit') return;
    const current = state.tasks.find((task) => task.id === action.taskId);
    if (!current || current.status === 'done') {
      setError(
        'The task is no longer editable. Your rejected edit remains in Settings.',
      );
      return;
    }
    setEditor({
      task: { ...current, ...action.input },
      before: current,
      day: current.assignedDay,
    });
    setTab('home');
  }

  const actions: TaskActions = {
    complete: finish,
    undo,
    status: (id, status) => {
      const task = state.tasks.find((task) => task.id === id);
      if (task && task.status !== 'done')
        dispatch({ kind: 'status', taskId: id, status, previous: task.status });
    },
    edit: (task) => setEditor({ task, day: task.assignedDay }),
    remove: setDeleting,
  };

  return (
    <CategoryContext.Provider value={state.categories}>
      <div className="app-shell">
        <header className="topbar">
          <button
            className="brand"
            onClick={() => setTab('home')}
            aria-label="PetList home"
          >
            <span className="brand-mark">
              <PawPrint size={22} />
            </span>
            <span>PetList</span>
          </button>
          <div className="top-actions">
            <div className="streak">
              <Sparkles size={17} />
              <span>
                <b>{streak}</b> day streak
              </span>
            </div>
            <div
              className="balance"
              aria-label={`${state.coins} coins`}
            >
              <span
                className="coin-dot"
                aria-hidden="true"
              >
                $
              </span>
              <b>{state.coins}</b>
            </div>
            <button
              className="avatar"
              aria-label="Settings and backups"
              onClick={() => setTab('settings')}
            >
              <Settings size={19} />
            </button>
          </div>
        </header>
        <main>
          {planner.session.user && (
            <button
              className="sync-banner"
              onClick={() => setTab('settings')}
            >
              {!planner.online
                ? 'Offline · changes saved on this device'
                : planner.queued
                  ? `${planner.queued} change(s) waiting to sync`
                  : planner.syncError
                    ? 'Sync needs attention · open settings'
                    : 'Cloud planner · synced across your devices'}
            </button>
          )}
          {error && (
            <div
              className="error-banner"
              role="alert"
            >
              <p>{error}</p>
              <button
                className="text-button"
                onClick={() => setTab('settings')}
              >
                Open settings
              </button>
            </div>
          )}
          {tab === 'home' && (
            <HomePage
              state={state}
              now={now}
              actions={actions}
              onAdd={() => addTask(today)}
              onAddGeneral={() => addTask(null)}
              onGeneral={() => {
                setTaskScope('general');
                setTab('tasks');
              }}
              onDay={openDay}
              onShop={() => setTab('shop')}
              celebration={celebration}
              onClaim={() => dispatch({ kind: 'bonus' })}
              hearts={hearts}
              onFeed={feed}
              onActive={(pet, active) =>
                dispatch({ kind: 'activatePet', pet, active })
              }
              decorating={decorating}
              setDecorating={setDecorating}
              selected={selected}
              setSelected={setSelected}
              onPlace={placeDecoration}
            />
          )}
          {tab === 'today' && (
            <TasksPage
              key={tab}
              state={state}
              now={now}
              day={day}
              onSelect={setDay}
              actions={actions}
              onAdd={addTask}
              onCalendar={() => setTab('calendar')}
            />
          )}
          {tab === 'calendar' && (
            <MonthCalendar
              state={state}
              now={now}
              day={day}
              onSelect={setDay}
              onBack={() => setTab('today')}
              onAdd={addTask}
              actions={actions}
            />
          )}
          {tab === 'tasks' && (
            <HistoryPage
              key={taskScope}
              initialScope={taskScope}
              state={state}
              now={now}
              actions={actions}
              onAdd={() => addTask(null)}
            />
          )}
          {tab === 'shop' && (
            <ShopPage
              state={state}
              onBuy={(id) => dispatch({ kind: 'buyItem', item: id })}
              onBuyPet={(pet) => dispatch({ kind: 'buyPet', pet })}
              onDecorate={beginDecorating}
            />
          )}
        </main>
        <nav
          className="bottom-nav"
          aria-label="Main navigation"
        >
          {NAVIGATION.map((item) => (
            <button
              key={item.id}
              className={`${tab === item.id || (tab === 'calendar' && item.id === 'today') ? 'active' : ''} ${item.id === 'home' ? 'home-button' : ''}`}
              onClick={() => selectTab(item.id)}
              aria-current={
                tab === item.id || (tab === 'calendar' && item.id === 'today')
                  ? 'page'
                  : undefined
              }
            >
              <span>
                <item.icon size={21} />
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        {pendingToast && toast && (
          <div
            className="completion-toast"
            role="status"
          >
            <img
              src="/dog.png"
              alt=""
            />
            <div>
              <b>A little win!</b>
              <span>
                <Coins size={13} /> +{toast.reward} coins ·{' '}
                {Math.max(1, Math.ceil((toast.expiresAt - now) / 1000))}s to
                undo
              </span>
            </div>
            <button
              className="text-button"
              onClick={() => undo(toast.id)}
            >
              <RotateCcw size={13} /> Undo
            </button>
            <button
              className="icon-button"
              aria-label="Dismiss reward message"
              onClick={() => setToast(null)}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {editor && (
          <TaskForm
            task={editor.task}
            day={editor.day}
            today={today}
            defaultCategory={state.preferences.defaultCategory}
            onSave={saveTask}
            onClose={() => setEditor(null)}
          />
        )}
        {deleting && (
          <Dialog
            title="Delete this task?"
            onClose={() => setDeleting(null)}
          >
            <p className="dialog-intro">
              “{deleting.title}” will be removed from your planner
              {deleting.seriesId && deleting.status !== 'done'
                ? ' and repetition will stop. Completed occurrences will stay.'
                : deleting.status === 'done'
                  ? ' and history. Coins already earned are yours to keep.'
                  : '.'}
            </p>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setDeleting(null)}
              >
                Keep task
              </button>
              <button
                className="primary-button danger"
                onClick={() => {
                  dispatch({
                    kind: 'delete',
                    taskId: deleting.id,
                    before: deleting,
                  });
                  setDeleting(null);
                }}
              >
                Delete task
              </button>
            </div>
          </Dialog>
        )}
        {tab === 'settings' && (
          <SettingsDialog
            planner={planner}
            onTour={() => setTour('replay')}
            onReview={reviewConflict}
            state={state}
            error={error}
            onReplace={replaceState}
            onError={setError}
            onClose={() => setTab('home')}
          />
        )}
        {tour && (
          <Walkthrough
            welcome={tour === 'welcome'}
            onClose={closeTour}
          />
        )}
      </div>
    </CategoryContext.Provider>
  );
}
