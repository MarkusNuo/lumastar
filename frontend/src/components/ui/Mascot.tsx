import { motion, useAnimate, useReducedMotion, type TargetAndTransition } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { durations, springs } from '../../styles/motion';
import { UI_COPY } from './copy';
import {
  CHEEK_RADII,
  CHEEKS,
  EYES,
  HAPPY_MOUTH,
  HAPPY_TONGUE,
  HIGHLIGHT,
  MASCOT_VIEWBOX,
  SPARKLE_PATH,
  STAR_EDGE_OFFSET,
  STAR_POSES,
  STAR_STROKE_WIDTH,
  type StarPose,
} from './mascotArt';

/*
 * Lingora's own mascot: a chubby aurora star with a 3D edge like the buttons (PRD 12.2; the final
 * character is still open, see QUESTIONS.md). Its arms (the side points) carry the body language:
 * up when celebrating, one waving when encouraging, drooping when sad. Drawn inline so every
 * expression can animate without extra assets.
 */

export type MascotExpression = 'happy' | 'encouraging' | 'thinking' | 'celebrating' | 'sad';

export interface MascotProps {
  expression?: MascotExpression;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Overrides the default accessible description. */
  label?: string;
  /** Hidden from assistive technology where the text next to it already says everything. */
  decorative?: boolean;
  className?: string;
}

const sizeClass = { sm: 'size-16', md: 'size-24', lg: 'size-32', xl: 'size-44' } as const;

const pose: Record<MascotExpression, StarPose> = {
  happy: 'rest',
  encouraging: 'wave',
  thinking: 'rest',
  celebrating: 'cheer',
  sad: 'droop',
};

const bodyMotion: Record<MascotExpression, TargetAndTransition> = {
  happy: { rotate: 0, y: 0 },
  encouraging: { rotate: 5, y: 0 },
  thinking: { rotate: -7, y: 0 },
  celebrating: {
    rotate: [0, -8, 8, 0],
    y: [0, -10, 0],
    transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
  },
  sad: { rotate: 0, y: 4 },
};

/** Squash and stretch whenever the expression changes, as if the star reacts. */
const SQUASH = { scaleX: [1, 1.08, 0.97, 1], scaleY: [1, 0.9, 1.05, 1] };

const svgBox = { transformBox: 'fill-box', transformOrigin: '50% 100%' } as const;

export function Mascot({
  expression = 'happy',
  size = 'md',
  label,
  decorative = false,
  className,
}: MascotProps) {
  const gradientId = useId();
  const reactionScope = useReaction(expression);
  const outline = { points: STAR_POSES[pose[expression]] };

  return (
    <span
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label ?? UI_COPY.mascot.label(expression) })}
      data-expression={expression}
      className={cx('inline-block shrink-0 motion-safe:animate-float', sizeClass[size], className)}
    >
      <svg aria-hidden="true" viewBox={MASCOT_VIEWBOX} className="size-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" className="[stop-color:var(--color-mascot-top)]" />
            <stop offset="100%" className="[stop-color:var(--color-mascot-bottom)]" />
          </linearGradient>
        </defs>
        <motion.g animate={bodyMotion[expression]} transition={springs.bouncy} style={svgBox}>
          <g ref={reactionScope} style={svgBox}>
            <motion.polygon
              initial={false}
              animate={outline}
              transition={springs.bouncy}
              transform={`translate(0 ${STAR_EDGE_OFFSET})`}
              strokeWidth={STAR_STROKE_WIDTH}
              strokeLinejoin="round"
              className="fill-mascot-edge stroke-mascot-edge"
            />
            <motion.polygon
              initial={false}
              animate={outline}
              transition={springs.bouncy}
              fill={`url(#${gradientId})`}
              stroke={`url(#${gradientId})`}
              strokeWidth={STAR_STROKE_WIDTH}
              strokeLinejoin="round"
            />
            <ellipse
              cx={HIGHLIGHT.cx}
              cy={HIGHLIGHT.cy}
              rx={HIGHLIGHT.rx}
              ry={HIGHLIGHT.ry}
              transform={`rotate(${HIGHLIGHT.rotate} ${HIGHLIGHT.cx} ${HIGHLIGHT.cy})`}
              className="fill-shine"
            />
            {CHEEKS.map((cheek) => (
              <ellipse
                key={cheek.cx}
                {...cheek}
                {...CHEEK_RADII}
                className="fill-mascot-cheek opacity-80"
              />
            ))}
            <Eyes expression={expression} />
            <Mouth expression={expression} />
          </g>
        </motion.g>
        <Extras expression={expression} />
      </svg>
    </span>
  );
}

function useReaction(expression: MascotExpression) {
  const [scope, animate] = useAnimate<SVGGElement>();
  const reduceMotion = useReducedMotion();
  // Compared with the previous expression instead of a "first render" flag, so the double effect
  // run of StrictMode does not squash the star on mount.
  const previous = useRef(expression);

  useEffect(() => {
    if (previous.current === expression) return;
    previous.current = expression;
    if (reduceMotion) return;
    void animate(scope.current, SQUASH, { duration: durations.slow, ease: 'easeOut' });
  }, [expression, reduceMotion, animate, scope]);

  return scope;
}

interface EyeProps {
  cx: number;
  cy: number;
  lookX?: number;
  lookY?: number;
}

function OpenEye({ cx: x, cy: y, lookX = 0, lookY = 0 }: EyeProps) {
  return (
    <g>
      <circle cx={x} cy={y} r={EYES.radius} className="fill-mascot-eye" />
      <circle cx={x + lookX} cy={y + lookY} r={EYES.pupilRadius} className="fill-mascot-pupil" />
      <circle
        cx={x + lookX + EYES.glintOffset}
        cy={y + lookY - EYES.glintOffset}
        r={EYES.glintRadius}
        className="fill-mascot-eye"
      />
    </g>
  );
}

/** Open eyes blink now and then; they close around their own centre line. */
function Blinking({ children }: { children: ReactNode }) {
  return <g className="origin-center transform-fill motion-safe:animate-blink">{children}</g>;
}

const strokeFeature = {
  fill: 'none',
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'stroke-mascot-pupil',
} as const;

function Eyes({ expression }: { expression: MascotExpression }) {
  const { left, right } = EYES;
  switch (expression) {
    case 'celebrating':
      return (
        <g>
          <path d="M40 62q8-9 16 0" {...strokeFeature} />
          <path d="M64 62q8-9 16 0" {...strokeFeature} />
        </g>
      );
    case 'encouraging':
      return (
        <g>
          <Blinking>
            <OpenEye {...left} />
          </Blinking>
          <path d="M64 61q8-8 16 0" {...strokeFeature} />
        </g>
      );
    case 'thinking':
      return (
        <Blinking>
          <OpenEye {...left} lookX={2.4} lookY={-2.6} />
          <OpenEye {...right} lookX={2.4} lookY={-2.6} />
        </Blinking>
      );
    case 'sad':
      return (
        <g>
          <Blinking>
            <OpenEye cx={left.cx} cy={left.cy + 1} lookY={2.4} />
            <OpenEye cx={right.cx} cy={right.cy + 1} lookY={2.4} />
          </Blinking>
          <path d="M39 49l13-4" {...strokeFeature} strokeWidth={3.5} />
          <path d="M81 49l-13-4" {...strokeFeature} strokeWidth={3.5} />
          <path
            d="M37 67c2.6 3.6 3.6 5.3 3.6 7a3.6 3.6 0 0 1-7.2 0c0-1.7 1-3.4 3.6-7Z"
            className="fill-mascot-tear motion-safe:animate-drip"
          />
        </g>
      );
    case 'happy':
      return (
        <Blinking>
          <OpenEye {...left} />
          <OpenEye {...right} />
        </Blinking>
      );
  }
}

function Mouth({ expression }: { expression: MascotExpression }) {
  switch (expression) {
    case 'happy':
      return (
        <g>
          <path d={HAPPY_MOUTH} className="fill-mascot-mouth" />
          <path d={HAPPY_TONGUE} className="fill-mascot-tongue" />
        </g>
      );
    case 'celebrating':
      return (
        <g>
          <path d="M45 70q15 22 30 0Z" className="fill-mascot-mouth" />
          <path d="M52 78.5q8 6.5 16 0-8-4.5-16 0Z" className="fill-mascot-tongue" />
        </g>
      );
    case 'encouraging':
      return <path d="M50 74q10 9 20 0" {...strokeFeature} />;
    case 'thinking':
      return <ellipse cx={63} cy={78} rx={3.6} ry={3} className="fill-mascot-mouth" />;
    case 'sad':
      return <path d="M51 81q9-7 18 0" {...strokeFeature} />;
  }
}

interface SparkleProps {
  x: number;
  y: number;
  scale?: number;
  /** Offsets the twinkle so several sparkles do not pulse in unison. */
  delayMs?: number;
}

function Sparkle({ x, y, scale = 1, delayMs = 0 }: SparkleProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d={SPARKLE_PATH}
        style={{ animationDelay: `${delayMs}ms` }}
        className="origin-center transform-fill motion-safe:animate-twinkle"
      />
    </g>
  );
}

function Extras({ expression }: { expression: MascotExpression }) {
  switch (expression) {
    case 'thinking':
      return (
        <g className="fill-fg-muted">
          <circle cx={101} cy={30} r={3.2} className="motion-safe:animate-dot" />
          <circle
            cx={109}
            cy={17}
            r={4.8}
            style={{ animationDelay: '160ms' }}
            className="motion-safe:animate-dot"
          />
        </g>
      );
    case 'celebrating':
      return (
        <g className="fill-xp">
          <Sparkle x={12} y={22} />
          <Sparkle x={110} y={16} scale={0.75} delayMs={350} />
          <Sparkle x={112} y={92} scale={0.9} delayMs={700} />
          <Sparkle x={8} y={92} scale={0.6} delayMs={1050} />
        </g>
      );
    case 'encouraging':
      return (
        <g className="fill-xp">
          <Sparkle x={113} y={22} scale={0.7} />
        </g>
      );
    case 'sad':
    case 'happy':
      return null;
  }
}
