import { useEffect, useRef, useState } from 'react';
import MeadowArt from './MeadowArt';
import DogAnimation from './DogAnimation';
import CelebrationFlowers from './CelebrationFlowers';
import { ItemArt } from './ItemArt';
import { usePetsMotion } from '../hooks/usePetsMotion';
import type { CelebrationEvent } from '../domain/celebration';
import { itemPosition } from '../domain/meadow';
import { isHungry } from '../domain/pets';
import {
  CATALOG,
  isValidCell,
  type AppState,
  type ItemId,
  type Placement,
  type PetId,
} from '../domain/state';

export default function MeadowScene({
  state,
  now,
  celebration,
  decorating,
  selected,
  onPlace,
  hearts,
  onFeed,
}: {
  state: AppState;
  now: number;
  celebration: CelebrationEvent | null;
  decorating: boolean;
  selected: ItemId | null;
  hearts: Partial<Record<PetId, number>>;
  onFeed: (pet: PetId) => void;
  onPlace: (id: ItemId, position: Placement) => void;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [gap, setGap] = useState(90);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      // Reserve enough world space for independent 44px feeding targets.
      if (entry.contentRect.width)
        setGap(Math.max(90, Math.ceil((44 * 960) / entry.contentRect.width)));
    });
    if (sceneRef.current) observer.observe(sceneRef.current);
    return () => observer.disconnect();
  }, []);
  const hungry = state.pets.active.filter((pet) => isHungry(state, pet, now));
  const motion = usePetsMotion(
    state.pets.active,
    state.placements,
    decorating,
    celebration !== null,
    gap,
  );
  const first = motion.pets[state.pets.active[0]];
  const flowerOrigin = useRef(first?.position ?? { x: 480, y: 350 });
  useEffect(() => {
    if (celebration && first) flowerOrigin.current = first.position;
  }, [celebration?.taskId, celebration?.startedAt]);

  function cellAvailable(position: Placement): boolean {
    return (
      selected !== null &&
      isValidCell(selected, position) &&
      !Object.entries(state.placements).some(
        ([id, cell]) =>
          id !== selected &&
          cell?.column === position.column &&
          cell?.row === position.row,
      )
    );
  }

  return (
    <div
      ref={sceneRef}
      className={`meadow-scene ${state.pets.active.length > 1 ? 'multiple-pets' : ''} ${decorating ? 'decorating' : ''} ${celebration ? 'celebrating' : ''}`}
      data-testid="meadow-scene"
    >
      <MeadowArt />
      <div className="meadow-label">
        <span /> YOUR LITTLE MEADOW
      </div>
      <div className="meadow-weather">
        <span>☀</span> A lovely day to begin
      </div>
      {state.pets.active.map((pet) => {
        const walk = motion.pets[pet];
        const fedAt = hearts[pet];
        const heart = fedAt !== undefined && now < fedAt + 10_000;
        const hungryPet = hungry.includes(pet);
        return (
          walk && (
            <DogAnimation
              key={pet}
              pet={pet}
              position={walk.position}
              facing={walk.facing}
              moving={
                !motion.frozen && walk.pauseMs <= 0 && walk.route.length > 0
              }
              celebrating={celebration !== null}
              frozen={motion.frozen}
              now={now}
              hungry={hungryPet}
              heart={heart}
              happy={fedAt !== undefined && now < fedAt + 2000}
              canFeed={hungryPet && !decorating}
              onFeed={() => onFeed(pet)}
            />
          )
        );
      })}
      <CelebrationFlowers
        celebration={celebration}
        position={flowerOrigin.current}
        now={now}
        staticDisplay={motion.frozen}
      />
      {Object.entries(state.placements).map(([id, cell]) => {
        if (!cell) return null;
        const position = itemPosition(cell);
        return (
          <div
            key={id}
            className="meadow-item"
            style={{
              left: `${position.x / 9.6}%`,
              top: `${position.y / 4.3}%`,
              zIndex: Math.round(position.y),
            }}
            data-testid={`placed-${id}`}
          >
            <ItemArt id={id as ItemId} />
          </div>
        );
      })}
      {decorating && selected && (
        <div
          className="meadow-placement-grid"
          aria-label="Decoration placement grid"
        >
          {Array.from({ length: 24 }, (_, index) => {
            const position = { column: index % 8, row: Math.floor(index / 8) };
            return (
              <button
                key={index}
                disabled={!cellAvailable(position)}
                aria-label={`Place ${CATALOG.find((item) => item.id === selected)?.name} at column ${position.column + 1}, row ${position.row + 1}`}
                onClick={() => onPlace(selected, position)}
              >
                +
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
