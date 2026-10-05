import { CaretRightIcon } from '@phosphor-icons/react';
import { Link } from 'react-router';
import type { LearningPath } from '../../api/types';
import { parseLevel } from '../../app/learnerStats';
import { LevelBadge } from '../../components/ui/LevelBadge';
import { ONBOARDING_ROUTES } from '../onboarding/onboardingRoutes';
import { formatDay, nextGoal } from '../plan/estimates';
import { PATH_COPY } from './copy';

const copy = PATH_COPY.plan;

/** Top of the path: the current level and the next goal of the plan, opening the plan timeline. */
export function PlanTeaser({ path }: { path: LearningPath }) {
  const goal = nextGoal(path);
  const { level, sublevel } = parseLevel(path.currentLevel);

  return (
    <Link
      to={ONBOARDING_ROUTES.plan}
      data-tone="neutral"
      className="flex min-h-18 pressable items-center gap-3 rounded-card border-2 border-border bg-surface py-3 pr-3 pl-4"
    >
      <LevelBadge level={level} sublevel={sublevel} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-black text-fg">{copy.title}</span>
        <span className="block text-caption font-bold text-fg-muted">
          {goal ? copy.goal(goal.band, formatDay(goal.day)) : copy.open}
        </span>
      </span>
      <CaretRightIcon
        aria-hidden="true"
        size={20}
        weight="bold"
        className="shrink-0 text-fg-subtle"
      />
    </Link>
  );
}
