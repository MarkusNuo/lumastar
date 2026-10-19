import { expect, type APIRequestContext, type Response } from '@playwright/test';
import { unzipSync } from 'fflate';
import { BackupArchive, type BackupCounts } from './backup.ts';

/* The profile endpoints the tests call directly or watch: summary, export, import. */

const pathOf = (response: Response) => new URL(response.url()).pathname;

export const isSummaryRequest = (response: Response) =>
  response.request().method() === 'GET' && pathOf(response) === '/api/profile/summary';

export const isImport = (response: Response) =>
  response.request().method() === 'POST' && pathOf(response) === '/api/profile/import';

/** Response of POST /api/profile/import. */
export interface ImportResult {
  schemaVersion: number;
  exportedAt: string;
  imported: BackupCounts;
}

/** learner_summary.md as served for "KI-Zusammenfassung kopieren". */
export async function fetchSummary(request: APIRequestContext): Promise<string> {
  const response = await request.get('/api/profile/summary');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^text\/markdown/);
  return response.text();
}

/** The export ZIP straight from the API, without the download button. */
export async function fetchExport(request: APIRequestContext): Promise<BackupArchive> {
  const response = await request.get('/api/profile/export');
  expect(response.status()).toBe(200);
  return new BackupArchive(unzipSync(new Uint8Array(await response.body())));
}
