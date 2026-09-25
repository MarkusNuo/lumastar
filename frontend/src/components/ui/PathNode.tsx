import {
  ArrowsClockwiseIcon,
  CheckIcon,
  CrownIcon,
  StarIcon,
  TargetIcon,
  TrophyIcon,
  type Icon,
} from '@phosphor-icons/react';
import { cx } from '../../lib/cx';
import { unitTone, type Tone, type UnitColor } from './tones';
import { UI_COPY } from './copy';

export type PathNodeStatus = 'locked' | 'available' | 'current' | 'completed';
export type PathNodeKind = 'lesson' | 'focus' | 'checkpoint' | 'review';

export interface PathNodeProps {
  status: PathNodeStatus;
  kind?: PathNodeKind;
  color: UnitColor;
  /** Accessible name, e.g. "Lektion 3"; the status is appended automatically. */
  label: string;
  bubbleLabel?: string;
  onClick?: () => void;
  className?: string;
}

const kindIcon: Record<PathNodeKind, Icon> = {
  lesson: StarIcon,
  focus: TargetIcon,
  checkpoint: TrophyIcon,
  review: ArrowsClockwiseIcon,
};

function nodeTone(status: PathNodeStatus, kind: PathNodeKind, color: UnitColor): Tone {
  if (status === 'locked') return 'locked';
  if (status === 'completed' && kind === 'checkpoint') return 'xp';
  return unitTone(color);
}

export function PathNode({
  status,
  kind = 'lesson',
  color,
  label,
  bubbleLabel = UI_COPY.pathNode.start,
  onClick,
  className,
}: PathNodeProps) {
  const NodeIcon = status === 'completed' && kind === 'lesson' ? CrownIcon : kindIcon[kind];
  const isCurrent = status === 'current';
  const isCheckpoint = kind === 'checkpoint';
  // Lessons show a crown and checkpoints turn gold when done; the other kinds get a check badge.
  const showDoneBadge = status === 'completed' && (kind === 'focus' || kind === 'review');

  return (
    <div
      data-tone={nodeTone(status, kind, color)}
      className={cx('relative inline-grid place-items-center', className)}
    >
      {isCurrent && (
        <span
          aria-hidden="true"
          className="absolute bottom-full left-1/2 z-10 mb-3 -translate-x-1/2 motion-safe:animate-bob"
        >
          <span className="relative block rounded-button-sm border-2 border-border bg-surface px-3.5 py-2 text-label font-black tracking-wide whitespace-nowrap text-fg uppercase shadow-float">
            {bubbleLabel}
            <span className="absolute top-full left-1/2 -mt-[7px] size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-border bg-surface" />
          </span>
        </span>
      )}
      {isCurrent && (
        <>
          {/* Circle around face and edge: the edge adds depth below, so the ring sits lower. */}
          <span
            aria-hidden="true"
            className="absolute -inset-x-3.5 -top-2.5 -bottom-4.5 rounded-full border-4 border-surface-raised"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-tone-face motion-safe:animate-pulse-ring motion-reduce:hidden"
          />
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-label={`${label}, ${UI_COPY.pathNode.status[status]}`}
        aria-current={isCurrent ? 'step' : undefined}
        className={cx(
          'relative grid pressable place-items-center rounded-full tone-solid [--press-depth:var(--spacing-edge-node)]',
          isCheckpoint ? 'size-22' : 'size-18',
        )}
      >
        <span
          aria-hidden="true"
          className="absolute top-[13%] left-[22%] h-[14%] w-[30%] -rotate-20 rounded-full bg-highlight"
        />
        <NodeIcon
          aria-hidden="true"
          size={isCheckpoint ? 40 : 34}
          weight="fill"
          className="relative"
        />
        {showDoneBadge && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 grid size-7 place-items-center rounded-full border-3 border-bg bg-xp text-on-xp"
          >
            <CheckIcon size={14} weight="bold" />
          </span>
        )}
      </button>
    </div>
  );
}
