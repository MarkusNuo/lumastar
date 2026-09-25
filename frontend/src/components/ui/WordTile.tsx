import { motion, type TargetAndTransition } from 'motion/react';
import { cx } from '../../lib/cx';
import { durations, springs } from '../../styles/motion';
import type { Tone } from './tones';

export type WordTileState = 'idle' | 'selected' | 'placed' | 'disabled' | 'correct' | 'wrong';

export interface WordTileProps {
  children: string;
  state?: WordTileState;
  onClick?: () => void;
  /** For tiles that toggle a selection, e.g. when matching pairs. */
  pressed?: boolean;
  /** Shared layout id so the tile flies between word bank and answer line. */
  layoutId?: string;
  lang?: string;
  className?: string;
}

type ActiveState = Exclude<WordTileState, 'placed'>;

const stateTone: Record<ActiveState, Tone> = {
  idle: 'neutral',
  selected: 'primary',
  disabled: 'neutral',
  correct: 'success',
  wrong: 'danger',
};

const stateMotion: Record<ActiveState, TargetAndTransition> = {
  idle: { x: 0, y: 0 },
  selected: { x: 0, y: 0 },
  disabled: { x: 0, y: 0 },
  correct: { y: [0, -8, 0], transition: { duration: durations.slow } },
  wrong: { x: [0, -8, 8, -5, 5, 0], transition: { duration: durations.slow } },
};

const stateLabel: Partial<Record<ActiveState, string>> = { correct: 'richtig', wrong: 'falsch' };

const tileShape =
  'inline-flex min-h-12 items-center rounded-chip border-2 px-4 py-2 text-body font-bold';

export function WordTile({
  children,
  state = 'idle',
  onClick,
  pressed,
  layoutId,
  lang,
  className,
}: WordTileProps) {
  if (state === 'placed') {
    // The empty slot keeps the word's width so the word bank does not reflow.
    return (
      <span
        aria-hidden="true"
        className={cx(tileShape, 'border-border bg-border select-none', className)}
      >
        <span className="invisible">{children}</span>
      </span>
    );
  }

  const srState = stateLabel[state];
  return (
    <motion.button
      type="button"
      layoutId={layoutId}
      layout="position"
      transition={springs.bouncy}
      animate={stateMotion[state]}
      disabled={state === 'disabled'}
      aria-pressed={pressed}
      data-tone={stateTone[state]}
      onClick={onClick}
      lang={lang}
      className={cx(
        tileShape,
        'pressable tone-outline disabled:border-border disabled:text-fg-subtle',
        className,
      )}
    >
      {children}
      {srState && <span className="sr-only">, {srState}</span>}
    </motion.button>
  );
}
