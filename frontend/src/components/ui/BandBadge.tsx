import { cx } from '../../lib/cx';
import { UI_COPY } from './copy';
import { levelTone, type BadgeBand } from './levels';

export interface BandBadgeProps {
  band: BadgeBand;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Not earned yet: rendered grey. */
  locked?: boolean;
  /** A light sweeps across the medal now and then, for the moment it is earned. */
  shine?: boolean;
  className?: string;
}

const sizeClass = { sm: 'w-12', md: 'w-20', lg: 'w-28', xl: 'w-40' } as const;
const textClass = {
  sm: 'text-caption',
  md: 'text-lead',
  lg: 'text-headline',
  xl: 'text-display',
} as const;

/* Own artwork: a rosette medal with two ribbon tails and a 3D edge, in the colour of its band. */
const CENTER = { x: 48, y: 44 };
const EDGE_DEPTH = 5;

/** A 24-point rosette: the outline alternates between an outer and an inner radius. */
function rosette(offsetY: number): string {
  const points = 24;
  return Array.from({ length: points }, (_, index) => {
    const radius = index % 2 === 0 ? 40 : 35.5;
    const angle = (index / points) * 2 * Math.PI - Math.PI / 2;
    const x = CENTER.x + radius * Math.cos(angle);
    const y = CENTER.y + offsetY + radius * Math.sin(angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

const ROSETTE = rosette(0);
const ROSETTE_EDGE = rosette(EDGE_DEPTH);
const RIBBON_LEFT = '31,64 17,104 29,98 36,109 47,74';
const RIBBON_RIGHT = '65,64 79,104 67,98 60,109 49,74';
const HIGHLIGHT = 'M23 36a26 26 0 0 1 37-19.5 30 30 0 0 0-33 23.5Z';

export function BandBadge({
  band,
  size = 'md',
  locked = false,
  shine = false,
  className,
}: BandBadgeProps) {
  return (
    <span
      role="img"
      aria-label={UI_COPY.bandBadge(band, locked)}
      data-tone={locked ? 'locked' : levelTone[band]}
      className={cx('relative inline-grid aspect-[96/112] shrink-0', sizeClass[size], className)}
    >
      <svg aria-hidden="true" viewBox="0 0 96 112" className="absolute inset-0 size-full">
        <polygon points={RIBBON_LEFT} strokeLinejoin="round" className="fill-tone-edge" />
        <polygon points={RIBBON_RIGHT} strokeLinejoin="round" className="fill-tone-edge" />
        <polygon
          points={ROSETTE_EDGE}
          strokeWidth={4}
          strokeLinejoin="round"
          className="fill-tone-edge stroke-tone-edge"
        />
        <polygon
          points={ROSETTE}
          strokeWidth={4}
          strokeLinejoin="round"
          className="fill-tone-face stroke-tone-face"
        />
        <circle cx={CENTER.x} cy={CENTER.y} r={26} className="fill-highlight" />
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={26}
          strokeWidth={2.5}
          strokeDasharray="1 5"
          strokeLinecap="round"
          className="fill-none stroke-tone-on opacity-40"
        />
        <path d={HIGHLIGHT} className="fill-highlight" />
      </svg>
      {shine && !locked && (
        <span
          aria-hidden="true"
          className="absolute top-[3.5%] left-[8.3%] h-[71.5%] w-[83.4%] overflow-hidden rounded-full"
        >
          <span className="block h-full w-1/4 bg-shine opacity-60 motion-safe:animate-shine motion-reduce:hidden" />
        </span>
      )}
      <span
        aria-hidden="true"
        className={cx(
          'relative grid place-items-center pb-[25%] leading-none font-black text-tone-on',
          textClass[size],
        )}
      >
        {band}
      </span>
    </span>
  );
}
