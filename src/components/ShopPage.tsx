import { useState } from 'react';
import PetArt from './PetArt';
import { Check } from 'lucide-react';
import { CATALOG, PET_CATALOG, type AppState, type ItemId, type PetId } from '../domain/state';
import { ItemArt } from './ItemArt';

export default function ShopPage({ state, onBuy, onDecorate, onBuyPet }: { state: AppState; onBuy: (id: ItemId) => void; onDecorate: () => void; onBuyPet: (pet: PetId) => void }) {
  const [section, setSection] = useState<'pets' | 'decorations'>('pets');
  const pending = state.tasks.some(task => task.pending);
  return <div className="page simple-page"><section className="page-title"><div><p className="eyebrow">THE MEADOW MARKET</p><h1>Make the yard your own</h1></div><div className="shop-balance"><span className="coin-dot" aria-hidden="true">$</span><b>{state.coins}</b> coins</div></section>
    {pending && <p className="notice" role="status">Purchases unlock after your task’s undo window finishes.</p>}
    <div className="shop-tabs"><button className={`primary-button ${section === 'pets' ? '' : 'shop-tab-inactive'}`} aria-pressed={section === 'pets'} onClick={() => setSection('pets')}>Pets</button><button className={`primary-button ${section === 'decorations' ? '' : 'shop-tab-inactive'}`} aria-pressed={section === 'decorations'} onClick={() => setSection('decorations')}>Decorations</button></div>
    {section === 'pets' && <><p className="notice pet-shop-notice">Collect every companion. Bring up to three into the meadow at a time.</p><section className="shop-grid">{PET_CATALOG.map(pet => { const owned = state.pets.owned.includes(pet.id); return <article className="shop-item" key={pet.id}><div className="item-art catalog-art pet-catalog-art"><PetArt pet={pet.id} /></div><h2>{pet.name}</h2><p>{pet.description}</p><button disabled={owned || pending || state.coins < pet.price} onClick={() => onBuyPet(pet.id)}>{owned ? <><Check size={16} /> Owned</> : `${pet.price} coins`}</button></article>; })}</section></>}
    {section === 'decorations' && <section className="shop-grid">{CATALOG.map(item => {
      const owned = state.owned.includes(item.id);
      return <article className="shop-item" key={item.id}><div className="item-art catalog-art"><ItemArt id={item.id} /></div><h2>{item.name}</h2><p>{item.description}</p><button disabled={owned || pending || state.coins < item.price} onClick={() => onBuy(item.id)} aria-label={owned ? `${item.name} owned` : `Buy ${item.name} for ${item.price} coins`}>{owned ? <><Check size={16} /> Owned</> : <><span className="coin-dot" aria-hidden="true">$</span>{item.price} coins</>}</button></article>;
    })}</section>}<div className="shop-footer"><p>Purchased items are yours to keep. Place, move, or store them in the meadow.</p><button className="primary-button" onClick={onDecorate}>Decorate your meadow →</button></div>
  </div>;
}
