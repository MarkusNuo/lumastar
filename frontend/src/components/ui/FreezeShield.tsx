import { cx } from '../../lib/cx';

export interface FreezeShieldProps {
  /** Ice blue while this week's streak freeze is ready; grey once it was used. */
  ready: boolean;
  className?: string;
}

/** Shield outline (viewBox 0 0 48 56); the 3D edge repeats it a little lower. */
const SHIELD = 'M24 3 42 9v17c0 13-8 22-18 27C14 48 6 39 6 26V9Z';
const EDGE_OFFSET = 3;
const CHECK = 'M16 27.5l5.5 5.5L33 21.5';
const SHINE = 'M11.5 13v12.5c0 6 2 11 5.5 15';

/** Lingora's own "Streak-Schutz" shield; decorative, the text next to it names its state. */
export function FreezeShield({ ready, className }: FreezeShieldProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 56"
      data-ready={ready}
      className={cx('overflow-visible', className)}
    >
      <path
        d={SHIELD}
        transform={`translate(0 ${EDGE_OFFSET})`}
        className={ready ? 'fill-freeze-edge' : 'fill-locked-edge'}
      />
      <path d={SHIELD} className={ready ? 'fill-freeze' : 'fill-locked'} />
      <path d={SHINE} className="fill-none stroke-shine" strokeWidth={2.5} strokeLinecap="round" />
      <path
        d={CHECK}
        className={cx('fill-none', ready ? 'stroke-on-freeze' : 'stroke-on-locked')}
        strokeWidth={4.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={ready ? undefined : '2 5'}
      />
    </svg>
  );
}
