import { EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { Banner } from '../../../components/ui/Banner';
import { ACCOUNT_COPY } from '../copy';
import { useVerificationBannerDismissed } from './bannerDismissed';
import { ResendButton } from './ResendButton';
import { useVerificationBannerEmail } from './useVerificationBannerEmail';

const copy = ACCOUNT_COPY.verification;

/** Reminds a signed-in learner with an unconfirmed address to open the link from the mail. */
export function EmailVerificationBanner({ className }: { className?: string }) {
  const email = useVerificationBannerEmail();
  const dismiss = useVerificationBannerDismissed((state) => state.dismiss);

  if (!email) return null;
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
