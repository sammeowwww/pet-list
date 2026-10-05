import { CATALOG, type AppState, type ItemId } from '../domain/state';
import { ItemArt } from './ItemArt';

export default function Inventory({ state, selected, onSelect, onStore, onShop }: {
  state: AppState; selected: ItemId | null; onSelect: (id: ItemId) => void; onStore: (id: ItemId) => void; onShop: () => void;
}) {
  return <section className="inventory-panel"><h2>Make it yours</h2><p>{selected === 'picture' ? 'The paw plaque fits on the dog house wall.' : 'Choose a decoration, then select a highlighted square.'}</p>
    {!state.owned.length && <button className="text-button" onClick={onShop}>Your first decoration is waiting in the shop →</button>}
    <div className="inventory-items">{state.owned.map(id => <div key={id} className="inventory-item"><button className={selected === id ? 'selected' : ''} onClick={() => onSelect(id)} aria-pressed={selected === id}><ItemArt id={id} /><span>{CATALOG.find(item => item.id === id)?.name}</span></button>{state.placements[id] && <button className="store-button" onClick={() => onStore(id)}>Put away</button>}</div>)}</div>
  </section>;
}
