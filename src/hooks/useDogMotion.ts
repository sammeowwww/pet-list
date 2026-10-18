import { useEffect, useMemo, useState } from 'react';
import {
  advanceWalk,
  avoidNewDecorations,
  decorationObstacles,
  initialWalk,
} from '../domain/meadow';
import type { AppState } from '../domain/state';

export function useDogMotion(
  placements: AppState['placements'],
  paused: boolean,
  celebrating: boolean,
) {
  const obstacles = useMemo(
    () => decorationObstacles(placements),
    [placements],
  );
  const [walk, setWalk] = useState(() =>
    avoidNewDecorations(initialWalk(), obstacles),
  );
  const [hidden, setHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (!paused) setWalk((current) => avoidNewDecorations(current, obstacles));
  }, [obstacles, paused]);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const visibility = () => setHidden(document.hidden);
    const preference = () => setReducedMotion(query.matches);
    document.addEventListener('visibilitychange', visibility);
    query.addEventListener('change', preference);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      query.removeEventListener('change', preference);
    };
  }, []);

  useEffect(() => {
    if (paused || hidden || reducedMotion) return;
    let previous = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(100, now - previous);
      previous = now;
      setWalk((current) =>
        advanceWalk(current, elapsed, celebrating, obstacles),
      );
    }, 50);
    return () => clearInterval(timer);
  }, [paused, hidden, reducedMotion, celebrating, obstacles]);

  return {
    ...walk,
    moving: walk.moving && !paused && !hidden && !reducedMotion,
    frozen: paused || hidden || reducedMotion,
    reducedMotion,
  };
}
