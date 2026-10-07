import { CheckCircleIcon, HourglassMediumIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { StatusChip } from '../../components/ui/StatusChip';
import type { Account } from '../auth/interimApi';
import { ACCOUNT_COPY } from './copy';

const copy = ACCOUNT_COPY.status;

/** Whether the account's address is confirmed, or a change to a new one is waiting. */
export function EmailStatusChip({ account }: { account: Account }) {
  if (account.pendingEmail) {
    return <StatusChip tone="secondary" icon={HourglassMediumIcon} label={copy.pending} />;
  }
  if (!account.email) return null;
  return account.emailVerified ? (
    <StatusChip tone="success" icon={CheckCircleIcon} label={copy.verified} />
  ) : (
    <StatusChip tone="warning" icon={WarningCircleIcon} label={copy.unverified} />
  );
}
