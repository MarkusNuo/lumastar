import { motion, useReducedMotionConfig } from 'motion/react';
import { Button } from '../../../components/ui/Button';
import { FocusScreen } from '../../../components/ui/FocusScreen';
import { SparkBurst } from '../../../components/ui/SparkBurst';
import { Trophy } from '../../../components/ui/Trophy';
import { celebrate } from '../../../lib/celebrate';
import { playCue } from '../../../lib/effects/playCue';
import { useOnceWhen } from '../../../lib/useOnceWhen';
import { durations, springs } from '../../../styles/motion';
import { STREAK_COPY } from '../copy';
import { GoalChooser, GoalSavedNote, type GoalChoice } from '../goal/GoalChooser';
import type { CelebratedStreak } from '../model';
import { useCelebrationTimeline, useTapToSkip } from './useCelebrationTimeline';

const copy = STREAK_COPY.celebration.goal;

const TROPHY_AT_MS = 250;
const SETTLED_AT_MS = 1400;

/** Twelve rays behind the trophy. */
const RAYS = Array.from({ length: 12 }, (_, index) => index * 30);

export interface GoalReachedBeatProps {
  goal: NonNullable<CelebratedStreak['goalReached']>;
  choice: GoalChoice;
  onContinue: () => void;
}

/**
 * The second beat when the streak reaches its goal: a trophy with rays and sparks, and the next
 * goals as big chips. Choosing is optional; the streak screen offers it again.
 */
export function GoalReachedBeat({ goal, choice, onContinue }: GoalReachedBeatProps) {
  const { phase, skipped, reducedMotion, skip } = useCelebrationTimeline(
    TROPHY_AT_MS,
    SETTLED_AT_MS,
  );
  const won = phase !== 'intro';
  const stage = useTapToSkip<HTMLDivElement>(skip, phase !== 'settled');
  useOnceWhen(won, () => {
    playCue('streakGoal');
    if (!reducedMotion) celebrate({ palette: 'gold', originY: 0.3 });
  });

  return (
    <FocusScreen
      className="items-center justify-center gap-5 pt-4 pb-4 text-center"
      footer={
        <Button variant="primary" size="lg" fullWidth onClick={onContinue}>
          {STREAK_COPY.celebration.continue}
        </Button>
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute top-[4%] left-1/2 size-96 -translate-x-1/2 rounded-full bg-xp/20 blur-glow" />
      </div>
      <div
        ref={stage}
        data-testid="streak-goal-reached"
        data-phase={phase}
        className="flex w-full flex-col items-center gap-2"
      >
        <p
          data-tone="xp"
          className="rounded-full tone-solid px-4 py-1 text-label font-black tracking-wide uppercase"
        >
          {copy.kicker}
        </p>
        <TrophyMoment won={won} target={goal.target} show={!skipped} />
        <h1 className="text-headline font-black text-xp">{copy.title(goal.target)}</h1>
        <p className="max-w-xs text-body text-fg-muted">{copy.text(goal.target)}</p>
      </div>
      <GoalChooser
        label={STREAK_COPY.goal.nextLabel}
        options={goal.options}
        choice={choice}
        size="lg"
        className="w-full text-left"
      />
      <GoalSavedNote choice={choice} />
      {choice.status !== 'saved' && (
        <p className="max-w-xs text-caption font-bold text-fg-subtle">{copy.later}</p>
      )}
    </FocusScreen>
  );
}

interface TrophyMomentProps {
  won: boolean;
  target: number;
  /** Springs in with sparks; false shows it in place. */
  show: boolean;
}

function TrophyMoment({ won, target, show }: TrophyMomentProps) {
  const animate = useReducedMotionConfig() !== true && show;

  return (
    <div aria-hidden="true" className="relative grid size-52 place-items-center">
      <motion.svg
        viewBox="-50 -50 100 100"
        className="absolute inset-0 size-full"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={won ? { opacity: 1, scale: 1 } : undefined}
        transition={{ duration: durations.slow * 2, ease: 'easeOut' }}
      >
        <g className="origin-center [transform-box:fill-box] motion-safe:animate-spin-slow">
          {RAYS.map((angle) => (
            <path
              key={angle}
              d="M0 0L-5 -50H5Z"
              transform={`rotate(${angle})`}
              className="fill-xp/15"
            />
          ))}
        </g>
      </motion.svg>
      <motion.div
        initial={animate ? { scale: 0, rotate: -20, y: 40 } : false}
        animate={won ? { scale: 1, rotate: 0, y: 0 } : undefined}
        transition={{ ...springs.bouncy, bounce: 0.55 }}
      >
        <Trophy won engraving={target} className="size-36" />
      </motion.div>
      {won && animate && (
        <span className="absolute top-1/2 left-1/2">
          <SparkBurst distance={96} delay={durations.base} />
        </span>
      )}
    </div>
  );
}
