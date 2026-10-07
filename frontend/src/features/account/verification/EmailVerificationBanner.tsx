import { EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { Banner } from '../../../components/ui/Banner';
import { useMe } from '../../auth/authHooks';
import { ACCOUNT_COPY } from '../copy';
import { useVerificationBannerDismissed } from './bannerDismissed';
import { ResendButton } from './ResendButton';

const copy = ACCOUNT_COPY.verification;

/** Reminds a signed-in learner with an unconfirmed address to open the link from the mail. */
export function EmailVerificationBanner({ className }: { className?: string }) {
  const me = useMe();
  const dismissed = useVerificationBannerDismissed((state) => state.dismissed);
  const dismiss = useVerificationBannerDismissed((state) => state.dismiss);
  const email = me.data?.email;

  if (!email || me.data?.emailVerified !== false || dismissed) return null;
  return (
    <Banner
      tone="warning"
      icon={EnvelopeSimpleIcon}
      title={copy.title}
      action={<ResendButton />}
      onDismiss={dismiss}
      className={className}
    >
      {copy.text(email)}
    </Banner>
  );
}
