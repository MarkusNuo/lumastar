import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportResult, Profile } from '../../api/types';
import { Toaster } from '../../components/ui/Toast';
import { useToastStore } from '../../components/ui/toastStore';
import { account, ONBOARDING_OPTIONS } from '../../test/fixtures';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { switchToNodeFileApi } from '../../test/nodeFileApi';
import { SAMPLE_PATH } from '../plan/samplePlan';
import { MAX_BACKUP_BYTES } from './backupFile';
import { ProfilePage } from './ProfilePage';

const PROFILE: Profile = {
  displayName: 'Mira',
  currentLevel: 'A1.2',
  xpTotal: 1234,
  dailyGoalMinutes: 10,
  motivations: [],
  onboardingCompleted: true,
  onboardingStep: 'done',
  email: 'mira@example.ch',
  emailVerified: true,
  emailRequired: false,
};

const SUMMARY = [
  '# Lernstand Mira – 25.09.2026 (Gheg, Kosovo)',
  '- Niveau: A1.2 (Ziel C2), 3 Tage Streak, 12 Wörter',
  '- Letzte typische Fehler:',
  '  - „asht“ → „âsht“ (Zirkumflex fehlt)',
  '',
].join('\n');

const IMPORT_RESULT: ImportResult = {
  schemaVersion: 1,
  exportedAt: '2026-09-24T18:30:00Z',
  imported: {
    attempts: 42,
    badges: 0,
    fsrsParams: 0,
    learningPlans: 1,
    placementAnswers: 0,
    placementTests: 0,
    planChanges: 0,
    reviewLog: 0,
    sessions: 3,
    skillMastery: 5,
    srsCards: 12,
    streakDays: 0,
    streaks: 1,
  },
};

const summaryResponse = () =>
  new Response(SUMMARY, { headers: { 'Content-Type': 'text/markdown;charset=UTF-8' } });

type Routes = Parameters<typeof stubApi>[0];

function renderProfile(routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/me': () => jsonResponse(PROFILE),
    'GET /api/badges': () => jsonResponse([]),
    'GET /api/settings': () =>
      jsonResponse({ dailyGoalMinutes: 10, requestRetention: 0.9, timeZone: 'Europe/Zurich' }),
    'GET /api/onboarding/options': () => jsonResponse(ONBOARDING_OPTIONS),
    'GET /api/path': () => jsonResponse(SAMPLE_PATH),
    'GET /api/account': () => jsonResponse(account()),
    ...routes,
  });
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        path: '/profil',
        element: (
          <>
            <ProfilePage />
            <Toaster />
          </>
        ),
      },
      { path: '/einstufung', element: <h1>Einstufung</h1> },
      { path: '/plan', element: <h1>Lernplan</h1> },
    ],
    { initialEntries: ['/profil'] },
  );
  const view = renderWithQueryClient(<RouterProvider router={router} />);
  const row = (name: string) => screen.getByRole('button', { name });
  const fileInput = () => screen.getByLabelText<HTMLInputElement>('Backup-Datei wählen');
  const count = (key: string) =>
    requests.filter((request) => `${request.method} ${new URL(request.url).pathname}` === key)
      .length;
  return { ...view, router, requests, user, row, fileInput, count };
}

async function backupFile(size?: number): Promise<File> {
  await switchToNodeFileApi();
  const file = new File(['PK'], 'lingora-export-2026-09-24.zip', { type: 'application/zip' });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
}

beforeEach(() => {
  useToastStore.setState({ current: null });
});

afterEach(() => {
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('ProfilePage', () => {
  it('shows name, level and XP of the learner', async () => {
    renderProfile();

    expect(await screen.findByText('Mira')).toBeInTheDocument();
    expect(screen.getByText('Niveau A1.2')).toBeInTheDocument();
    expect(screen.getByText(`${(1234).toLocaleString('de-CH')} XP`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeEnabled();
  });

  it('shows the earned level badges and the ones still to reach', async () => {
    renderProfile({
      'GET /api/badges': () => jsonResponse([{ code: 'A1', awardedAt: '2026-10-05T09:30:00Z' }]),
    });

    const section = await screen.findByRole('region', { name: 'Abzeichen' });
    expect(await within(section).findByRole('img', { name: 'Abzeichen A1' })).toBeInTheDocument();
    expect(within(section).getByText('seit 05.10.2026')).toBeInTheDocument();
    expect(
      within(section).getAllByRole('img', {
        name: /^Abzeichen (A2|B1|B2|C1|C2), noch nicht verdient$/,
      }),
    ).toHaveLength(5);
    expect(within(section).getAllByText('noch offen')).toHaveLength(5);
  });

  it('starts a new placement from "Neu einstufen"', async () => {
    const { user, row, router } = renderProfile();

    await user.click(row('Neu einstufen'));

    expect(router.state.location.pathname).toBe('/einstufung');
  });

  it('opens the plan timeline', async () => {
    const { user, row, router } = renderProfile();

    await user.click(row('Lernplan ansehen'));

    expect(router.state.location.pathname).toBe('/plan');
  });

  describe('KI-Zusammenfassung kopieren', () => {
    it('copies the freshly loaded summary and confirms it', async () => {
      const { user, row } = renderProfile({ 'GET /api/profile/summary': summaryResponse });

      await user.click(row('KI-Zusammenfassung kopieren'));

      expect(
        await screen.findByText('Kopiert! Füge sie in einen KI-Chat ein.'),
      ).toBeInTheDocument();
      expect(await navigator.clipboard.readText()).toBe(SUMMARY);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows the text to copy by hand when the browser refuses', async () => {
      const { user, row } = renderProfile({ 'GET /api/profile/summary': summaryResponse });
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
        new DOMException('Write permission denied.', 'NotAllowedError'),
      );

      await user.click(row('KI-Zusammenfassung kopieren'));

      const sheet = await screen.findByRole('dialog', { name: 'KI-Zusammenfassung' });
      const text = within(sheet).getByRole<HTMLTextAreaElement>('textbox', {
        name: 'Zusammenfassung als Text',
      });
      expect(text).toHaveValue(SUMMARY);
      expect(text).toHaveAttribute('readonly');
      expect(text).toHaveFocus();
      expect([text.selectionStart, text.selectionEnd]).toEqual([0, SUMMARY.length]);
      expect(text).toHaveAccessibleDescription(/Markiere den Text und kopiere ihn von Hand/);
      expect(screen.queryByText('Kopiert! Füge sie in einen KI-Chat ein.')).not.toBeInTheDocument();
    });

    it('copies from the sheet on a second tap once the text is there', async () => {
      const { user, row } = renderProfile({ 'GET /api/profile/summary': summaryResponse });
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
        new DOMException('No user gesture.', 'NotAllowedError'),
      );
      await user.click(row('KI-Zusammenfassung kopieren'));
      const sheet = await screen.findByRole('dialog', { name: 'KI-Zusammenfassung' });

      await user.click(within(sheet).getByRole('button', { name: 'Kopieren' }));

      expect(
        await screen.findByText('Kopiert! Füge sie in einen KI-Chat ein.'),
      ).toBeInTheDocument();
      expect(await navigator.clipboard.readText()).toBe(SUMMARY);
    });

    it('offers only manual copying without the Clipboard API (plain http)', async () => {
      const { user, row } = renderProfile({ 'GET /api/profile/summary': summaryResponse });
      vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue(undefined as unknown as Clipboard);

      await user.click(row('KI-Zusammenfassung kopieren'));

      const sheet = await screen.findByRole('dialog', { name: 'KI-Zusammenfassung' });
      expect(within(sheet).getByRole('textbox')).toHaveValue(SUMMARY);
      expect(within(sheet).queryByRole('button', { name: 'Kopieren' })).not.toBeInTheDocument();
      await user.click(within(sheet).getByRole('button', { name: 'Fertig' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('says so when the summary cannot be loaded', async () => {
      const { user, row } = renderProfile({
        'GET /api/profile/summary': () => problemResponse({ status: 500, code: 'internal_error' }),
      });

      await user.click(row('KI-Zusammenfassung kopieren'));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Die Zusammenfassung konnte nicht geladen werden.',
      );
    });
  });

  it('shows the summary formatted in a sheet', async () => {
    const { user, row } = renderProfile({ 'GET /api/profile/summary': summaryResponse });

    await user.click(row('Zusammenfassung ansehen'));

    const sheet = await screen.findByRole('dialog', { name: 'KI-Zusammenfassung' });
    expect(
      await within(sheet).findByRole('heading', {
        name: 'Lernstand Mira – 25.09.2026 (Gheg, Kosovo)',
        level: 3,
      }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText('„asht“ → „âsht“ (Zirkumflex fehlt)')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(row('Zusammenfassung ansehen')).toHaveFocus();
  });

  describe('Backup herunterladen', () => {
    function captureDownloads() {
      const saved: { href: string; download: string }[] = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        saved.push({ href: this.href, download: this.download });
      });
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: vi.fn(() => 'blob:lingora-backup'),
      });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
      return saved;
    }

    const zipResponse = (headers: Record<string, string>) =>
      new Response(new Blob(['PK']), {
        headers: { 'Content-Type': 'application/zip', ...headers },
      });

    it('saves the ZIP under the file name of the server', async () => {
      const saved = captureDownloads();
      const { user, row } = renderProfile({
        'GET /api/profile/export': () =>
          zipResponse({
            'Content-Disposition': 'attachment; filename="lingora-export-2026-09-25.zip"',
          }),
      });

      await user.click(row('Backup herunterladen'));

      expect(
        await screen.findByText('Backup gespeichert: lingora-export-2026-09-25.zip'),
      ).toBeInTheDocument();
      expect(saved).toEqual([
        { href: 'blob:lingora-backup', download: 'lingora-export-2026-09-25.zip' },
      ]);
    });

    it('falls back to lingora-export.zip without a file name', async () => {
      const saved = captureDownloads();
      const { user, row } = renderProfile({ 'GET /api/profile/export': () => zipResponse({}) });

      await user.click(row('Backup herunterladen'));

      await waitFor(() =>
        expect(saved.map((file) => file.download)).toEqual(['lingora-export.zip']),
      );
    });

    it('shows the busy row while loading and an error when it fails', async () => {
      let fail: (response: Response) => void = () => undefined;
      const { user, row } = renderProfile({
        'GET /api/profile/export': () =>
          new Promise<Response>((resolve) => {
            fail = resolve;
          }),
      });

      await user.click(row('Backup herunterladen'));
      await waitFor(() => expect(row('Backup herunterladen')).toHaveAttribute('aria-busy', 'true'));
      act(() => fail(problemResponse({ status: 500, code: 'internal_error' })));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Das Backup konnte nicht heruntergeladen werden.',
      );
      expect(row('Backup herunterladen')).not.toHaveAttribute('aria-busy');
    });
  });

  describe('Backup importieren', () => {
    it('rejects files over 20 MB before uploading', async () => {
      const { user, fileInput, count } = renderProfile();

      await user.upload(fileInput(), await backupFile(MAX_BACKUP_BYTES + 1));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Die Datei ist zu gross. Ein Backup darf höchstens 20 MB haben',
      );
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(count('POST /api/profile/import')).toBe(0);
    });

    it('uploads nothing when the replacement is not confirmed', async () => {
      const { user, fileInput, count } = renderProfile();

      await user.upload(fileInput(), await backupFile());
      const dialog = await screen.findByRole('alertdialog', { name: 'Backup importieren?' });
      expect(dialog).toHaveAccessibleDescription(
        'Alle aktuellen Lerndaten werden durch das Backup „lingora-export-2026-09-24.zip“ ersetzt. Fortfahren?',
      );
      await user.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(count('POST /api/profile/import')).toBe(0);
    });

    it('uploads the confirmed file with the CSRF token and refreshes every cached query', async () => {
      document.cookie = 'XSRF-TOKEN=token-123';
      const { user, fileInput, count, requests, queryClient } = renderProfile({
        'POST /api/profile/import': () => jsonResponse(IMPORT_RESULT),
      });
      await screen.findByText('Mira');
      queryClient.setQueryData(['curriculum'], { stages: [] });
      const profileLoads = count('GET /api/me');

      await user.upload(fileInput(), await backupFile());
      await user.click(await screen.findByRole('button', { name: 'Ersetzen' }));

      expect(
        await screen.findByText('Backup vom 24.09.2026 importiert: 3 Lektionen, 42 Antworten.'),
      ).toBeInTheDocument();
      const upload = requests.find((request) => request.method === 'POST');
      expect(upload?.headers.get('X-XSRF-TOKEN')).toBe('token-123');
      const part = (await upload?.formData())?.get('file');
      expect(part).toBeInstanceOf(File);
      expect((part as File).name).toBe('lingora-export-2026-09-24.zip');
      await waitFor(() => expect(count('GET /api/me')).toBe(profileLoads + 1));
      expect(queryClient.getQueryState(['curriculum'])?.isInvalidated).toBe(true);
    });

    it('explains why the server rejected the backup', async () => {
      const { user, fileInput } = renderProfile({
        'POST /api/profile/import': () =>
          problemResponse({
            status: 422,
            code: 'invalid_backup_data',
            errors: [{ field: 'data/sessions.json', message: 'missing' }],
          }),
      });

      await user.upload(fileInput(), await backupFile());
      await user.click(await screen.findByRole('button', { name: 'Ersetzen' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Das Backup enthält ungültige Daten.');
      expect(alert).toHaveTextContent('Deine Lerndaten sind unverändert.');
      await user.click(within(alert).getByText('Details'));
      expect(within(alert).getByText('data/sessions.json: missing')).toBeVisible();
    });

    it('clears an old message when the next action starts', async () => {
      const { user, fileInput, row } = renderProfile({
        'GET /api/profile/summary': summaryResponse,
      });
      await user.upload(fileInput(), await backupFile(MAX_BACKUP_BYTES + 1));
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      await user.click(row('KI-Zusammenfassung kopieren'));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
