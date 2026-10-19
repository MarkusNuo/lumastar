import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { REVIEW_COPY } from './copy';
import { reviewSummaryQuery } from './reviewApi';
import { REVIEW_ROUTES } from './reviewRoutes';
import { ReviewSummaryCard } from './ReviewSummaryCard';

/** Tab "Wiederholen": the due items as a lesson of their own. */
export function ReviewPage() {
  const summary = useQuery(reviewSummaryQuery);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-headline font-black">{REVIEW_COPY.title}</h1>
      {summary.data ? (
        <ReviewSummaryCard
          summary={summary.data}
          onStart={() => void navigate(REVIEW_ROUTES.lesson)}
          onLearn={() => void navigate('/')}
        />
      ) : summary.isError ? (
        <LoadFailed
          message={REVIEW_COPY.loadFailed}
          retrying={summary.isFetching}
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <LoadingBlock label={REVIEW_COPY.loading} className="h-96" />
      )}
      <p className="px-2 text-center text-label font-bold text-fg-subtle">
        {REVIEW_COPY.explanation}
      </p>
    </div>
  );
}
