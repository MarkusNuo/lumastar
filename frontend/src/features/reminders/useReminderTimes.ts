import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { ReminderSettings } from '../../api/types';
import { showToast } from '../../components/ui/toastStore';
import { REMINDER_COPY } from './copy';
import { draftOf, reminderTimesProblem, type ReminderTimesDraft } from './reminderTimes';
import { reminderSettingsQuery, useSaveReminderSettings } from './remindersApi';

/** A time picker reports every turn of its wheel; the save waits until the learner stops. */
export const SAVE_DELAY_MS = 800;

export interface ChangeOptions {
  /** Save at once, e.g. for a switch, instead of after a pause. */
  immediately?: boolean;
}

/**
 * The reminder times as the learner edits them. Valid changes are saved after a short pause, when
 * the field loses focus or when the screen closes; invalid ones wait for a fix.
 */
export function useReminderTimes(settings: ReminderSettings) {
  const queryClient = useQueryClient();
  const save = useSaveReminderSettings();
  const [draft, setDraft] = useState(() => draftOf(settings));
  const unsaved = useRef<ReminderTimesDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { mutate } = save;

  const commit = useRef(() => {
    clearTimeout(timer.current);
    const next = unsaved.current;
    unsaved.current = null;
    const current = queryClient.getQueryData(reminderSettingsQuery.queryKey);
    if (!next || !current || reminderTimesProblem(next)) return;
    if (sameTimes(next, current)) return;
    mutate({ ...current, ...next }, { onSuccess: () => showToast(REMINDER_COPY.saved) });
  });

  useEffect(() => {
    const flush = commit.current;
    return () => flush();
  }, []);

  const change = (
    partial: Partial<ReminderTimesDraft>,
    { immediately = false }: ChangeOptions = {},
  ) => {
    const next = { ...draft, ...partial };
    setDraft(next);
    unsaved.current = next;
    clearTimeout(timer.current);
    if (immediately) commit.current();
    else timer.current = setTimeout(commit.current, SAVE_DELAY_MS);
  };

  return {
    draft,
    problem: reminderTimesProblem(draft),
    change,
    commit: () => commit.current(),
    saveFailed: save.isError,
  };
}

function sameTimes(draft: ReminderTimesDraft, settings: ReminderSettings): boolean {
  return (
    draft.time === settings.time &&
    draft.rescueEnabled === settings.rescueEnabled &&
    draft.rescueTime === settings.rescueTime
  );
}
