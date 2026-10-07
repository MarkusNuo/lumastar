import { BellRingingIcon, ClockCountdownIcon, ClockIcon, FireIcon } from '@phosphor-icons/react';
import { ActionList, SettingRow, ToggleRow } from '../../components/ui/ActionList';
import { TimeInput } from '../../components/ui/TimeInput';
import { REMINDER_COPY } from './copy';
import type { ReminderTimesDraft, ReminderTimesProblem } from './reminderTimes';
import type { ChangeOptions } from './useReminderTimes';

const copy = REMINDER_COPY;

export interface ReminderTimesControl {
  draft: ReminderTimesDraft;
  problem?: ReminderTimesProblem;
  onChange: (partial: Partial<ReminderTimesDraft>, options?: ChangeOptions) => void;
  /** The learner left a time field: save what is valid now. */
  onCommit: () => void;
}

export interface ReminderControlsProps {
  on: boolean;
  /** Switching is under way; the switch waits. */
  switching: boolean;
  /** Turning on must run within the tap: it may show the browser's permission prompt. */
  onSwitch: (on: boolean) => void;
  /** The times, shown while the reminders are on. */
  times?: ReminderTimesControl;
}

/** The switch of this device's reminders and, while they are on, their times. */
export function ReminderControls({ on, switching, onSwitch, times }: ReminderControlsProps) {
  return (
    <ActionList title={copy.title}>
      <ToggleRow
        icon={BellRingingIcon}
        tone="primary"
        label={copy.toggle.label}
        description={copy.toggle.description}
        checked={on}
        disabled={switching}
        onChange={onSwitch}
      />
      {times && <ReminderTimeRows {...times} />}
    </ActionList>
  );
}

function ReminderTimeRows({ draft, problem, onChange, onCommit }: ReminderTimesControl) {
  const timeMissing = problem === 'missingTime' && !draft.time;
  const rescueProblem = draft.rescueEnabled && problem && !timeMissing ? problem : undefined;

  return (
    <>
      <SettingRow
        icon={ClockIcon}
        tone="secondary"
        label={copy.time.label}
        description={copy.time.description}
      >
        {({ labelId, descriptionId }) => (
          <TimeField
            labelId={labelId}
            descriptionId={descriptionId}
            value={draft.time}
            problem={timeMissing ? 'missingTime' : undefined}
            onChange={(time) => onChange({ time })}
            onCommit={onCommit}
          />
        )}
      </SettingRow>
      <ToggleRow
        icon={FireIcon}
        tone="unit-coral"
        label={copy.rescue.label}
        description={copy.rescue.description(draft.rescueTime)}
        checked={draft.rescueEnabled}
        onChange={(rescueEnabled) => onChange({ rescueEnabled }, { immediately: true })}
      />
      {draft.rescueEnabled && (
        <SettingRow icon={ClockCountdownIcon} tone="unit-coral" label={copy.rescue.timeLabel}>
          {({ labelId }) => (
            <TimeField
              labelId={labelId}
              value={draft.rescueTime}
              problem={rescueProblem}
              onChange={(rescueTime) => onChange({ rescueTime })}
              onCommit={onCommit}
            />
          )}
        </SettingRow>
      )}
    </>
  );
}

interface TimeFieldProps {
  labelId: string;
  descriptionId?: string;
  value: string;
  problem?: ReminderTimesProblem;
  onChange: (value: string) => void;
  onCommit: () => void;
}

function TimeField({ labelId, descriptionId, value, problem, onChange, onCommit }: TimeFieldProps) {
  const problemId = `${labelId}-problem`;
  const describedBy = [descriptionId, problem && problemId].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <TimeInput
        aria-labelledby={labelId}
        aria-describedby={describedBy || undefined}
        invalid={problem !== undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onCommit}
      />
      {problem && (
        <p id={problemId} className="text-caption font-bold text-danger">
          {copy.problems[problem]}
        </p>
      )}
    </div>
  );
}
