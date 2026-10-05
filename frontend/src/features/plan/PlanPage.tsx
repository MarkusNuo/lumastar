import { ArrowLeftIcon, ClockIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { LearningPath } from '../../api/types';
import { useGoBack } from '../../app/useGoBack';
import { Button } from '../../components/ui/Button';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { IconButton } from '../../components/ui/IconButton';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { MascotMessage } from '../../components/ui/MascotMessage';
import { ONBOARDING_ROUTES } from '../onboarding/onboardingRoutes';
import { PLAN_COPY } from './copy';
import { PlanHistory } from './PlanHistory';
import { pathQuery } from './planQueries';
import { buildPlanTimeline } from './timeline';
import { PlanTimeline } from './PlanTimeline';

const copy = PLAN_COPY;

/** Route `/plan`: the personal plan as a timeline up to C2 and its history (PRD F3). */
export function PlanPage() {
  const navigate = useNavigate();
  const goBack = useGoBack(ONBOARDING_ROUTES.home);
  const path = useQuery(pathQuery);

  return (
    <FocusScreen
      header={
        <>
          <IconButton icon={ArrowLeftIcon} label={copy.back} variant="ghost" onClick={goBack} />
          <h1 className="text-lead font-black">{copy.title}</h1>
        </>
      }
      className="gap-8 pt-2 pb-6"
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => void navigate(ONBOARDING_ROUTES.home, { replace: true })}
        >
          {copy.toPath}
        </Button>
      }
    >
      {path.data ? (
        <PlanOverview path={path.data} />
      ) : path.isError ? (
        <LoadFailed
          message={copy.loadFailed}
          retrying={path.isFetching}
          onRetry={() => void path.refetch()}
        />
      ) : (
        <LoadingBlock label={copy.loading} className="h-80" />
      )}
      <PlanHistory />
    </FocusScreen>
  );
}

function PlanOverview({ path }: { path: LearningPath }) {
  // Fixed for the visit, so "in ca. …" does not change while the page is open.
  const [today] = useState(() => new Date());
  return (
    <>
      <MascotMessage expression="encouraging">
        <p>{copy.route(path.currentLevel, path.targetLevel)}</p>
        <p className="flex items-center gap-1.5 text-label font-bold text-fg-muted">
          <ClockIcon aria-hidden="true" size={16} weight="bold" />
          {copy.dailyGoal(path.dailyGoalMinutes)}
        </p>
      </MascotMessage>
      <PlanTimeline bands={buildPlanTimeline(path)} targetLevel={path.targetLevel} today={today} />
    </>
  );
}
