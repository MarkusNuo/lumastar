import { SignOutIcon } from '@phosphor-icons/react';
import { Button } from '../../components/ui/Button';
import type { ButtonVariant } from '../../components/ui/buttonStyles';
import { Callout } from '../../components/ui/Callout';
import { useLogout } from '../auth/authHooks';
import { ACCOUNT_COPY } from './copy';

export interface LogoutButtonProps {
  /** Ghost where it stands below the screen's main action. */
  variant?: Extract<ButtonVariant, 'neutral' | 'ghost'>;
}

/** Signs out, and says so above the button when that did not work. */
export function LogoutButton({ variant = 'neutral' }: LogoutButtonProps) {
  const logout = useLogout();
  return (
    <>
      {logout.isError && <Callout tone="danger">{ACCOUNT_COPY.logout.failed}</Callout>}
      <Button
        variant={variant}
        size={variant === 'ghost' ? 'md' : 'lg'}
        fullWidth
        icon={SignOutIcon}
        loading={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {ACCOUNT_COPY.logout.label}
      </Button>
    </>
  );
}
