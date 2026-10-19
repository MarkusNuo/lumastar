import { queryOptions } from '@tanstack/react-query';
import { api, unwrap, unwrapWithResponse } from '../../api/client';
import type { ImportResult } from '../../api/types';
import { filenameFromContentDisposition } from './backupFile';

/** learner_summary.md: a compact Markdown text for an AI chat. */
export const summaryQuery = queryOptions({
  queryKey: ['profile', 'summary'],
  queryFn: () => unwrap(api.GET('/api/profile/summary', { parseAs: 'text' })),
  // Every answer changes it, so opening or copying always asks for the current state.
  staleTime: 0,
});

export interface BackupDownload {
  blob: Blob;
  filename: string;
}

export async function fetchBackup(): Promise<BackupDownload> {
  const { data, response } = await unwrapWithResponse(
    api.GET('/api/profile/export', { parseAs: 'blob' }),
  );
  return {
    blob: data,
    filename: filenameFromContentDisposition(response.headers.get('Content-Disposition')),
  };
}

/** Replaces all learning data with the backup; the CSRF middleware adds the token header. */
export function uploadBackup(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  return unwrap(
    api.POST('/api/profile/import', {
      // The generated type describes the binary part as a string; openapi-fetch sends FormData as is.
      body: form as unknown as { file: string },
    }),
  );
}
