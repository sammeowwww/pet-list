import { ChevronDown, ChevronUp } from 'lucide-react';
import { PET_CATALOG, type AppState, type PetId } from '../domain/state';
import { isHungry } from '../domain/pets';
import { localDay } from '../domain/dates';
import PetArt from './PetArt';

function PetCard({
  pet,
  state,
  now,
  giftsUsed,
  onFeed,
  onActive,
}: {
  pet: (typeof PET_CATALOG)[number];
  state: AppState;
  now: number;
  giftsUsed: number;
  onFeed: (pet: PetId) => void;
  onActive: (pet: PetId, active: boolean) => void;
}) {
  const active = state.pets.active.includes(pet.id);
  const hungry = isHungry(state, pet.id, now);
  const feedLabel = !hungry
    ? 'Fed today'
    : giftsUsed < 3
      ? 'Feed · +3 coins'
      : 'Feed · free';

  return (
    <article className="pet-card">
      <div className="pet-portrait">
        <PetArt
          pet={pet.id}
          moving={false}
          happy={false}
          facing="right"
          now={now}
          excited={false}
        />
      </div>
      <div>
        <h3>{pet.name}</h3>
        <p>
          {active ? 'In meadow' : 'In collection'} ·{' '}
          {hungry ? 'Hungry' : 'Satisfied for today'}
        </p>
      </div>
      <div className="pet-controls">
        <button
          className="primary-button"
          disabled={!active || !hungry}
          onClick={() => onFeed(pet.id)}
        >
          {feedLabel}
        </button>
        <button
          className="text-button"
          disabled={!active && state.pets.active.length >= 3}
          onClick={() => onActive(pet.id, !active)}
        >
          {active ? 'Remove from meadow' : 'Bring to meadow'}
        </button>
      </div>
    </article>
  );
}

export default function PetPanel({
  state,
  now,
  onFeed,
  onActive,
  onShop,
  collapsed,
  onToggle,
}: {
  state: AppState;
  now: number;
  onFeed: (pet: PetId) => void;
  onActive: (pet: PetId, active: boolean) => void;
  onShop: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const hungryCount = state.pets.active.filter((pet) =>
    isHungry(state, pet, now),
  ).length;
  const gifts = state.pets.gifts[localDay(now)] ?? [];
  const ownedPets = PET_CATALOG.filter((pet) =>
    state.pets.owned.includes(pet.id),
  );
  const hungerSummary =
    state.pets.active.length === 0
      ? 'No pets in the meadow'
      : hungryCount
        ? `${hungryCount} ${hungryCount === 1 ? 'pet is' : 'pets are'} hungry`
        : 'All meadow pets are satisfied';
  return (
    <section
      id="companion-panel"
      className="pet-panel"
    >
      <div className="section-heading">
        <div>
          <div className="companion-heading">
            <p className="eyebrow">YOUR COMPANIONS</p>
            <button
              className="icon-button"
              aria-label={
                collapsed ? 'Expand companions' : 'Minimise companions'
              }
              aria-expanded={!collapsed}
              aria-controls="companion-cards"
              onClick={onToggle}
            >
              {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>
          <h2>{state.pets.active.length} of 3 meadow spots</h2>
        </div>
        <button
          className="text-button"
          onClick={onShop}
        >
          Meet more pets →
        </button>
      </div>
      <p className="hunger-summary">{hungerSummary}</p>
      <div
        id="companion-cards"
        hidden={collapsed}
      >
        <p>
          Feeding is free. The first three different pets fed each day give you
          3 coins each.
        </p>
        <div className="pet-grid">
          {ownedPets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              state={state}
              now={now}
              giftsUsed={gifts.length}
              onFeed={onFeed}
              onActive={onActive}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
