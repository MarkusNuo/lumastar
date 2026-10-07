import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/Button';
import type { ButtonSize, ButtonVariant } from '../../../components/ui/buttonStyles';
import { Callout } from '../../../components/ui/Callout';
import { ACCOUNT_COPY } from '../copy';
import { useResendVerification } from './useResendVerification';

const copy = ACCOUNT_COPY.verification;

export interface ResendButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/** Sends the verification mail again; waits out the shared cooldown with a visible countdown. */
export function ResendButton({ variant = 'neutral', size = 'sm', fullWidth }: ResendButtonProps) {
  const resend = useResendVerification();

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        icon={resend.coolingDown ? undefined : PaperPlaneTiltIcon}
        loading={resend.pending}
        disabled={resend.coolingDown}
        onClick={resend.send}
      >
        {resend.coolingDown ? copy.wait(resend.countdown) : copy.resend}
      </Button>
      {resend.failed && <Callout tone="danger">{copy.failed}</Callout>}
    </div>
  );
}
