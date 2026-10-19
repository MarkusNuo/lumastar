import { motion, useReducedMotionConfig, type TargetAndTransition } from 'motion/react';
import { useId } from 'react';
import { cx } from '../../lib/cx';
import { durations } from '../../styles/motion';
import { FLAME_CORE, FLAME_OUTER, FLAME_VIEWBOX } from './Flame';
import { SPARKLE_PATH } from './mascotArt';

export interface StreakFlameProps {
  /** False shows the cold grey flame; true the burning one. */
  lit: boolean;
  /**
   * Turning lit plays the ignition: the cold flame shivers, the colour climbs up from the base,
   * the flame hops and throws embers. Without it the flame simply burns.
   */
  ignition?: boolean;
  className?: string;
}

/* Extra layers on the 24 × 24 silhouette of the top-bar flame. */
const EDGE_OFFSET = 0.8;
const HOT_CORE =
  'M12.2 15.6c.5 1 1.6 1.6 1.6 2.9 0 1-.8 1.8-1.7 1.8s-1.7-.8-1.7-1.8c0-.8.4-1.4 1-1.8.1.5.3.8.6 1-.1-.8 0-1.5.2-2.1Z';
const SHINE = 'M16.4 9.9c1 1.2 1.6 2.6 1.7 4.1';
const FROST = 'M7.4 14.2c-.3 1.4 0 2.8.9 3.9';

/** The mask that lets the colour climb: a wavy edge that starts below the flame and rises past it. */
const SWEEP_PATH = 'M-4 1.5Q-1 0 2 1.5T8 1.5T14 1.5T20 1.5T26 1.5T32 1.5V40H-4Z';
const SWEEP_HIDDEN = 25;
const SWEEP_SHOWN = -4;
const SWEEP_SECONDS = 0.45;

/** Squash, stretch and a little hop as the flame catches. */
const HOP: TargetAndTransition = {
  scaleX: [1, 1.16, 0.9, 1.1, 0.96, 1],
  scaleY: [1, 0.8, 1.16, 0.88, 1.04, 1],
  y: ['0%', '3%', '-20%', '0%', '-3%', '0%'],
  rotate: [0, 0, -8, 5, -2, 0],
  transition: {
    duration: 0.8,
    times: [0, 0.14, 0.42, 0.66, 0.82, 1],
    ease: 'easeOut',
    delay: SWEEP_SECONDS * 0.7,
  },
};
const REST: TargetAndTransition = { scaleX: 1, scaleY: 1, y: '0%', rotate: 0 };

/**
 * Sparks thrown as the flame hops: direction in degrees (0 = right, -90 = up), reach in % of the
 * flame's box. Uneven on purpose so the burst looks hand-made.
 */
const BURST = [
  { angle: -92, reach: 62, delay: 0, star: true },
  { angle: -120, reach: 55, delay: 0.04, star: false },
  { angle: -62, reach: 58, delay: 0.02, star: false },
  { angle: -150, reach: 50, delay: 0.08, star: true },
  { angle: -32, reach: 52, delay: 0.06, star: true },
  { angle: -175, reach: 44, delay: 0.1, star: false },
  { angle: -5, reach: 46, delay: 0.09, star: false },
  { angle: -105, reach: 38, delay: 0.12, star: false },
  { angle: -75, reach: 40, delay: 0.14, star: false },
  { angle: -135, reach: 66, delay: 0.16, star: false },
  { angle: -45, reach: 68, delay: 0.18, star: false },
  { angle: 160, reach: 40, delay: 0.12, star: false },
  { angle: 20, reach: 42, delay: 0.15, star: false },
  { angle: -160, reach: 30, delay: 0.2, star: true },
] as const;
const BURST_FALL = 12;
const BURST_COLORS = ['bg-streak-core', 'bg-streak', 'bg-streak-glow'] as const;

/** Embers that keep rising from a burning flame: sideways drift in %, start in s. */
const RISING = [
  { drift: -14, delay: 0 },
  { drift: 10, delay: 0.5 },
  { drift: -4, delay: 1.1 },
  { drift: 18, delay: 1.5 },
  { drift: -20, delay: 2 },
] as const;

/** Twinkling stars around the burning flame (position in % of its box). */
const SPARKLES = [
  { left: '8%', top: '22%', size: 'size-4', delay: '0s' },
  { left: '84%', top: '14%', size: 'size-5', delay: '0.5s' },
  { left: '90%', top: '58%', size: 'size-3', delay: '0.9s' },
] as const;

const svgFill = 'origin-bottom [transform-box:fill-box]';

/**
 * Lumastar's big streak flame (PRD 12.4 "Streak-Flamme lodert"): grey and shivering while cold,
 * glowing, flickering and sparking while it burns. Decorative; the text next to it says it all.
 */
export function StreakFlame({ lit, ignition = false, className }: StreakFlameProps) {
  const ids = useId();
  const maskId = `${ids}-sweep`;
  const gradientId = `${ids}-fire`;
  const animate = useReducedMotionConfig() !== true;
  const show = lit && ignition && animate;

  return (
    <div
      aria-hidden="true"
      data-lit={lit}
      className={cx('relative isolate grid place-items-center', className)}
    >
      <motion.span
        className="absolute inset-[14%] -z-10"
        initial={false}
        animate={{ opacity: lit ? 1 : 0, scale: lit ? 1 : 0.4 }}
        transition={{ duration: show ? durations.slow * 2 : durations.fast, ease: 'easeOut' }}
      >
        <span className="absolute inset-0 rounded-full bg-streak opacity-50 blur-glow motion-safe:animate-glow" />
      </motion.span>
      {show && <IgnitionBurst />}
      {lit && animate && <RisingEmbers delay={ignition ? 1 : 0} />}
      <motion.div
        className="relative size-full origin-bottom"
        initial={false}
        animate={show ? HOP : REST}
      >
        <svg
          viewBox={FLAME_VIEWBOX}
          className={cx('size-full overflow-visible', !lit && animate && 'animate-shiver')}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" className="[stop-color:var(--color-streak)]" />
              <stop offset="65%" className="[stop-color:var(--color-streak)]" />
              <stop offset="100%" className="[stop-color:var(--color-danger)]" />
            </linearGradient>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="-6" y="-6" width="36" height="36">
              <motion.path
                d={SWEEP_PATH}
                className="fill-fg"
                initial={false}
                animate={{ y: lit ? SWEEP_SHOWN : SWEEP_HIDDEN }}
                transition={show ? { duration: SWEEP_SECONDS, ease: 'easeOut' } : { duration: 0 }}
              />
            </mask>
          </defs>
          {/* Fades once the colour has climbed, so it never peeks out behind the flickering fire. */}
          <motion.g
            data-flame="cold"
            initial={false}
            animate={{ opacity: lit ? 0 : 1 }}
            transition={{ duration: durations.fast, delay: show ? SWEEP_SECONDS : 0 }}
          >
            <path
              d={FLAME_OUTER}
              transform={`translate(0 ${EDGE_OFFSET})`}
              className="fill-locked-edge"
            />
            <path d={FLAME_OUTER} className="fill-locked" />
            <path d={FLAME_CORE} className="fill-on-locked" />
            <path
              d={FROST}
              className="fill-none stroke-freeze opacity-70"
              strokeWidth={0.7}
              strokeLinecap="round"
            />
          </motion.g>
          <g data-flame="lit" mask={`url(#${maskId})`}>
            <g className={cx(svgFill, 'motion-safe:animate-flicker')}>
              <path
                d={FLAME_OUTER}
                transform={`translate(0 ${EDGE_OFFSET})`}
                className="fill-streak-edge"
              />
              <path d={FLAME_OUTER} fill={`url(#${gradientId})`} />
              <path
                d={SHINE}
                className="fill-none stroke-shine"
                strokeWidth={0.8}
                strokeLinecap="round"
              />
            </g>
            <g className={cx(svgFill, 'motion-safe:animate-blaze')}>
              <path d={FLAME_CORE} className="fill-streak-core" />
              <path d={HOT_CORE} className="fill-streak-glow" />
            </g>
          </g>
        </svg>
      </motion.div>
      {lit && animate && <Sparkles delay={ignition ? 0.6 : 0} />}
    </div>
  );
}

/** A shock ring and a spray of sparks that fly out and fall a little. */
function IgnitionBurst() {
  return (
    <>
      <motion.span
        data-testid="streak-shockwave"
        className="absolute size-1/2 rounded-full border-4 border-streak-core"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 2.4], opacity: [0.9, 0] }}
        transition={{ duration: durations.slow * 2, ease: 'easeOut', delay: SWEEP_SECONDS * 0.6 }}
      />
      {BURST.map(({ angle, reach, delay, star }, index) => {
        const radians = (angle * Math.PI) / 180;
        const x = Math.cos(radians) * reach;
        const y = Math.sin(radians) * reach;
        return (
          <motion.span
            key={angle}
            data-testid="streak-ember"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{
              x: ['0%', `${x}%`, `${x * 1.1}%`],
              y: ['0%', `${y}%`, `${y + BURST_FALL}%`],
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1.2, 0.3],
            }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: SWEEP_SECONDS * 0.7 + delay }}
          >
            {star ? (
              <svg
                viewBox="-8 -8 16 16"
                className="absolute top-[55%] left-1/2 size-4 -translate-1/2"
              >
                <path d={SPARKLE_PATH} className="fill-streak-glow" />
              </svg>
            ) : (
              <span
                className={cx(
                  'absolute top-[55%] left-1/2 size-2 -translate-1/2 rounded-full',
                  BURST_COLORS[index % BURST_COLORS.length],
                )}
              />
            )}
          </motion.span>
        );
      })}
    </>
  );
}

function RisingEmbers({ delay }: { delay: number }) {
  return RISING.map(({ drift, delay: start }) => (
    <motion.span
      key={start}
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ x: ['0%', `${drift}%`], y: ['0%', '-55%'], opacity: [0, 0.9, 0] }}
      transition={{
        duration: 2,
        ease: 'easeOut',
        delay: delay + start,
        repeat: Infinity,
        repeatDelay: 0.4,
      }}
    >
      <span className="absolute top-[38%] left-1/2 size-1.5 -translate-1/2 rounded-full bg-streak-core" />
    </motion.span>
  ));
}

function Sparkles({ delay }: { delay: number }) {
  return SPARKLES.map(({ left, top, size, delay: twinkle }) => (
    <motion.svg
      key={left}
      viewBox="-8 -8 16 16"
      style={{ left, top }}
      className={cx('absolute', size)}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', visualDuration: durations.base, bounce: 0.5, delay }}
    >
      <path
        d={SPARKLE_PATH}
        style={{ animationDelay: twinkle }}
        className="origin-center fill-streak-core [transform-box:fill-box] motion-safe:animate-twinkle"
      />
    </motion.svg>
  ));
}
