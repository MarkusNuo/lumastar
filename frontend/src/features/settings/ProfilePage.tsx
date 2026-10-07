import { SignOutIcon } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { AccountSection } from '../account/AccountSection';
import { useLogout, useMe } from '../auth/authHooks';
import { LegalLinks } from '../legal/LegalLinks';
import { BadgesSection } from './BadgesSection';
import { PROFILE_COPY } from './copy';
import { LearningDataSection } from './LearningDataSection';
import { LearningSection } from './LearningSection';
import { ProfileHeader } from './ProfileHeader';
import { SettingsSection } from './SettingsSection';

/**
 * Profile tab: who is learning, the level badges, the plan and a new placement, the learning data
 * (PRD F11), the settings (daily goal, sounds, vibration, target retention), the account and the
 * way out.
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
      <BadgesSection />
      <LearningSection />
      <LearningDataSection />
      <SettingsSection />
      <AccountSection />
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
      <LegalLinks />
    </div>
  );
}
