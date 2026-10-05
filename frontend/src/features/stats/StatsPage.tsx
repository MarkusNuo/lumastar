import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { Stats } from '../../api/types';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { REVIEW_ROUTES } from '../review/reviewRoutes';
import { ActivityHeatmap } from './ActivityHeatmap';
import { STATS_COPY } from './copy';
import { ForecastCard } from './ForecastCard';
import { LevelProgressCard } from './LevelProgressCard';
import { MasteryCard } from './MasteryCard';
import { todayProgressQuery } from './progressApi';
import { statsQuery } from './statsApi';
import { practiceRoute } from './statsRoutes';
import { StatsSummary } from './StatsSummary';
import { TopErrorsCard } from './TopErrorsCard';

/** Tab "Statistik" (PRD F10): level, mastery, frequent errors, learning days and the forecast. */
export function StatsPage() {
  const stats = useQuery(statsQuery);

  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-headline font-black">{STATS_COPY.title}</h1>
      {stats.data ? (
        <StatsOverview stats={stats.data} />
      ) : stats.isError ? (
        <LoadFailed
          message={STATS_COPY.loadFailed}
          retrying={stats.isFetching}
          onRetry={() => void stats.refetch()}
        />
      ) : (
        <LoadingBlock label={STATS_COPY.loading} className="h-96" />
      )}
    </div>
  );
}

function StatsOverview({ stats }: { stats: Stats }) {
  const navigate = useNavigate();
  const today = useQuery(todayProgressQuery);

  return (
    <>
      <StatsSummary streak={today.data?.streak} learnedWords={stats.learnedWords} />
      <LevelProgressCard level={stats.level} />
      <MasteryCard areas={stats.masteryByArea} />
      <TopErrorsCard
        errors={stats.topErrors}
        onPractice={(skillTag) => void navigate(practiceRoute(skillTag))}
      />
      <ActivityHeatmap heatmap={stats.heatmap} />
      <ForecastCard forecast={stats.forecast} onReview={() => void navigate(REVIEW_ROUTES.home)} />
    </>
  );
}
