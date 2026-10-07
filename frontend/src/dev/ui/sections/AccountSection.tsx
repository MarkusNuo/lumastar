import { EnvelopeSimpleIcon, PaperPlaneTiltIcon, SignInIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Banner } from '../../../components/ui/Banner';
import { Button } from '../../../components/ui/Button';
import { ButtonLink } from '../../../components/ui/ButtonLink';
import { TextLink } from '../../../components/ui/TextLink';
import { showToast } from '../../../components/ui/toastStore';
import { ACCOUNT_COPY } from '../../../features/account/copy';
import { EmailStatusChip } from '../../../features/account/EmailStatusChip';
import { Specimen } from '../CatalogSection';

// Synthetic account in the shape of GET /api/account.
const SAMPLE_ACCOUNT = {
  email: 'mira@example.ch',
  emailVerified: true,
  displayName: 'Mira',
  createdAt: '2026-10-07T08:00:00Z',
};

function VerificationBannerDemo() {
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const copy = ACCOUNT_COPY.verification;

  if (dismissed) {
    return (
      <Button variant="neutral" onClick={() => setDismissed(false)}>
        Banner wieder zeigen
      </Button>
    );
  }
  return (
    <Banner
      tone="warning"
      icon={EnvelopeSimpleIcon}
      title={copy.title}
      onDismiss={() => setDismissed(true)}
      action={
        <Button
          variant="neutral"
          size="sm"
          icon={sent ? undefined : PaperPlaneTiltIcon}
          disabled={sent}
          onClick={() => {
            setSent(true);
            showToast(copy.sent);
          }}
        >
          {sent ? copy.wait('1:00') : copy.resend}
        </Button>
      }
    >
      {copy.text(SAMPLE_ACCOUNT.email)}
    </Banner>
  );
}

export function AccountSection() {
  return (
    <>
      <Specimen label="Status der E-Mail-Adresse">
        <EmailStatusChip account={SAMPLE_ACCOUNT} />
        <EmailStatusChip account={{ ...SAMPLE_ACCOUNT, emailVerified: false }} />
        <EmailStatusChip account={{ ...SAMPLE_ACCOUNT, pendingEmail: 'neu@example.ch' }} />
      </Specimen>
      <Specimen label="Banner: E-Mail bestätigen (schliessbar, mit Wartezeit)" layout="stack">
        <VerificationBannerDemo />
      </Specimen>
      <Specimen label="Links: als Button · im Text" layout="stack">
        <ButtonLink to="/dev/ui" size="lg" fullWidth icon={SignInIcon}>
          Anmelden
        </ButtonLink>
        <ButtonLink to="/dev/ui" variant="neutral" size="lg" fullWidth>
          Ich habe schon ein Konto
        </ButtonLink>
        <p className="text-center text-label font-bold text-fg-muted">
          Noch kein Konto? <TextLink to="/dev/ui">Konto erstellen</TextLink>
        </p>
      </Specimen>
    </>
  );
}
