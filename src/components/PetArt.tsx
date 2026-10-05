import { useId } from 'react';
import dog from '../dog-walk.meta.json';
import cat from '../cat.meta.json';
import bunny from '../bunny.meta.json';
import hamster from '../hamster.meta.json';
import { PET_CATALOG, type PetId } from '../domain/state';

const sheets = { dog, cat, bunny, hamster };
export default function PetArt({ pet, moving = false, happy = false, facing = 'right', now = 0, excited = false }: {
  pet: PetId; moving?: boolean; happy?: boolean; facing?: 'left' | 'right'; now?: number; excited?: boolean;
}) {
  const clipId = useId();
  const name = PET_CATALOG.find(value => value.id === pet)!.name;
  if (pet === 'dog' && !moving) return <img src="/dog.png" alt={`${name} resting`} style={{ transform: facing === 'right' ? 'scaleX(-1)' : undefined }} />;
  const sheet = sheets[pet];
  const phase = Math.floor(now / (excited ? 150 : 420));
  const index = pet === 'dog' ? phase % 4 : moving ? 1 + phase % 2 : happy ? 3 : 0;
  const frame = sheet.frames[index];
  const mirror = facing === 'left';
  return <svg viewBox={`0 0 ${sheet.cell} ${sheet.cell}`} className="meadow-walk-frame" style={{ transform: mirror ? 'scaleX(-1)' : undefined }} role="img" aria-label={`${name} ${moving ? 'walking' : happy ? 'happy' : 'resting'}`}>
    <defs><clipPath id={clipId}><rect x={frame.bounds.left + frame.shift} y={frame.bounds.top + frame.lift} width={frame.bounds.right - frame.bounds.left} height={frame.bounds.bottom - frame.bounds.top} /></clipPath></defs>
    <image href={pet === 'dog' ? '/dog-walk.png' : `/${pet}.png`} x={-frame.x + frame.shift} y={-frame.y + frame.lift} width={sheet.width} height={sheet.height} clipPath={`url(#${clipId})`} />
  </svg>;
}
