import { useEffect, useRef } from 'react';
import { celebrate } from './celebrate';
import type { FeedbackCue } from './effects/cue';
import { playCue } from './effects/playCue';

/** Confetti and the cue's sound and vibration, once, as soon as `ready` turns true. */
export function useCelebration(ready: boolean, cue: FeedbackCue): void {
  const celebrated = useRef(false);
  useEffect(() => {
    if (!ready || celebrated.current) return;
    celebrated.current = true;
    celebrate();
    playCue(cue);
  }, [ready, cue]);
}
