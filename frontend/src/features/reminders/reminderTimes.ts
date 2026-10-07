import type { ReminderSettings } from '../../api/types';

/** The times of the reminders as the learner edits them; times are HH:mm. */
export interface ReminderTimesDraft {
  time: string;
  rescueEnabled: boolean;
  rescueTime: string;
}

export type ReminderTimesProblem = 'missingTime' | 'rescueNotAfterTime';

export function draftOf({ time, rescueEnabled, rescueTime }: ReminderSettings): ReminderTimesDraft {
  return { time, rescueEnabled, rescueTime };
}

/** The backend's rule: the streak rescue comes after the daily reminder, on the same day. */
export function reminderTimesProblem(draft: ReminderTimesDraft): ReminderTimesProblem | undefined {
  if (!draft.time || (draft.rescueEnabled && !draft.rescueTime)) return 'missingTime';
  // HH:mm compares like the time it stands for.
  if (draft.rescueEnabled && draft.rescueTime <= draft.time) return 'rescueNotAfterTime';
  return undefined;
}
