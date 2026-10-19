import { ShieldCheckIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { FocusScreen } from '../../../components/ui/FocusScreen';
import { MascotMessage } from '../../../components/ui/MascotMessage';
import { PopNumber } from '../../../components/ui/PopNumber';
import { StreakFlame } from '../../../components/ui/StreakFlame';
import { celebrate } from '../../../lib/celebrate';
import { cx } from '../../../lib/cx';
import { playCue } from '../../../lib/effects/playCue';
import { useFocusOnMount } from '../../../lib/focus';
import { useOnceWhen } from '../../../lib/useOnceWhen';
import { durations, springs } from '../../../styles/motion';
import { STREAK_COPY } from '../copy';
import type { CelebratedStreak } from '../model';
import { useCelebrationTimeline, useStepCount, useTapToSkip } from './useCelebrationTimeline';

const copy = STREAK_COPY.celebration;

/** The cold flame shivers this long before it catches; everything has settled at the end. */
const IGNITE_AT_MS = 650;
const SETTLED_AT_MS = 2200;

/** When the parts come in after the flame catches, in seconds. */
const ENTRANCE = { kicker: 0.5, text: 0.8, freeze: 1, cheer: 1.25 } as const;

export interface IgniteBeatProps {
  streak: CelebratedStreak;
  onContinue: () => void;
}

/**
 * The streak grows: the grey flame shivers, catches fire, hops
 * and throws embers while the number counts up, with confetti in flame colours, its own sound and
 * vibration and a cheer from the mascot. A tap skips to the end; "Weiter" is there from the start.
 */
export function IgniteBeat({ streak, onContinue }: IgniteBeatProps) {
  const { phase, skipped, reducedMotion, skip } = useCelebrationTimeline(
    IGNITE_AT_MS,
    SETTLED_AT_MS,
  );
  const lit = phase !== 'intro';
  const stage = useTapToSkip<HTMLDivElement>(skip, phase !== 'settled');
  const days = useStepCount(streak.previous, streak.current, lit, skipped);
  const heading = useFocusOnMount<HTMLHeadingElement>();
  useOnceWhen(lit, () => {
    playCue('streak');
    if (!reducedMotion) celebrate({ palette: 'flame', originY: 0.35, fromSides: true });
  });

  return (
    <FocusScreen
      className="items-center justify-center gap-4 pb-4 text-center"
      footer={
        <Button variant="primary" size="lg" fullWidth onClick={onContinue}>
          {copy.continue}
        </Button>
      }
    >
      <WarmBackdrop lit={lit} />
      <div
        ref={stage}
        data-testid="streak-celebration"
        data-phase={phase}
        className="flex w-full flex-col items-center gap-2"
      >
        <Entrance visible={lit} delay={skipped ? 0 : ENTRANCE.kicker} pop>
          <p
            data-tone="streak"
            className="rounded-full tone-solid px-4 py-1 text-label font-black tracking-wide uppercase"
          >
            {copy.kicker(streak.current)}
          </p>
        </Entrance>
        <StreakFlame lit={lit} ignition={!skipped} className="size-48" />
        <h1 ref={heading} tabIndex={-1} className="flex flex-col items-center outline-none">
          <PopNumber
            value={days}
            className={cx(
              'text-hero font-black tabular-nums transition-colors duration-(--duration-slow)',
              lit ? 'text-streak' : 'text-fg-subtle',
            )}
          />
          <span aria-hidden="true" className="text-title font-black">
            {copy.unit(days)}
          </span>
          <span className="sr-only">{copy.title(streak.current)}</span>
        </h1>
        <Entrance visible={lit} delay={skipped ? 0 : ENTRANCE.text}>
          <p className="max-w-xs text-body text-fg-muted">{copy.text(streak.current)}</p>
        </Entrance>
      </div>
      {streak.freezeUsed && (
        <Entrance visible={lit} delay={skipped ? 0 : ENTRANCE.freeze}>
          <p
            data-tone="freeze"
            className="flex items-start gap-3 rounded-card-sm tone-outline px-4 py-3 text-left text-label font-bold"
          >
            <ShieldCheckIcon aria-hidden="true" size={22} weight="fill" className="shrink-0" />
            <span className="text-fg">{copy.freezeUsed}</span>
          </p>
        </Entrance>
      )}
      <Entrance visible={lit} delay={skipped ? 0 : ENTRANCE.cheer} className="w-full">
        <MascotMessage expression="celebrating" size="sm" className="text-left">
          {copy.cheer(streak.current)}
        </MascotMessage>
      </Entrance>
    </FocusScreen>
  );
}

interface EntranceProps {
  visible: boolean;
  /** Seconds after `visible` turns true. */
  delay: number;
  /** Springs in from small instead of rising. */
  pop?: boolean;
  className?: string;
  children: ReactNode;
}

/** Keeps its content in the document (for screen readers) and brings it in with a spring. */
function Entrance({ visible, delay, pop = false, className, children }: EntranceProps) {
  const hidden = pop ? { opacity: 0, scale: 0.5, rotate: -6 } : { opacity: 0, y: 14 };
  const shown = pop ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 1, y: 0 };
  return (
    <motion.div
      initial={hidden}
      animate={visible ? shown : hidden}
      transition={{ ...(pop ? springs.bouncy : springs.gentle), delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A cold blue glow behind the grey flame that turns warm as it catches. */
function WarmBackdrop({ lit }: { lit: boolean }) {
  const glow = 'absolute top-[6%] left-1/2 size-96 -translate-x-1/2 rounded-full blur-glow';
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className={cx(glow, 'bg-freeze/10')}
        initial={false}
        animate={{ opacity: lit ? 0 : 1 }}
        transition={{ duration: durations.slow * 2 }}
      />
      <motion.div
        className={cx(glow, 'bg-streak/25')}
        initial={false}
        animate={{ opacity: lit ? 1 : 0, scale: lit ? 1 : 0.6 }}
        transition={{ duration: durations.slow * 2, ease: 'easeOut' }}
      />
    </div>
  );
}
