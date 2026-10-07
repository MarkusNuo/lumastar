import { AppWindowIcon } from '@phosphor-icons/react';
import { StatusChip } from '../../components/ui/StatusChip';
import { REMINDER_COPY } from './copy';

/** Installed, reminders arrive like those of any app; in a browser tab, installing is worth it. */
export function InstallState({ installed }: { installed: boolean }) {
  return installed ? (
    <StatusChip
      tone="success"
      icon={AppWindowIcon}
      label={REMINDER_COPY.installed}
      className="self-start"
    />
  ) : (
    <p className="px-1 text-caption font-bold text-fg-subtle">{REMINDER_COPY.installTip}</p>
  );
}
