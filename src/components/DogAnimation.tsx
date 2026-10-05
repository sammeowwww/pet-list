import type { CSSProperties } from 'react';
import PetArt from './PetArt';
import type { Point } from '../domain/meadow';
import { PET_CATALOG, type PetId } from '../domain/state';

export default function DogAnimation({ position, facing, moving, celebrating, frozen, now, pet = 'dog', happy = false, hungry = false, heart = false, canFeed = false, onFeed }: {
  position: Point; facing: 'left' | 'right'; moving: boolean; celebrating: boolean; frozen: boolean; now: number; pet?: PetId; happy?: boolean;
  hungry?: boolean; heart?: boolean; canFeed?: boolean; onFeed?: () => void;
}) {
  const style: CSSProperties = { left: `${position.x / 9.6}%`, top: `${position.y / 4.3}%`, zIndex: Math.round(position.y) };
  const hopping = (celebrating || happy) && !frozen;
  const name = PET_CATALOG.find(value => value.id === pet)!.name;
  return <div className={`meadow-dog ${moving ? 'walking' : 'resting'} ${hungry ? 'hungry' : ''} ${hopping ? 'hopping' : ''} ${frozen ? 'frozen' : ''}`}
    style={style} data-testid={`meadow-${pet}`} data-pet={pet} data-x={position.x.toFixed(2)} data-y={position.y.toFixed(2)} data-motion={frozen ? 'paused' : celebrating ? 'celebrating' : hungry ? 'hungry' : moving ? 'walking' : 'resting'}>
    <span className="meadow-dog-shadow" />
    <div className="meadow-dog-body"><PetArt pet={pet} moving={moving} happy={happy} facing={facing} now={now} excited={celebrating} /></div>
    {(heart || hungry) && <img className="pet-bubble" src={heart ? '/heart-bubble.png' : '/hunger-bubble.png'} alt={heart ? `${name} is happy` : `${name} is hungry`} data-testid={`bubble-${pet}`} data-bubble={heart ? 'heart' : 'hunger'} />}
    {canFeed && <button className="pet-feed-target" aria-label={`Feed ${name}`} onClick={onFeed} />}
  </div>;
}
