import {
  EnvelopeSimpleIcon,
  IdentificationBadgeIcon,
  KeyIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ActionList, ActionRow } from '../../components/ui/ActionList';
import { LoadFailed } from '../../components/ui/LoadState';
import { accountQuery } from './accountApi';
import { ACCOUNT_ROUTES } from './accountRoutes';
import { ACCOUNT_COPY } from './copy';
import { EmailStatusChip } from './EmailStatusChip';

const copy = ACCOUNT_COPY.section;

/** "Konto" on the profile tab: address and its confirmation, name, password and deletion. */
export function AccountSection() {
  const account = useQuery(accountQuery);
  const navigate = useNavigate();
  const data = account.data;
  const open = (route: string) => () => void navigate(route);

  return (
    <div className="flex flex-col gap-3">
      <ActionList title={copy.title}>
        <ActionRow
          icon={EnvelopeSimpleIcon}
          tone="unit-sky"
          label={copy.email.label}
          description={data && (data.email ?? copy.email.none)}
          status={
            data && (data.email ?? data.pendingEmail) ? (
              <EmailStatusChip account={data} />
            ) : undefined
          }
          onClick={open(ACCOUNT_ROUTES.email)}
        />
        <ActionRow
          icon={IdentificationBadgeIcon}
          tone="secondary"
          label={copy.displayName.label}
          description={data?.displayName}
          onClick={open(ACCOUNT_ROUTES.displayName)}
        />
        <ActionRow
          icon={KeyIcon}
          tone="xp"
          label={copy.password.label}
          description={copy.password.description}
          onClick={open(ACCOUNT_ROUTES.password)}
        />
        <ActionRow
          icon={TrashIcon}
          tone="danger"
          label={copy.delete.label}
          description={copy.delete.description}
          onClick={open(ACCOUNT_ROUTES.delete)}
        />
      </ActionList>
      {account.isError && (
        <LoadFailed
          message={copy.loadFailed}
          retrying={account.isFetching}
          onRetry={() => void account.refetch()}
        />
      )}
    </div>
  );
}
