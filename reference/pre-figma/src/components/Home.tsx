import { useState } from 'react';
import { ArrowUpRight, Check, Coins, Gift, Grid2X2, ShoppingBag, Sparkles, Sprout, X } from 'lucide-react';
import Dialog from './Dialog';
import { localDay } from '../domain/dates';
import { CATALOG, dailyBonusAvailable, isValidCell, tasksForDay, type AppState, type ItemId, type Placement } from '../domain/state';

export function ItemArt({ id }: { id: ItemId }) {
  const artwork = {
    bed: <><path d="M5 27h38v16H5z" fill="#ac776b" /><path d="M8 26h32v11H8z" fill="#dca69b" /><path d="M12 21h24v13H12z" fill="#efcfb4" /><path d="M5 27h5v16H5zm33 0h5v16h-5z" fill="#916153" /></>,
    rug: <><path d="M5 18h38v24H5z" fill="#ead8a6" /><path d="M9 22h30v16H9z" fill="#be7464" /><path d="M20 22h8v16h-8zM9 28h30v4H9z" fill="#e1b286" /><path d="M2 22h3v3H2zm0 9h3v3H2zm41-9h3v3h-3zm0 9h3v3h-3z" fill="#c4a171" /></>,
    plant: <><path d="M21 11h6v21h-6z" fill="#526a4a" /><path d="M8 9h13v10H8zm19-5h13v12H27zM7 21h14v8H7zm20-3h14v9H27z" fill="#819a60" /><path d="M13 30h22v5H13zm3 5h16v10H16z" fill="#b88262" /><path d="M16 35h5v10h-5z" fill="#d5a177" /></>,
    bowl: <><path d="M5 29h38v9H5zm5 9h28v6H10z" fill="#7f9b9a" /><path d="M8 26h32v6H8z" fill="#d0ddcb" /><path d="M12 27h24v3H12z" fill="#916c4d" /><path d="M11 35h8v5h-8z" fill="#adc7bf" /></>,
    lamp: <><path d="M22 14h4v29h-4zM15 43h18v4H15z" fill="#72614d" /><path d="M15 8h18v21H15z" fill="#7b7555" /><path d="M18 12h12v13H18z" fill="#f2d78e" /><path d="M12 7h24v5H12zM20 3h8v4h-8z" fill="#5d674d" /></>,
    picture: <><path d="M8 8h32v30H8z" fill="#89674a" /><path d="M12 12h24v22H12z" fill="#eee1ba" /><path d="M20 24h9v6h-9zM17 18h4v5h-4zm6-3h4v6h-4zm7 3h4v5h-4z" fill="#9a7850" /></>,
  };
  return <svg viewBox="0 0 48 48" fill="none" shapeRendering="crispEdges" aria-hidden="true">{artwork[id]}</svg>;
}

function MeadowArt() {
  return <svg className="meadow-art" viewBox="0 0 960 430" preserveAspectRatio="xMidYMid slice" aria-hidden="true" shapeRendering="crispEdges">
    <rect width="960" height="430" fill="#dfeae3" />
    <path d="M0 210h70v-30h80v-26h92v-20h84v32h72v27h80v-29h70v-23h100v20h84v35h78v-17h110v251H0z" fill="#c9d9b9" />
    <path d="M0 253h82v-25h112v18h90v-22h112v25h91v-21h100v-20h100v26h124v-20h80v29h69v187H0z" fill="#b5caa0" />
    <path d="M0 285h960v145H0z" fill="#a3ba87" /><path d="M0 314h960v116H0z" fill="#a8bf8b" />
    <g fill="#f8faf0"><path d="M100 102h25V87h40v-14h43v15h31v15h19v14H100z" /><path d="M601 92h25V75h45V62h37v16h34v13h19v13H601z" /><path d="M405 130h20v-12h29v-11h37v12h26v11h17v12H405z" /></g>
    <rect x="797" y="70" width="38" height="38" fill="#eee4ac" /><rect x="805" y="62" width="22" height="54" fill="#eee4ac" />
    <g fill="#8ea574"><path d="M22 240h12v-8h12v12h-7v15H22zM420 251h8v-10h10v12h-5v8h-13zM693 254h12v-9h11v18h-23z" /></g>
    <path d="M159 326h137v14h-17v15h-19v15h-17v15h-22v15h-17v30H99v-16h33v-15h29v-15h25v-15h20v-16h-47z" fill="#d1cb9e" />
    <g><rect x="72" y="245" width="14" height="90" fill="#9c8964" /><rect x="50" y="189" width="61" height="57" fill="#74915f" /><rect x="35" y="205" width="91" height="37" fill="#74915f" /><rect x="54" y="174" width="51" height="55" fill="#839d6b" /><rect x="65" y="161" width="30" height="33" fill="#839d6b" /><rect x="88" y="208" width="24" height="34" fill="#658153" /></g>
    <g><rect x="858" y="236" width="16" height="101" fill="#9c8964" /><rect x="830" y="167" width="77" height="77" fill="#6d8c5e" /><rect x="809" y="190" width="117" height="51" fill="#6d8c5e" /><rect x="839" y="143" width="59" height="63" fill="#819b6c" /><rect x="853" y="126" width="32" height="30" fill="#819b6c" /><rect x="879" y="195" width="29" height="47" fill="#608153" /></g>
    <g><path d="M122 221h170v102H122z" fill="#d5b98b" /><path d="M134 221h13v102h-13zm28 0h6v102h-6zm87 0h7v102h-7zm25 0h6v102h-6z" fill="#c4a578" /><path d="M104 225v-16h17v-16h18v-16h17v-16h17v-16h68v16h17v16h17v16h18v16h17v16z" fill="#927367" /><path d="M118 216v-13h18v-16h17v-16h18v-16h62v16h18v16h17v16h18v13z" fill="#ad8774" /><path d="M181 267h52v56h-52zm8-14h36v14h-36z" fill="#655d47" /><rect x="117" y="323" width="181" height="10" fill="#9c855e" /><rect x="188" y="214" width="41" height="19" fill="#eee0bb" /><path d="M198 223h5v5h-5zm6-5h5v10h-5zm6 3h5v7h-5z" fill="#9b7c55" /></g>
    <g fill="#7f9b68"><path d="M42 361h4v-9h4v13h-8zM328 381h4v-9h4v13h-8zM606 322h4v-9h4v13h-8zM762 393h4v-9h4v13h-8zM934 361h4v-9h4v13h-8zM488 408h4v-9h4v13h-8z" /></g>
    <g fill="#f2e9bd"><rect x="347" y="333" width="6" height="6" /><rect x="760" y="343" width="6" height="6" /><rect x="85" y="389" width="6" height="6" /><rect x="647" y="389" width="6" height="6" /></g>
    <g fill="#d4a69d"><rect x="590" y="359" width="6" height="6" /><rect x="917" y="390" width="6" height="6" /><rect x="314" y="406" width="6" height="6" /></g>
    <g><rect x="719" y="271" width="8" height="49" fill="#aa8e67" /><rect x="702" y="278" width="41" height="21" fill="#e1c99e" /><path d="M711 287h21v3h-21z" fill="#ab926d" /></g>
  </svg>;
}

function HomeScene({ state, decorating, selected, onPlace }: {
  state: AppState; decorating: boolean; selected: ItemId | null; onPlace: (id: ItemId, position: Placement) => void;
}) {
  return <div className={`home-scene ${decorating ? 'decorating' : ''}`}>
    <MeadowArt />
    <div className="scene-label"><span /> YOUR LITTLE MEADOW</div>
    <div className="scene-weather"><span>☀</span> A lovely day to begin</div>
    <div className="dog-shadow" /><img className="scene-dog" src="/dog.png" alt="Your pixel puppy sitting in its garden beside a little dog house" />
    {Object.entries(state.placements).map(([id, position]) => position && <div key={id} className="placed-item" style={{ left: `${8 + (position.column + .5) * 10.5}%`, top: `${57 + (position.row + .5) * 12.66}%` }}><ItemArt id={id as ItemId} /></div>)}
    {decorating && selected && <div className="placement-grid" aria-label="Decoration placement grid">{Array.from({ length: 24 }, (_, index) => {
      const position = { column: index % 8, row: Math.floor(index / 8) };
      const occupied = Object.entries(state.placements).some(([id, cell]) => id !== selected && cell?.column === position.column && cell?.row === position.row);
      const valid = isValidCell(selected, position) && !occupied;
      return <button key={index} disabled={!valid} aria-label={`Place ${CATALOG.find(item => item.id === selected)?.name} at column ${position.column + 1}, row ${position.row + 1}`} onClick={() => onPlace(selected, position)}><PlusMark /></button>;
    })}</div>}
    <div className="scene-caption"><span className="pixel-heart">♥</span><p>{decorating ? selected ? 'Select a highlighted square to place your item.' : 'Choose an item below to make this place yours.' : 'A small home. A happy pup. A fresh start.'}</p></div>
  </div>;
}

function PlusMark() { return <span aria-hidden="true">+</span>; }

export default function Home({ state, now, onBuy, onPlace, onClaim, goTasks }: {
  state: AppState; now: number; onBuy: (id: ItemId) => void;
  onPlace: (id: ItemId, position: Placement | null) => void; onClaim: () => void; goTasks: () => void;
}) {
  const [shop, setShop] = useState(false);
  const [decorating, setDecorating] = useState(false);
  const [selected, setSelected] = useState<ItemId | null>(null);
  const today = localDay(now);
  const tasks = tasksForDay(state.tasks, today, today, now);
  const completed = tasks.filter(task => task.status === 'done').length;
  const available = dailyBonusAvailable(state, now);
  const claimed = state.bonusDays.includes(today);
  const pending = state.tasks.some(task => task.pending);

  return <>
    <div className="page-heading"><div><p className="eyebrow"><Sprout size={15} /> YOUR OWN LITTLE CORNER</p><h1>A place to pause.</h1><p>Your plans can wait a moment. Make yourself at home.</p></div><div className="home-actions"><button className={`button secondary ${decorating ? 'selected' : ''}`} onClick={() => setDecorating(!decorating)}>{decorating ? <X size={16} /> : <Grid2X2 size={16} />}{decorating ? 'Finish decorating' : 'Decorate'}</button><button className="button primary" onClick={() => setShop(true)}><ShoppingBag size={16} /> Little shop</button></div></div>
    <HomeScene state={state} decorating={decorating} selected={selected} onPlace={onPlace} />
    {decorating && <section className="inventory-panel"><header><h2>Make it yours</h2><p>{selected === 'picture' ? 'The paw plaque fits on the wall of the dog house.' : 'Pick a decoration, then choose a spot in the meadow.'}</p></header>{state.owned.length === 0 ? <div className="inventory-empty"><ShoppingBag size={18} /><p>Your inventory is waiting for its first little treasure.</p><button className="text-button" onClick={() => setShop(true)}>Browse the shop <ArrowUpRight size={14} /></button></div> : <div className="inventory-items">{state.owned.map(id => <div key={id} className="inventory-item"><button className={selected === id ? 'selected' : ''} onClick={() => setSelected(id)} aria-pressed={selected === id}><ItemArt id={id} /><span>{CATALOG.find(item => item.id === id)?.name}</span></button>{state.placements[id] && <button className="store-button" onClick={() => onPlace(id, null)}>Put away</button>}</div>)}</div>}</section>}
    <div className="home-cards"><section className="home-card"><span className="home-card-icon"><Sprout size={20} /></span><div><p className="eyebrow">ONE LITTLE STEP AT A TIME</p><h2>{completed} of {tasks.length} tasks complete today</h2><p>Your meadow grows with the things you do.</p></div><button className="text-button" onClick={goTasks}>Back to your day <ArrowUpRight size={16} /></button></section>
      <section className={`home-card bonus-card ${available ? 'available' : ''}`}><span className="home-card-icon"><Gift size={20} /></span><div><p className="eyebrow">A LITTLE EXTRA</p><h2>{claimed ? 'Today’s bonus is yours.' : 'Finish your day, earn 10 coins.'}</h2><p>{claimed ? 'Enjoy your progress. Tomorrow is a new page.' : pending ? 'Your coins are settling. You can still undo.' : 'Complete every task on your Today list to claim.'}</p></div><button className="button secondary" disabled={!available} onClick={onClaim}>{claimed ? <Check size={15} /> : <Coins size={15} />}{claimed ? 'Claimed' : 'Claim daily bonus'}</button></section></div>
    <p className="home-footnote"><Sparkles size={14} /> A little excitement for the things you were going to do anyway.</p>
    {shop && <Dialog title="The little shop" onClose={() => setShop(false)} wide><p className="dialog-intro">Little rewards for real-world progress. <strong className="shop-balance"><Coins size={15} /> {state.coins} coins</strong></p>{pending && <p className="notice">Purchases unlock when your task’s undo window finishes.</p>}<div className="shop-grid">{CATALOG.map(item => {
      const owned = state.owned.includes(item.id);
      return <article className="shop-item" key={item.id}><div className="shop-art"><ItemArt id={item.id} /></div><h3>{item.name}</h3><p>{item.description}</p><button className={`button ${owned ? 'secondary' : 'primary'}`} disabled={owned || pending || state.coins < item.price} onClick={() => onBuy(item.id)}>{owned ? <><Check size={14} /> Owned</> : <><Coins size={14} /> {item.price} coins</>}</button></article>;
    })}</div><p className="field-hint">Buy an item, then use Decorate to place it. Each item can be purchased once.</p></Dialog>}
  </>;
}
