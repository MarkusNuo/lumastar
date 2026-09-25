import { ArrowClockwiseIcon, SignOutIcon } from '@phosphor-icons/react';
import type { Profile } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { Card } from '../../components/ui/Card';
import { LoadingDots } from '../../components/ui/LoadingDots';
import { useLogout, useMe } from '../auth/authHooks';
import { PROFILE_COPY } from './copy';

/** M0 placeholder of the profile tab: who is signed in, and the way out. */
export function ProfilePage() {
  const me = useMe();
  const logout = useLogout();

  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-headline font-black">{PROFILE_COPY.title}</h1>
      {me.data ? (
        <ProfileCard profile={me.data} />
      ) : me.isError ? (
        <div className="flex flex-col gap-3">
          <Callout tone="danger">{PROFILE_COPY.loadFailed}</Callout>
          <Button
            variant="neutral"
            icon={ArrowClockwiseIcon}
            loading={me.isFetching}
            onClick={() => void me.refetch()}
          >
            {PROFILE_COPY.retry}
          </Button>
        </div>
      ) : (
        <div role="status" className="grid h-40 place-items-center text-primary-soft">
          <LoadingDots />
          <span className="sr-only">{PROFILE_COPY.loading}</span>
        </div>
      )}
      <p className="text-label text-fg-muted">{PROFILE_COPY.comingSoon}</p>
      {logout.isError && <Callout tone="danger">{PROFILE_COPY.logoutFailed}</Callout>}
      <Button
        variant="neutral"
        size="lg"
        fullWidth
        icon={SignOutIcon}
        loading={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {PROFILE_COPY.logout}
      </Button>
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const initial = profile.displayName.charAt(0).toLocaleUpperCase('de-CH');

  return (
    <Card variant="raised" padding="lg" className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className="grid size-16 shrink-0 place-items-center rounded-full bg-linear-to-br from-secondary to-primary text-headline font-black text-on-primary"
      >
        {initial}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-title font-black">{profile.displayName}</p>
        <p className="text-label text-fg-muted">
          {profile.currentLevel ? PROFILE_COPY.level(profile.currentLevel) : PROFILE_COPY.noLevel}
        </p>
        <p className="text-label font-extrabold text-xp">{PROFILE_COPY.xp(profile.xpTotal)}</p>
      </div>
    </Card>
  );
}
