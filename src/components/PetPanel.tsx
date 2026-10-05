import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PET_CATALOG, type AppState, type PetId } from '../domain/state';
import { isHungry } from '../domain/pets';
import { localDay } from '../domain/dates';
import PetArt from './PetArt';

export default function PetPanel({ state, now, onFeed, onActive, onShop }: {
  state: AppState; now: number; onFeed: (pet: PetId) => void;
  onActive: (pet: PetId, active: boolean) => void; onShop: () => void;
}) {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('petlist:companions:collapsed') === 'true'; } catch { return false; } });
  function toggle() { setCollapsed(current => { const next = !current; try { localStorage.setItem('petlist:companions:collapsed', String(next)); } catch { /* Local choice only. */ } return next; }); }
  const hungryCount = state.pets.active.filter(pet => isHungry(state, pet, now)).length;
  const gifts = state.pets.gifts[localDay(now)] ?? [];
  return <section className="pet-panel"><div className="section-heading"><div><div className="companion-heading"><p className="eyebrow">YOUR COMPANIONS</p><button className="icon-button" aria-label={collapsed ? 'Expand companions' : 'Minimise companions'} aria-expanded={!collapsed} aria-controls="companion-cards" onClick={toggle}>{collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}</button></div><h2>{state.pets.active.length} of 3 meadow spots</h2></div><button className="text-button" onClick={onShop}>Meet more pets →</button></div>
    <p className="hunger-summary">{hungryCount ? `${hungryCount} ${hungryCount === 1 ? 'pet is' : 'pets are'} hungry` : 'All meadow pets are satisfied'}</p>
    <div id="companion-cards" hidden={collapsed}><p>Feeding is free. The first three different pets fed each day give you 3 coins each.</p>
    <div className="pet-grid">{PET_CATALOG.filter(pet => state.pets.owned.includes(pet.id)).map(pet => {
      const active = state.pets.active.includes(pet.id); const hungry = isHungry(state, pet.id, now);
      return <article className="pet-card" key={pet.id}><div className="pet-portrait"><PetArt pet={pet.id} moving={false} happy={false} facing="right" now={now} excited={false} /></div><div><h3>{pet.name}</h3><p>{hungry ? 'Hungry · ready for a meal' : 'Satisfied for today'}</p></div><div className="pet-controls"><button className="primary-button" disabled={!active || !hungry} onClick={() => onFeed(pet.id)}>{!hungry ? 'Fed today' : gifts.length < 3 ? 'Feed · +3 coins' : 'Feed · free'}</button><button className="text-button" disabled={!active && state.pets.active.length >= 3} onClick={() => onActive(pet.id, !active)}>{active ? 'Rest in collection' : 'Bring to meadow'}</button></div></article>;
    })}</div></div></section>;
}
