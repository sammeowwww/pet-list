import type { CSSProperties } from 'react';
import type { CelebrationEvent } from '../domain/celebration';
import type { Point } from '../domain/meadow';

const FLOWERS = [
  { x: -82, y: 14 },
  { x: 78, y: 6 },
  { x: -48, y: 30 },
  { x: 40, y: 35 },
  { x: -105, y: -5 },
  { x: 110, y: 22 },
];

export default function CelebrationFlowers({
  celebration,
  position,
  now,
  staticDisplay,
}: {
  celebration: CelebrationEvent | null;
  position: Point;
  now: number;
  staticDisplay: boolean;
}) {
  if (!celebration) return null;
  const age = now - celebration.startedAt;
  const fading = now >= celebration.expiresAt - 1300;
  return (
    <div
      className={`meadow-flowers ${staticDisplay ? 'static' : ''} ${fading ? 'fading' : ''}`}
      data-testid="celebration-flowers"
      aria-hidden="true"
    >
      {FLOWERS.map((offset, index) => (
        <span
          className="meadow-flower"
          key={`${celebration.taskId}-${index}`}
          style={
            {
              left: `${Math.max(34, Math.min(78, (position.x + offset.x) / 9.6))}%`,
              top: `${Math.min(94, (position.y + offset.y) / 4.3)}%`,
              opacity: staticDisplay || age > index * 160 ? 1 : 0,
              animationDelay: `${index * 160}ms`,
              '--petal': index % 2 ? '#df9b94' : '#eee0a1',
            } as CSSProperties
          }
        >
          <i />
          <b />
        </span>
      ))}
    </div>
  );
}
