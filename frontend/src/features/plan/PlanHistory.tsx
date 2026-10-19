import {
  ArrowsClockwiseIcon,
  FastForwardIcon,
  MapTrifoldIcon,
  ScissorsIcon,
  TargetIcon,
  TrendUpIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import type { PlanChange, PlanChangeKind } from '../../api/types';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import type { Tone } from '../../components/ui/tones';
import { PLAN_COPY } from './copy';
import { planChangesQuery } from './planQueries';

const copy = PLAN_COPY.history;

const KIND_LOOK: Record<PlanChangeKind, { icon: Icon; tone: Tone }> = {
  plan_created: { icon: MapTrifoldIcon, tone: 'primary' },
  focus_inserted: { icon: TargetIcon, tone: 'warning' },
  unit_skipped: { icon: FastForwardIcon, tone: 'secondary' },
  unit_shortened: { icon: ScissorsIcon, tone: 'secondary' },
  level_changed: { icon: TrendUpIcon, tone: 'success' },
  replanned: { icon: ArrowsClockwiseIcon, tone: 'primary' },
};

const swissDateTime = new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' });

/**
 * "Plan-Verlauf": every change of the plan with its German reason, in the order of the
 * API: newest plan version first, the changes within a version as they happened.
 */
export function PlanHistory() {
  const changes = useQuery(planChangesQuery);
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2
        id={titleId}
        className="px-1 text-caption font-extrabold tracking-wider text-fg-muted uppercase"
      >
        {copy.title}
      </h2>
      {changes.data ? (
        <PlanChangeList changes={changes.data} />
      ) : changes.isError ? (
        <LoadFailed
          message={copy.loadFailed}
          retrying={changes.isFetching}
          onRetry={() => void changes.refetch()}
        />
      ) : (
        <LoadingBlock label={copy.loading} className="h-24" />
      )}
    </section>
  );
}

/** The changes of the plan, each with its kind, reason and day. */
export function PlanChangeList({ changes }: { changes: PlanChange[] }) {
  if (changes.length === 0) return <p className="px-1 text-label text-fg-muted">{copy.empty}</p>;
  return (
    <ul className="divide-y-2 divide-border overflow-hidden rounded-card border-2 border-border bg-surface">
      {changes.map((change) => {
        const look = KIND_LOOK[change.type];
        const KindIcon = look.icon;
        return (
          <li
            key={`${change.planVersion}-${change.changedAt}-${change.type}-${change.reason}`}
            className="flex items-start gap-3 px-4 py-3"
          >
            <span
              aria-hidden="true"
              data-tone={look.tone}
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-button-sm tone-solid"
            >
              <KindIcon size={20} weight="bold" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-label font-black">{copy.kinds[change.type]}</span>
              <span className="text-body text-fg">{change.reason}</span>
              <time dateTime={change.changedAt} className="text-caption font-bold text-fg-subtle">
                {swissDateTime.format(new Date(change.changedAt))}
              </time>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
