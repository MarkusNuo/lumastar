import { useState } from 'react';

export type StepDirection = 1 | -1;

/** Moves forwards and backwards through an ordered list of steps. */
export function useStepFlow<const Step extends string>(steps: readonly Step[]) {
  const [position, setPosition] = useState({ index: 0, direction: 1 as StepDirection });
  const step = steps[position.index];
  if (step === undefined) throw new Error('useStepFlow needs at least one step');

  const goTo = (index: number, direction: StepDirection) => {
    if (index >= 0 && index < steps.length) setPosition({ index, direction });
  };

  return {
    step,
    index: position.index,
    count: steps.length,
    /** 1 when the last move went forwards, -1 when it went back; drives the slide direction. */
    direction: position.direction,
    next: () => goTo(position.index + 1, 1),
    back: () => goTo(position.index - 1, -1),
  };
}
