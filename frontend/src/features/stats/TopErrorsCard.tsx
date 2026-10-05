import { TargetIcon } from '@phosphor-icons/react';
import type { FrequentError } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Mascot } from '../../components/ui/Mascot';
import { MeterBar } from '../../components/ui/MeterBar';
import { StatsSection } from './StatsSection';
import { STATS_COPY } from './copy';

const copy = STATS_COPY.errors;

export interface TopErrorsCardProps {
  errors: readonly FrequentError[];
  /** Starts a practice lesson on the skill tag ("Gezielt üben"). */
  onPractice: (skillTag: string) => void;
}

/** The five skill tags with the most wrong first answers of the last 30 days (PRD F10). */
export function TopErrorsCard({ errors, onPractice }: TopErrorsCardProps) {
  return (
    <StatsSection title={copy.title} subtitle={copy.subtitle}>
      {errors.length === 0 ? (
        <div className="flex items-center gap-4 rounded-card border-2 border-border bg-surface p-4">
          <Mascot expression="celebrating" size="sm" />
          <div className="min-w-0">
            <p className="text-body font-black">{copy.emptyTitle}</p>
            <p className="text-label font-bold text-fg-muted">{copy.emptyText}</p>
          </div>
        </div>
      ) : (
        <ol className="divide-y-2 divide-border overflow-hidden rounded-card border-2 border-border bg-surface">
          {errors.map((error) => (
            <ErrorRow key={error.skillTag} error={error} onPractice={onPractice} />
          ))}
        </ol>
      )}
    </StatsSection>
  );
}

function ErrorRow({
  error,
  onPractice,
}: {
  error: FrequentError;
  onPractice: (tag: string) => void;
}) {
  const percent = Math.round(error.errorRate * 100);
  const { practice } = error;

  return (
    <li className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-extrabold text-fg">{error.label}</p>
          <p className="text-caption font-bold text-fg-muted">
            {copy.detail(error.errors, error.attempts)}
            {error.categoryLabel && error.categoryLabel !== error.label && (
              <> · {error.categoryLabel}</>
            )}
          </p>
        </div>
        <span aria-hidden="true" className="text-lead font-black text-danger tabular-nums">
          {copy.rate(percent)}
        </span>
      </div>
      <MeterBar
        tone="danger"
        label={copy.rateLabel(error.label)}
        value={error.errorRate}
        valueText={copy.rate(percent)}
      />
      {practice ? (
        <Button
          variant="warning"
          size="sm"
          icon={TargetIcon}
          aria-label={copy.practiceLabel(error.label)}
          onClick={() => onPractice(practice.skillTag)}
          className="self-start"
        >
          {copy.practice}
        </Button>
      ) : (
        <p className="text-caption font-bold text-fg-subtle">{copy.noPractice}</p>
      )}
    </li>
  );
}
