import { useMutation } from '@tanstack/react-query';
import { showToast } from '../../components/ui/toastStore';
import { saveBlob } from '../../lib/saveFile';
import { PROFILE_COPY } from './copy';
import { fetchBackup } from './profileApi';

/** "Backup herunterladen": fetches the ZIP export and saves it under the server's file name. */
export function useBackupDownload() {
  const mutation = useMutation({
    mutationFn: async () => {
      const { blob, filename } = await fetchBackup();
      saveBlob(blob, filename);
      return filename;
    },
    onSuccess: (filename) => showToast(PROFILE_COPY.backup.downloaded(filename)),
  });

  return {
    download: () => mutation.mutate(),
    isPending: mutation.isPending,
    failed: mutation.isError,
    reset: mutation.reset,
  };
}
