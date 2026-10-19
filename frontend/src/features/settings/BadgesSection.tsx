import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import type { EarnedBadge } from '../../api/types';
import { BandBadge } from '../../components/ui/BandBadge';
import { BADGE_BANDS } from '../../components/ui/levels';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { badgesQuery } from '../checkpoint/checkpointApi';
import { CHECKPOINT_COPY } from '../checkpoint/copy';

const copy = CHECKPOINT_COPY.profile;

/** The level badges A1 … C2: the earned ones in colour, the rest still to reach. */
export function BadgesSection() {
  const badges = useQuery(badgesQuery);
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2
        id={titleId}
        className="px-1 text-caption font-extrabold tracking-wider text-fg-muted uppercase"
      >
        {copy.title}
      </h2>
      {badges.data ? (
        <BadgeGrid earned={badges.data} />
      ) : badges.isError ? (
        <LoadFailed
          message={copy.loadFailed}
          retrying={badges.isFetching}
          onRetry={() => void badges.refetch()}
        />
      ) : (
        <LoadingBlock label={copy.loading} className="h-64" />
      )}
      <p className="px-1 text-caption font-bold text-fg-subtle">{copy.hint}</p>
    </section>
  );
}

export function BadgeGrid({ earned }: { earned: readonly EarnedBadge[] }) {
  const awardedAt = new Map(earned.map((badge) => [badge.code, badge.awardedAt]));

  return (
    <ul className="grid grid-cols-3 gap-x-2 gap-y-5 rounded-card border-2 border-border bg-surface px-3 py-5">
      {BADGE_BANDS.map((band) => {
        const awarded = awardedAt.get(band);
        return (
          <li key={band} className="flex flex-col items-center gap-1.5 text-center">
            <BandBadge band={band} locked={awarded === undefined} />
            <span className="text-caption font-extrabold text-fg-muted">
              {awarded === undefined ? copy.open : copy.earned(awarded)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
