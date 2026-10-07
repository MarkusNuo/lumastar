import { BellSlashIcon, CloudSlashIcon } from '@phosphor-icons/react';
import { Banner } from '../../components/ui/Banner';
import { REMINDER_COPY } from './copy';
import type { DevicePlatform } from './pushDevice';

const copy = REMINDER_COPY.states;

export type ReminderBlocker = 'serverUnavailable' | 'unsupported' | 'denied';

export interface ReminderNoticeProps {
  blocker: ReminderBlocker;
  platform: DevicePlatform;
}

/** Why reminders cannot be switched on here, and what the learner can do about it. */
export function ReminderNotice({ blocker, platform }: ReminderNoticeProps) {
  switch (blocker) {
    case 'serverUnavailable':
      return (
        <Banner tone="neutral" icon={CloudSlashIcon} title={copy.serverUnavailable.title}>
          {copy.serverUnavailable.text}
        </Banner>
      );
    case 'unsupported':
      return (
        <Banner tone="neutral" icon={BellSlashIcon} title={copy.unsupported.title}>
          {copy.unsupported.text[platform]}
        </Banner>
      );
    case 'denied':
      return (
        <Banner tone="warning" icon={BellSlashIcon} title={copy.denied.title}>
          <p>{copy.denied.text}</p>
          <ol className="my-1.5 flex list-decimal flex-col gap-1 pl-5 text-fg">
            {copy.denied.steps[platform].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p>{copy.denied.after}</p>
        </Banner>
      );
  }
}
