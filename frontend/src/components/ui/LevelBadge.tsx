import { cx } from '../../lib/cx';
import { levelTone, type CefrLevel } from './levels';
import { UI_COPY } from './copy';

export type LevelSublevel = 1 | 2 | 3;

export interface LevelBadgeProps {
  level: CefrLevel;
  /** Sub-stage within the level (A1.1-A1.3), shown as pips from size md. */
  sublevel?: LevelSublevel;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Not yet reached: rendered grey. */
  locked?: boolean;
  className?: string;
}

const sizeClass = { sm: 'w-8', md: 'w-12', lg: 'w-18', xl: 'w-36' } as const;
const textClass = {
  sm: 'text-micro',
  md: 'text-label',
  lg: 'text-title',
  xl: 'text-display',
} as const;
const pipClass = {
  sm: '',
  md: 'mt-1 gap-0.5 *:size-1.5',
  lg: 'mt-1 gap-0.5 *:size-1.5',
  xl: 'mt-2 gap-1.5 *:size-3',
} as const;
const SUBLEVELS: readonly LevelSublevel[] = [1, 2, 3];

// Pointy-top hexagon; the edge copy sits 4 units lower to create the 3D base.
const HEXAGON = '24,5 42,15.5 42,36.5 24,47 6,36.5 6,15.5';
const HEXAGON_EDGE = '24,9 42,19.5 42,40.5 24,51 6,40.5 6,19.5';
const HIGHLIGHT = 'M11 18.5 24 11l13 7.5v4.5H11Z';

export function LevelBadge({
  level,
  sublevel,
  size = 'md',
  locked = false,
  className,
}: LevelBadgeProps) {
  const name = sublevel ? `${level}.${sublevel}` : level;
  const showPips = sublevel !== undefined && size !== 'sm';

  return (
    <span
      role="img"
      aria-label={UI_COPY.levelBadge(name, locked)}
      data-tone={locked ? 'locked' : levelTone[level]}
      className={cx('relative inline-grid aspect-[48/56] shrink-0', sizeClass[size], className)}
    >
      <svg aria-hidden="true" viewBox="0 0 48 56" className="absolute inset-0 size-full">
        <polygon
          points={HEXAGON_EDGE}
          strokeWidth={6}
          strokeLinejoin="round"
          className="fill-tone-edge stroke-tone-edge"
        />
        <polygon
          points={HEXAGON}
          strokeWidth={6}
          strokeLinejoin="round"
          className="fill-tone-face stroke-tone-face"
        />
        <path d={HIGHLIGHT} className="fill-highlight" />
      </svg>
      <span
        aria-hidden="true"
        className="relative flex flex-col items-center justify-center pb-[18%] text-tone-on"
      >
        <span className={cx('leading-none font-black', textClass[size])}>{level}</span>
        {showPips && (
          <span className={cx('flex', pipClass[size])}>
            {SUBLEVELS.map((pip) => (
              <span
                key={pip}
                className={cx('rounded-full bg-tone-on', pip > sublevel && 'opacity-30')}
              />
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
