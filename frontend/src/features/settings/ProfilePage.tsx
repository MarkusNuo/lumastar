import { SignOutIcon } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { useLogout, useMe } from '../auth/authHooks';
import { PROFILE_COPY } from './copy';
import { LearningDataSection } from './LearningDataSection';
import { LearningSection } from './LearningSection';
import { ProfileHeader } from './ProfileHeader';

/**
 * Profile tab: who is learning, the plan and a new placement, the learning data (PRD F11) and the
 * way out. The settings of later milestones (daily goal, sound and haptics) get their own
 * ActionList groups between the learning data and the logout.
 */
export function ProfilePage() {
  const me = useMe();
  const logout = useLogout();

  return (
    <div className="flex flex-col gap-6 pt-6">
      <h1 className="text-headline font-black">{PROFILE_COPY.title}</h1>
      {me.data ? (
        <ProfileHeader profile={me.data} />
      ) : me.isError ? (
        <LoadFailed
          message={PROFILE_COPY.loadFailed}
          retrying={me.isFetching}
          onRetry={() => void me.refetch()}
        />
      ) : (
        <LoadingBlock label={PROFILE_COPY.loading} className="h-56" />
      )}
      <LearningSection />
      <LearningDataSection />
      <p className="px-1 text-label text-fg-muted">{PROFILE_COPY.moreSettings}</p>
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
