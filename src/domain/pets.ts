import { localDay } from './dates';
import { PET_CATALOG, type AppState, type PetId } from './state';

export function isHungry(state: AppState, id: PetId, now: number): boolean {
  return state.pets.fedDays[id] !== localDay(now);
}

export function buyPet(state: AppState, id: PetId): AppState {
  const pet = PET_CATALOG.find(pet => pet.id === id)!;
  if (state.pets.owned.includes(id) || state.coins < pet.price || state.tasks.some(task => task.pending)) return state;
  const active = state.pets.active.length < 3 ? [...state.pets.active, id] : state.pets.active;
  return { ...state, coins: state.coins - pet.price, pets: { ...state.pets, owned: [...state.pets.owned, id], active } };
}

export function setPetActive(state: AppState, id: PetId, active: boolean): AppState {
  if (!state.pets.owned.includes(id) || state.pets.active.includes(id) === active || (active && state.pets.active.length >= 3)) return state;
  return { ...state, pets: { ...state.pets, active: active ? [...state.pets.active, id] : state.pets.active.filter(pet => pet !== id) } };
}

export function feedPet(state: AppState, id: PetId, now: number): AppState {
  const day = localDay(now);
  if (!state.pets.active.includes(id) || (state.pets.fedDays[id] ?? '') >= day) return state;
  const recipients = state.pets.gifts[day] ?? [];
  const gift = recipients.length < 3 && !recipients.includes(id);
  return { ...state, coins: state.coins + (gift ? 3 : 0), pets: { ...state.pets,
    fedDays: { ...state.pets.fedDays, [id]: day }, gifts: { ...state.pets.gifts, [day]: gift ? [...recipients, id] : recipients } } };
}
