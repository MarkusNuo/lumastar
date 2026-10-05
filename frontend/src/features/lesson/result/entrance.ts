import { durations } from '../../../styles/motion';

/** Seconds until the result card at `order` springs in: after the mascot, one after another. */
export function entranceDelay(order: number, delay = 0): number {
  return delay + durations.base + order * durations.press;
}
