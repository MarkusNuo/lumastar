import { BellRingingIcon } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { useVerificationBannerEmail } from '../account/verification/useVerificationBannerEmail';
import { REMINDER_COPY } from './copy';
import { useReminderNudge } from './nudgeStore';
import { REMINDER_ROUTE } from './reminderRoutes';
import { reminderOffer } from './reminderStatus';
import { useReminderStatus } from './useReminders';

const copy = REMINDER_COPY.nudge;

export interface ReminderNudgeBannerProps {
  onAccept: () => void;
  onDismiss: () => void;
  className?: string;
}

/** "Soll ich dich an deinen Streak erinnern?" with the way to the reminder settings. */
export function ReminderNudgeBanner({ onAccept, onDismiss, className }: ReminderNudgeBannerProps) {
  return (
    <Banner
      tone="primary"
      icon={BellRingingIcon}
      title={copy.title}
      onDismiss={onDismiss}
      className={className}
      action={
        <Button size="sm" icon={BellRingingIcon} onClick={onAccept}>
          {copy.accept}
        </Button>
      }
    >
      {copy.text}
    </Banner>
  );
}

/**
 * After the first lesson on this device, once: the suggestion to switch reminders on. It waits for
 * the e-mail banner (one notice at a time) and only comes where a tap can lead to reminders; where
 * it cannot, or they are on already, it is done without showing.
 */
export function ReminderNudge({ className }: { className?: string }) {
  const due = useReminderNudge((store) => store.state === 'due');
  const verificationShown = useVerificationBannerEmail() !== undefined;
  return due && !verificationShown ? <DueReminderNudge className={className} /> : null;
}

function DueReminderNudge({ className }: { className?: string }) {
  const navigate = useNavigate();
  const close = useReminderNudge((store) => store.close);
  const { status, settings, fetching } = useReminderStatus();
  const offer = reminderOffer(status, settings);

  // Otherwise it would wait for a chance that may come weeks later, out of context. Only fresh
  // answers count: cached ones may predate the service worker of a first visit.
  useEffect(() => {
    if (offer === 'handled' && !fetching) close();
  }, [offer, fetching, close]);

  if (offer !== 'offer') return null;
  return (
    <ReminderNudgeBanner
      className={className}
      onDismiss={close}
      onAccept={() => {
        close();
        void navigate(REMINDER_ROUTE);
      }}
    />
  );
}
