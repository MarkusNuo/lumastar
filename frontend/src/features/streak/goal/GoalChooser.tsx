import { CheckCircleIcon } from '@phosphor-icons/react';
import { useId } from 'react';
import { Callout } from '../../../components/ui/Callout';
import { SegmentedControl } from '../../../components/ui/SegmentedControl';
import { cx } from '../../../lib/cx';
import { STREAK_COPY } from '../copy';

const copy = STREAK_COPY.goal;

/** Choosing a streak goal: saved as soon as a chip is tapped (PUT /api/streak/goal). */
export interface GoalChoice {
  choose: (target: number) => void;
  /** Forgets the last choice, e.g. before the chips open again. */
  reset: () => void;
  /** The goal being saved or saved last. */
  chosen?: number;
  status: 'idle' | 'saving' | 'saved' | 'failed';
}

export interface GoalChooserProps {
  /** Names the chips, e.g. "Nächstes Ziel". */
  label: string;
  options: readonly number[];
  choice: GoalChoice;
  size?: 'md' | 'lg';
  className?: string;
}

/** The next streak goals as big chips; a tap saves the goal at once. */
export function GoalChooser({ label, options, choice, size = 'md', className }: GoalChooserProps) {
  const labelId = useId();
  const { chosen, status } = choice;

  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <p id={labelId} className="text-label font-extrabold text-fg-muted">
        {label}
      </p>
      <SegmentedControl
        aria-labelledby={labelId}
        options={options.map((target) => ({ value: target, label: copy.option(target) }))}
        value={status === 'failed' ? undefined : chosen}
        busy={status === 'saving'}
        size={size}
        onChange={choice.choose}
      />
      {status === 'failed' && <Callout tone="danger">{copy.saveFailed}</Callout>}
    </div>
  );
}

/** Confirms the saved goal; always rendered, so screen readers announce it when it fills. */
export function GoalSavedNote({ choice }: { choice: GoalChoice }) {
  const saved = choice.status === 'saved' ? choice.chosen : undefined;
  return (
    <p role="status" className="empty:hidden">
      {saved !== undefined && (
        <span
          data-tone="success"
          className="flex items-center gap-2 rounded-card-sm tone-outline px-3 py-2 text-label font-extrabold"
        >
          <CheckCircleIcon aria-hidden="true" size={20} weight="fill" className="shrink-0" />
          <span className="text-fg">{copy.saved(saved)}</span>
        </span>
      )}
    </p>
  );
}
