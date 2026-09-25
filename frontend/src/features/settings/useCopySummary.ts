import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../../components/ui/toastStore';
import { copyToClipboard } from '../../lib/clipboard';
import { PROFILE_COPY } from './copy';
import { summaryQuery } from './profileApi';

export interface CopySummaryOptions {
  /** Called with the text when the browser does not let the app copy it. */
  onManualCopy: (text: string) => void;
}

/** "KI-Zusammenfassung kopieren": loads the summary (unless given) and puts it on the clipboard. */
export function useCopySummary({ onManualCopy }: CopySummaryOptions) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (text: string | undefined) => {
      const summary = text ?? (await queryClient.query(summaryQuery));
      return { summary, copied: await copyToClipboard(summary) };
    },
    onSuccess: ({ summary, copied }) => {
      if (copied) showToast(PROFILE_COPY.summary.copied);
      else onManualCopy(summary);
    },
  });

  return {
    /** Copies `text`, or the freshly loaded summary without it. */
    copy: (text?: string) => mutation.mutate(text),
    isPending: mutation.isPending,
    failed: mutation.isError,
    reset: mutation.reset,
  };
}
