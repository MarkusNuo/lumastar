import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent } from 'react';
import { showToast } from '../../components/ui/toastStore';
import { isBackupTooLarge } from './backupFile';
import { PROFILE_COPY } from './copy';
import { importProblem, TOO_LARGE_PROBLEM, type ProblemMessage } from './importProblems';
import { uploadBackup } from './profileApi';

/** The counts take a moment longer to read than a plain confirmation. */
const IMPORTED_TOAST_MS = 6000;

/**
 * "Backup importieren": pick a file, check its size, confirm replacing the learning data, upload.
 * Afterwards every cached query is stale, because all of them describe the replaced data.
 */
export function useBackupImport() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [chosenFile, setChosenFile] = useState<File | null>(null);
  // Separate from the file, so its name stays in the dialog while the dialog closes.
  const [confirming, setConfirming] = useState(false);
  const [tooLarge, setTooLarge] = useState(false);

  const mutation = useMutation({
    mutationFn: uploadBackup,
    onSuccess: (result) => {
      showToast(PROFILE_COPY.backup.imported(result), { durationMs: IMPORTED_TOAST_MS });
      // Returned so the row stays busy until the fresh data has arrived.
      return queryClient.invalidateQueries();
    },
  });

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    // Cleared so that choosing the same file again fires another change event.
    event.currentTarget.value = '';
    if (!file) return;
    if (isBackupTooLarge(file)) {
      setTooLarge(true);
      return;
    }
    setChosenFile(file);
    setConfirming(true);
  };

  const problem: ProblemMessage | null = tooLarge
    ? TOO_LARGE_PROBLEM
    : mutation.isError
      ? importProblem(mutation.error)
      : null;

  return {
    /** Goes on the hidden file input. */
    fileInput: { ref: inputRef, onChange: onFileChange },
    choose: () => inputRef.current?.click(),
    /** A file was chosen and waits for the confirmation. */
    confirming,
    /** Name of the chosen file, for the confirmation. */
    fileName: chosenFile?.name ?? '',
    confirm: () => {
      if (confirming && chosenFile) mutation.mutate(chosenFile);
      setConfirming(false);
    },
    cancel: () => setConfirming(false),
    isPending: mutation.isPending,
    problem,
    reset: () => {
      setTooLarge(false);
      mutation.reset();
    },
  };
}
