import { TargetIcon } from '@phosphor-icons/react';
import type { FocusSuggestion } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { cx } from '../../../lib/cx';
import { LESSON_COPY } from '../copy';

const copy = LESSON_COPY.result.focus;

export interface FocusSuggestionCardProps {
  suggestion: FocusSuggestion;
  onStart: (unitId: string) => void;
  className?: string;
}

/** A focus lesson on the skill tag the lesson got wrong three times or more (PRD F7). */
export function FocusSuggestionCard({ suggestion, onStart, className }: FocusSuggestionCardProps) {
  return (
    <section
      aria-label={copy.title(suggestion.label)}
      data-tone="warning"
      className={cx('flex flex-col gap-3 rounded-card tone-outline p-4 text-left', className)}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-full tone-solid edge-3d"
        >
          <TargetIcon size={28} weight="fill" />
        </span>
        <h2 className="min-w-0">
          <span className="block text-micro font-black tracking-wider text-tone-text uppercase">
            {copy.eyebrow}
          </span>{' '}
          <span className="block text-lead font-black text-fg">{suggestion.label}</span>
        </h2>
      </div>
      <p className="text-label font-bold text-fg-muted">{copy.text}</p>
      <Button
        variant="warning"
        icon={TargetIcon}
        fullWidth
        onClick={() => onStart(suggestion.unitId)}
      >
        {copy.start}
      </Button>
    </section>
  );
}
