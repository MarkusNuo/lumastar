import { BellRingingIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { ActionRow } from '../../components/ui/ActionList';
import { REMINDER_COPY } from './copy';
import { pushDeviceQuery } from './pushDevice';
import { reminderSettingsQuery } from './remindersApi';
import { REMINDER_ROUTE } from './reminderRoutes';

const copy = REMINDER_COPY.row;

/** "Erinnerungen" in the profile's settings: whether this device reminds, and when. */
export function ReminderRow() {
  const navigate = useNavigate();
  const settings = useQuery(reminderSettingsQuery);
  const device = useQuery(pushDeviceQuery);
  const subscribed = device.data?.permission === 'granted' && device.data.subscription !== null;
  const on = settings.data?.enabled === true && subscribed;

  return (
    <ActionRow
      icon={BellRingingIcon}
      tone="unit-indigo"
      label={copy.label}
      description={settings.data && device.data && (on ? copy.on(settings.data.time) : copy.off)}
      onClick={() => void navigate(REMINDER_ROUTE)}
    />
  );
}
