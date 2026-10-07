import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { REMINDER_COPY } from '../../../features/reminders/copy';
import { InstallGuide } from '../../../features/reminders/InstallGuide';
import { InstallState } from '../../../features/reminders/InstallState';
import { NotificationPreview } from '../../../features/reminders/NotificationPreview';
import { ReminderControls } from '../../../features/reminders/ReminderControls';
import { ReminderNotice } from '../../../features/reminders/ReminderNotice';
import { ReminderNudgeBanner } from '../../../features/reminders/ReminderNudge';
import {
  reminderTimesProblem,
  type ReminderTimesDraft,
} from '../../../features/reminders/reminderTimes';
import { Specimen } from '../CatalogSection';

const DEFAULT_TIMES: ReminderTimesDraft = {
  time: '19:00',
  rescueEnabled: true,
  rescueTime: '21:30',
};

/** The settings with a working switch and times, without browser permission or backend. */
function ControlsDemo({
  initiallyOn,
  times,
}: {
  initiallyOn: boolean;
  times?: ReminderTimesDraft;
}) {
  const [on, setOn] = useState(initiallyOn);
  const [draft, setDraft] = useState(times ?? DEFAULT_TIMES);

  return (
    <ReminderControls
      on={on}
      switching={false}
      onSwitch={setOn}
      times={
        on
          ? {
              draft,
              problem: reminderTimesProblem(draft),
              onChange: (partial) => setDraft((current) => ({ ...current, ...partial })),
              onCommit: () => undefined,
            }
          : undefined
      }
    />
  );
}

function NudgeDemo() {
  const [shown, setShown] = useState(true);
  return shown ? (
    <ReminderNudgeBanner onAccept={() => setShown(false)} onDismiss={() => setShown(false)} />
  ) : (
    <Button variant="neutral" onClick={() => setShown(true)}>
      Hinweis wieder zeigen
    </Button>
  );
}

export function RemindersSection() {
  return (
    <>
      <Specimen label="Vorschau einer Erinnerung (wie die Systemmitteilung)" layout="stack">
        <NotificationPreview />
      </Specimen>
      <Specimen label="Einstellungen: aus · an · Streak-Retter zu früh" layout="stack">
        <ControlsDemo initiallyOn={false} />
        <ControlsDemo initiallyOn />
        <ControlsDemo
          initiallyOn
          times={{ time: '22:00', rescueEnabled: true, rescueTime: '21:30' }}
        />
        <Button variant="neutral" size="lg" fullWidth>
          {REMINDER_COPY.test.button}
        </Button>
      </Specimen>
      <Specimen label="Nicht möglich: Server · Browser · blockiert" layout="stack">
        <ReminderNotice blocker="serverUnavailable" platform="desktop" />
        <ReminderNotice blocker="unsupported" platform="ios" />
        <ReminderNotice blocker="denied" platform="android" />
        <ReminderNotice blocker="denied" platform="desktop" />
      </Specimen>
      <Specimen label="iPhone-Safari: erst auf den Home-Bildschirm" layout="stack">
        <InstallGuide />
      </Specimen>
      <Specimen label="Installiert · im Browser-Tab" layout="stack">
        <InstallState installed />
        <InstallState installed={false} />
      </Specimen>
      <Specimen label="Hinweis nach der ersten Lektion (einmal, schliessbar)" layout="stack">
        <NudgeDemo />
      </Specimen>
    </>
  );
}
