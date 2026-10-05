import { ArrowsClockwiseIcon, CalendarCheckIcon, CardsIcon, PathIcon } from '@phosphor-icons/react';
import { useId } from 'react';
import type { ReviewSummary } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Mascot, type MascotExpression } from '../../components/ui/Mascot';
import { StatCard } from '../../components/ui/StatCard';
import { REVIEW_COPY } from './copy';
import { reviewState, type ReviewState } from './reviewState';

export interface ReviewSummaryCardProps {
  summary: ReviewSummary;
  /** Starts a review lesson of the due items. */
  onStart: () => void;
  /** Nothing due: back to the learning path for new content. */
  onLearn: () => void;
}

const mascot: Record<ReviewState, MascotExpression> = {
  due: 'encouraging',
  allDone: 'celebrating',
  empty: 'thinking',
};

const count = (value: number) => value.toLocaleString('de-CH');

/** The review tab's card (PRD F8): what is due now, tomorrow and in total, then one action. */
export function ReviewSummaryCard({ summary, onStart, onLearn }: ReviewSummaryCardProps) {
  const state = reviewState(summary);
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-5">
      <Card variant="raised" padding="lg" className="flex flex-col items-center gap-5 text-center">
        <Mascot expression={mascot[state]} size="lg" />
        <ReviewHeadline state={state} summary={summary} titleId={titleId} />
        {state !== 'empty' && (
          <div className="grid w-full grid-cols-2 gap-3">
            <StatCard label={REVIEW_COPY.stats.tomorrow} icon={CalendarCheckIcon} tone="secondary">
              {count(summary.dueTomorrow)}
            </StatCard>
            <StatCard label={REVIEW_COPY.stats.total} icon={CardsIcon} tone="primary">
              {count(summary.totalCards)}
            </StatCard>
          </div>
        )}
      </Card>
      {/* Below the card, so the big label fits on one line at 360 px. */}
      {state === 'due' ? (
        <Button variant="primary" size="lg" fullWidth icon={ArrowsClockwiseIcon} onClick={onStart}>
          {REVIEW_COPY.due.start}
        </Button>
      ) : (
        <Button variant="neutral" size="lg" fullWidth icon={PathIcon} onClick={onLearn}>
          {state === 'allDone' ? REVIEW_COPY.allDone.learn : REVIEW_COPY.empty.learn}
        </Button>
      )}
    </section>
  );
}

interface ReviewHeadlineProps {
  state: ReviewState;
  summary: ReviewSummary;
  titleId: string;
}

function ReviewHeadline({ state, summary, titleId }: ReviewHeadlineProps) {
  if (state === 'due') {
    return (
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="flex flex-col items-center">
          <span className="text-display font-black text-secondary tabular-nums">
            {count(summary.dueNow)}
          </span>{' '}
          <span className="text-title font-black">{REVIEW_COPY.due.label(summary.dueNow)}</span>
        </h2>
        <p className="text-body text-fg-muted">{REVIEW_COPY.due.text}</p>
      </div>
    );
  }
  const allDone = state === 'allDone';
  return (
    <div className="flex flex-col gap-1">
      <h2 id={titleId} className="text-title font-black">
        {allDone ? REVIEW_COPY.allDone.title : REVIEW_COPY.empty.title}
      </h2>
      <p className="text-body font-bold text-fg-muted">
        {allDone ? REVIEW_COPY.allDone.text : REVIEW_COPY.empty.text}
      </p>
    </div>
  );
}
