import { cx } from '../../lib/cx';

export interface TrophyProps {
  /** Gold once the goal is reached; grey while it is still ahead. */
  won: boolean;
  /** A number engraved on the cup, e.g. the streak goal in days. */
  engraving?: number;
  className?: string;
}

/** The cup's outline (viewBox 0 0 64 64); the 3D edge repeats it a little lower. */
const CUP = 'M14 8h36v12c0 10-8 18-18 18S14 30 14 20Z';
const CUP_EDGE_OFFSET = 2.5;
const HANDLES = 'M15 12H8.5c0 8 3.5 13 9.5 14M49 12h6.5c0 8-3.5 13-9.5 14';
const STEM = 'M28 37h8l-1.5 9h-5Z';
const SHINE = 'M18.5 25.5c1.6 3.6 4.6 6.2 8.5 7.2';

/** Lumastar's own trophy for the streak goal (PRD 12.1 "Belohnung sichtbar machen"); decorative. */
export function Trophy({ won, engraving, className }: TrophyProps) {
  const face = won ? 'fill-xp' : 'fill-locked';
  const edge = won ? 'fill-xp-edge' : 'fill-locked-edge';

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      data-won={won}
      className={cx('overflow-visible', className)}
    >
      <path
        d={HANDLES}
        className={cx('fill-none', won ? 'stroke-xp-edge' : 'stroke-locked-edge')}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <rect x="17" y="51" width="30" height="10" rx="3" className={edge} />
      <rect x="20" y="46" width="24" height="7" rx="2.5" className={face} />
      <path d={STEM} className={edge} />
      <path d={CUP} transform={`translate(0 ${CUP_EDGE_OFFSET})`} className={edge} />
      <path d={CUP} className={face} />
      <path d={SHINE} className="fill-none stroke-shine" strokeWidth={2.5} strokeLinecap="round" />
      {engraving !== undefined && (
        <text
          x="32"
          y="22"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={15}
          className={cx('font-black', won ? 'fill-on-xp' : 'fill-on-locked')}
        >
          {engraving}
        </text>
      )}
    </svg>
  );
}
