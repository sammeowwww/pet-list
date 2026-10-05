import { useState } from 'react';
import { Check, Cloud, Coins, Heart, ListTodo, PawPrint, Repeat, Settings, ShoppingBag } from 'lucide-react';
import PetArt from './PetArt';
import Dialog from './Dialog';

export const TOUR_KEY = 'petlist:walkthrough:v1';
export function hasSeenTour(): boolean { try { return localStorage.getItem(TOUR_KEY) === 'seen'; } catch { return false; } }
export function rememberTour() { try { localStorage.setItem(TOUR_KEY, 'seen'); } catch { /* The tour is still usable without device storage. */ } }
const STEPS = [
  { title: 'Plan a little, every day', text: 'Today shows your planned tasks and overdue carryovers. Pick a day with the date selector, then add a task. Leave the date and deadline empty for a flexible General to-do.', icon: ListTodo, labels: ['MON 5', 'TUE 6', 'WED 7'], example: 'Water the plants' },
  { title: 'Every small win counts', text: 'Tap a task’s square to mark it in progress, then tap again to complete it. Every completed task earns 5 coins. Changed your mind? Undo is available for ten seconds.', icon: Coins, labels: ['To do', 'In progress', 'Completed'], example: '+5 coins · Undo' },
  { title: 'Find exactly what you need', text: 'Choose General for undated tasks, All categories for everything, or a specific category. All tasks and Completed work with any selection. Search names and notes; expand completed work or use All time for older history.', icon: ListTodo, labels: ['General ▾', 'All tasks', 'Completed'], example: 'Search tasks and notes' },
  { title: 'Build your own routine', text: 'Open Optional details when adding a task to choose Daily, Weekdays, or Selected weekdays. Choose a start date. Only one unfinished occurrence is kept; the next appears after completion’s undo window.', icon: Repeat, labels: ['MON', 'TUE', 'THU'], example: 'Repeat · Selected weekdays' },
  { title: 'A meal and a little love', text: 'A bone bubble means your pet is hungry. Tap the pet or use its Feed button. Feeding is free; the first three different pets fed each Singapore day give 3 coins each. A heart stays for ten seconds. Unfed pets remain hungry.', icon: Heart, labels: ['Hungry', 'Tap to feed', '+3 coins'], example: 'Bob is satisfied for today' },
  { title: 'Make your meadow yours', text: 'Spend your earned coins in Shop to meet Cinnamon, Snowy, and Donut or buy decorations. Bring up to three pets into the meadow. Use the decoration controls to place items; feeding pauses while decorating.', icon: ShoppingBag, labels: ['Pets', 'Decorations', '3 meadow spots'], example: 'Your own little living area' },
  { title: 'Your list, across devices', text: 'In Settings, sign in with the same Google account on your phone and laptop. Offline changes queue on your device and sync when you reconnect. If a change conflicts, Settings keeps it for review.', icon: Cloud, labels: ['Phone', 'Cloud sync', 'Laptop'], example: 'Offline edits → sync when connected' },
  { title: 'Set things up your way', text: 'Settings lets you choose a default category, add or rename categories, and move tasks to a replacement when removing one. Export a backup to keep a copy. You can replay this guide here anytime.', icon: Settings, labels: ['Categories', 'Preferences', 'Backups'], example: 'A list that fits your life' },
] as const;
function TourIllustration({ step }: { step: number }) {
  const content = STEPS[step];
  return <div className={`tour-illustration tour-scene-${step}`} role="img" aria-label={`Illustration: ${content.labels.join(', ')}, ${content.example}`}>
    <div className="tour-example-labels">{content.labels.map((label, index) => <span className={index === 0 ? 'highlight' : ''} key={label}>{label}</span>)}</div>
    {[4, 5].includes(step) ? <div className="tour-pets"><img src="/dog.png" alt="" /><span className="tour-heart">♥</span><div className="tour-pet-art"><PetArt pet="cat" /></div></div> : <div className="tour-example-card"><content.icon size={32} /><span>{content.example}</span>{step === 1 && <Check size={24} />}</div>}
    {[4, 5].includes(step) && <p>{content.example}</p>}
  </div>;
}
export default function Walkthrough({ welcome, onClose }: { welcome: boolean; onClose: () => void }) {
  const [started, setStarted] = useState(!welcome);
  const [step, setStep] = useState(0);
  if (!started) return <Dialog touchFocus="dialog" key="welcome" title="Welcome to PetList" onClose={onClose}><div className="tour-welcome"><PawPrint size={40} /><p>A little planning, a few small wins, and happy pixel pets.</p><img src="/dog.png" alt="Bob, your pixel dog companion" /></div><div className="dialog-actions"><button className="secondary-button" onClick={onClose}>Skip</button><button data-autofocus className="primary-button" onClick={() => setStarted(true)}>Start tour</button></div></Dialog>;
  const content = STEPS[step];
  return <Dialog touchFocus="dialog" key="guide" title="Your PetList guide" onClose={onClose}>
    <div className="tour-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}><span>Step {step + 1} of {STEPS.length}</span><progress value={step + 1} max={STEPS.length} /></div>
    <TourIllustration step={step} />
    <section className="tour-copy" aria-live="polite" aria-atomic="true"><h3>{content.title}</h3><p>{content.text}</p></section>
    <div className="tour-controls"><button className="text-button" onClick={onClose}>Skip</button><div><button className="secondary-button" disabled={step === 0} onClick={() => setStep(current => current - 1)}>Back</button><button data-autofocus className="primary-button" onClick={() => step === STEPS.length - 1 ? onClose() : setStep(current => current + 1)}>{step === STEPS.length - 1 ? 'Done' : 'Next'}</button></div></div>
  </Dialog>;
}
