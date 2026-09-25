import { motion, type TargetAndTransition } from 'motion/react';
import { useId } from 'react';
import { cx } from '../../lib/cx';
import { springs } from '../../styles/motion';
import { UI_COPY } from './copy';

/*
 * Placeholder mascot: an original, chubby aurora star (PRD 12.2 leaves the final character open).
 * Everything is drawn inline so each expression can animate without extra assets.
 */

export type MascotExpression = 'happy' | 'encouraging' | 'thinking' | 'celebrating' | 'sad';

export interface MascotProps {
  expression?: MascotExpression;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Overrides the default accessible description. */
  label?: string;
  className?: string;
}

const sizeClass = { sm: 'size-16', md: 'size-24', lg: 'size-32', xl: 'size-44' } as const;

const bodyMotion: Record<MascotExpression, TargetAndTransition> = {
  happy: { rotate: 0, y: 0, scaleY: 1 },
  encouraging: { rotate: 7, y: 0, scaleY: 1 },
  thinking: { rotate: -7, y: 0, scaleY: 1 },
  celebrating: {
    rotate: [0, -9, 9, 0],
    y: [0, -10, 0],
    scaleY: 1,
    transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
  },
  sad: { rotate: 0, y: 4, scaleY: 0.95 },
};

// Five-point star with round joins (stroked with its own fill) for a soft, chubby silhouette.
const STAR_POINTS =
  '60,18 76.5,41.3 103.7,49.8 86.6,72.7 87,101.2 60,92 33,101.2 33.4,72.7 16.3,49.8 43.5,41.3';
const SPARKLE = 'M0-8Q1.6-1.6 8 0 1.6 1.6 0 8-1.6 1.6-8 0-1.6-1.6 0-8Z';

export function Mascot({ expression = 'happy', size = 'md', label, className }: MascotProps) {
  const gradientId = useId();

  return (
    <span
      role="img"
      aria-label={label ?? UI_COPY.mascot.label(expression)}
      className={cx('inline-block shrink-0 motion-safe:animate-float', sizeClass[size], className)}
    >
      <svg aria-hidden="true" viewBox="0 0 120 120" className="size-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" className="[stop-color:var(--color-mascot-top)]" />
            <stop offset="100%" className="[stop-color:var(--color-mascot-bottom)]" />
          </linearGradient>
        </defs>
        <motion.g
          animate={bodyMotion[expression]}
          transition={springs.bouncy}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        >
          <polygon
            points={STAR_POINTS}
            fill={`url(#${gradientId})`}
            stroke={`url(#${gradientId})`}
            strokeWidth={11}
            strokeLinejoin="round"
          />
          <ellipse
            cx={55}
            cy={31}
            rx={5.5}
            ry={3.2}
            transform="rotate(-40 55 31)"
            className="fill-shine"
          />
          <ellipse cx={39} cy={73} rx={6} ry={3.5} className="fill-mascot-cheek opacity-80" />
          <ellipse cx={81} cy={73} rx={6} ry={3.5} className="fill-mascot-cheek opacity-80" />
          <Eyes expression={expression} />
          <Mouth expression={expression} />
        </motion.g>
        <Extras expression={expression} />
      </svg>
    </span>
  );
}

function OpenEye({ cx: x, cy: y, lookX = 0, lookY = 0 }: EyeProps) {
  return (
    <g>
      <circle cx={x} cy={y} r={8.5} className="fill-mascot-eye" />
      <circle cx={x + lookX} cy={y + lookY} r={4.8} className="fill-mascot-pupil" />
      <circle cx={x + lookX + 1.8} cy={y + lookY - 1.8} r={1.6} className="fill-mascot-eye" />
    </g>
  );
}

interface EyeProps {
  cx: number;
  cy: number;
  lookX?: number;
  lookY?: number;
}

const strokeFeature = {
  fill: 'none',
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'stroke-mascot-pupil',
} as const;

function Eyes({ expression }: { expression: MascotExpression }) {
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
          <OpenEye cx={48} cy={60} />
          <path d="M64 61q8-8 16 0" {...strokeFeature} />
        </g>
      );
    case 'thinking':
      return (
        <g>
          <OpenEye cx={48} cy={60} lookX={2.4} lookY={-2.6} />
          <OpenEye cx={72} cy={60} lookX={2.4} lookY={-2.6} />
        </g>
      );
    case 'sad':
      return (
        <g>
          <OpenEye cx={48} cy={61} lookY={2.4} />
          <OpenEye cx={72} cy={61} lookY={2.4} />
          <path d="M39 49l13-4" {...strokeFeature} strokeWidth={3.5} />
          <path d="M81 49l-13-4" {...strokeFeature} strokeWidth={3.5} />
          <path
            d="M37 67c2.6 3.6 3.6 5.3 3.6 7a3.6 3.6 0 0 1-7.2 0c0-1.7 1-3.4 3.6-7Z"
            className="fill-mascot-tear"
          />
        </g>
      );
    case 'happy':
      return (
        <g>
          <OpenEye cx={48} cy={60} />
          <OpenEye cx={72} cy={60} />
        </g>
      );
  }
}

function Mouth({ expression }: { expression: MascotExpression }) {
  switch (expression) {
    case 'happy':
      return (
        <g>
          <path d="M49 72q11 14 22 0Z" className="fill-mascot-mouth" />
          <path d="M54.5 77.6q5.5 4.6 11 0-5.5-3-11 0Z" className="fill-mascot-tongue" />
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

function Extras({ expression }: { expression: MascotExpression }) {
  switch (expression) {
    case 'thinking':
      return (
        <g className="fill-fg-muted">
          <circle cx={101} cy={30} r={3.2} />
          <circle cx={109} cy={17} r={4.8} />
        </g>
      );
    case 'celebrating':
      return (
        <g className="fill-xp">
          <path d={SPARKLE} transform="translate(12 26)" />
          <path d={SPARKLE} transform="translate(108 22) scale(0.75)" />
          <path d={SPARKLE} transform="translate(110 92) scale(0.9)" />
          <path d={SPARKLE} transform="translate(10 94) scale(0.6)" />
        </g>
      );
    case 'encouraging':
      return <path d={SPARKLE} transform="translate(104 30) scale(0.7)" className="fill-xp" />;
    case 'sad':
    case 'happy':
      return null;
  }
}
