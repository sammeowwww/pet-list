import { Check, Gift, Grid2X2, Plus, ShoppingBag, X } from 'lucide-react';
import { formatDay, localDay } from '../domain/dates';
import { percentComplete } from '../domain/progress';
import { dailyBonusAvailable, generalTasks, tasksForDay, type AppState, type ItemId, type Placement, type PetId } from '../domain/state';
import type { CelebrationEvent } from '../domain/celebration';
import MeadowScene from './MeadowScene';
import Inventory from './Inventory';
import PetPanel from './PetPanel';
import TaskRow, { type TaskActions } from './TaskRow';

export default function HomePage({ state, now, actions, onAdd, onAddGeneral, onGeneral, onDay, onShop, celebration, onClaim, decorating, setDecorating, selected, setSelected, onPlace, hearts, onFeed, onActive }: {
  state: AppState; now: number; actions: TaskActions; onAdd: () => void; onAddGeneral: () => void; onGeneral: () => void; onDay: (day: string) => void;
  onShop: () => void; celebration: CelebrationEvent | null; onClaim: () => void;
  decorating: boolean; setDecorating: (value: boolean) => void; selected: ItemId | null; setSelected: (id: ItemId) => void;
  hearts: Partial<Record<PetId, number>>; onFeed: (pet: PetId) => void; onActive: (pet: PetId, active: boolean) => void;
  onPlace: (id: ItemId, cell: Placement | null) => void;
}) {
  const today = localDay(now);
  const todayTasks = tasksForDay(state.tasks, today, today, now);
  const completed = todayTasks.filter(task => task.status === 'done').length;
  const general = generalTasks(state.tasks);
  const bonusAvailable = dailyBonusAvailable(state, now);
  const claimed = state.bonusDays.includes(today);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: 'numeric', hourCycle: 'h23' }).format(now));
  const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';

  return <div className="page home-page">
    <section className="welcome"><div><p className="eyebrow">{formatDay(today, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</p><h1>{greeting}</h1><p>Your little companion is ready for a productive day.</p></div><button className="primary-button" aria-label="Add task" onClick={onAdd}><Plus size={19} /> Add task</button></section>
    <div className="home-grid"><section className="game-card meadow-card">
      <MeadowScene hearts={hearts} onFeed={onFeed} state={state} now={now} celebration={celebration} decorating={decorating} selected={selected} onPlace={onPlace} />
      <div className="scene-caption"><div><span className="online-dot" /><b>{decorating ? 'Make the meadow yours' : celebration ? 'Your pets are celebrating your little win!' : 'A little space for your companions'}</b><p>{decorating ? 'Choose an item below, then a spot in the field.' : 'Complete a task to earn coins for your meadow.'}</p></div><div className="scene-footer-actions"><button aria-label={decorating ? 'Finish decorating' : 'Decorate'} onClick={() => setDecorating(!decorating)}>{decorating ? <X size={18} /> : <Grid2X2 size={18} />}</button><button onClick={onShop} aria-label="Visit shop"><ShoppingBag size={18} /><span>Visit shop</span></button></div></div>
    </section><section className="today-card"><div className="section-heading"><div><p className="eyebrow">TODAY’S PLAN</p><h2>{completed} of {todayTasks.length} complete</h2></div><button className="text-button" onClick={() => onDay(today)}>View all →</button></div><div className="progress-track"><span style={{ width: `${percentComplete(todayTasks)}%` }} /></div><div className="task-list">{todayTasks.slice(0, 4).map(task => <TaskRow key={task.id} task={task} now={now} actions={actions} />)}</div>{!todayTasks.length && <div className="home-empty"><h3>A little plan goes a long way</h3><p>Add a task and give today a small beginning.</p><button className="text-button" onClick={onAdd}>+ Plan your first task</button></div>}
      <div className="daily-bonus"><Gift size={20} /><div><b>{claimed ? 'Today’s bonus is yours' : 'A little extra for finishing your day'}</b><span>{claimed ? 'Tomorrow is a new page.' : 'Complete today’s list to earn 10 bonus coins.'}</span></div><button disabled={!bonusAvailable} onClick={onClaim} aria-label={claimed ? 'Daily bonus claimed' : 'Claim daily bonus'}>{claimed ? <Check size={17} /> : 'Claim'}</button></div>
    </section></div>
    {decorating && <Inventory state={state} selected={selected} onSelect={setSelected} onStore={id => onPlace(id, null)} onShop={onShop} />}
    <PetPanel state={state} now={now} onFeed={onFeed} onActive={onActive} onShop={onShop} />
    <section className="general-card"><div className="section-heading"><div><p className="eyebrow">AT YOUR OWN PACE</p><h2>General to-dos</h2></div><div className="settings-actions"><button className="secondary-button" aria-label="Add general task" onClick={onAddGeneral}><Plus size={16} /> Add task</button><button className="text-button" onClick={onGeneral}>View all →</button></div></div><div className="task-list">{general.slice(0, 5).map(task => <TaskRow key={task.id} task={task} now={now} actions={actions} />)}</div>{!general.length && <p className="field-hint">Keep flexible tasks here, without a date or deadline.</p>}</section>
  </div>;
}
