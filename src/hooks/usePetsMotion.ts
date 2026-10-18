import { useEffect, useMemo, useState } from 'react';
import {
  avoidNewDecorations,
  decorationObstacles,
  safePosition,
} from '../domain/meadow';
import {
  advancePets,
  fittedPetGap,
  initialPets,
  petObstacle,
} from '../domain/petMotion';
import type { AppState, PetId } from '../domain/state';

export function usePetsMotion(
  active: PetId[],
  placements: AppState['placements'],
  paused: boolean,
  celebrating: boolean,
  gap = 90,
) {
  const activeKey = active.join(',');
  const obstacles = useMemo(
    () => decorationObstacles(placements),
    [placements],
  );
  const spacing = useMemo(
    () => fittedPetGap(active.length, obstacles, gap),
    [activeKey, obstacles, gap],
  );
  const [pets, setPets] = useState(() =>
    initialPets(active, obstacles, spacing),
  );
  const [hidden, setHidden] = useState(document.hidden);
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    setPets((current) => {
      const seeded = initialPets(active, obstacles, spacing);
      for (const pet of active) if (current[pet]) seeded[pet] = current[pet];
      return seeded;
    });
  }, [activeKey]);
  useEffect(() => {
    if (paused) return;
    setPets((current) => {
      const next = { ...current };
      for (const pet of active) {
        if (!next[pet]) continue;
        const others = active
          .filter((id) => id !== pet && next[id])
          .map((id) => petObstacle(next[id]!, spacing));
        next[pet] = avoidNewDecorations(next[pet]!, [...obstacles, ...others]);
      }
      const valid = active.every(
        (pet) =>
          next[pet] &&
          safePosition(next[pet]!.position, [
            ...obstacles,
            ...active
              .filter((id) => id !== pet && next[id])
              .map((id) => petObstacle(next[id]!, spacing)),
          ]),
      );
      if (!valid) return initialPets(active, obstacles, spacing);
      return next;
    });
  }, [activeKey, obstacles, paused, spacing]);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const visibility = () => setHidden(document.hidden);
    const preference = () => setReduced(query.matches);
    document.addEventListener('visibilitychange', visibility);
    query.addEventListener('change', preference);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      query.removeEventListener('change', preference);
    };
  }, []);
  useEffect(() => {
    if (paused || hidden || reduced) return;
    let previous = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(100, now - previous);
      previous = now;
      setPets((current) =>
        advancePets(current, active, elapsed, celebrating, obstacles, spacing),
      );
    }, 50);
    return () => clearInterval(timer);
  }, [activeKey, obstacles, paused, hidden, reduced, celebrating, spacing]);
  const frozen = paused || hidden || reduced;
  return { pets, frozen };
}
