import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningPath, Settings } from '../../api/types';
import { Toaster } from '../../components/ui/Toast';
import { useToastStore } from '../../components/ui/toastStore';
import { DEVICE_PREFERENCES_KEY, useDevicePreferences } from '../../lib/effects/devicePreferences';
import { HAPTIC_PATTERNS } from '../../lib/effects/haptics';
import { soundPlayer } from '../../lib/effects/soundPlayer';
import { ONBOARDING_OPTIONS } from '../../test/fixtures';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { SAMPLE_PATH } from '../plan/samplePlan';
import { SettingsSection } from './SettingsSection';

const SETTINGS: Settings = {
  dailyGoalMinutes: 10,
  requestRetention: 0.9,
  timeZone: 'Europe/Zurich',
};

/** The plan after doubling the goal: A1 is reached three weeks earlier. */
const FASTER_PATH: LearningPath = {
  ...SAMPLE_PATH,
  dailyGoalMinutes: 20,
  estimates: { ...SAMPLE_PATH.estimates, A1: '2026-10-26' },
};

type Routes = Parameters<typeof stubApi>[0];

function renderSettings(routes: Routes = {}) {
  let path = SAMPLE_PATH;
  const requests = stubApi({
    'GET /api/settings': () => jsonResponse(SETTINGS),
    'GET /api/onboarding/options': () => jsonResponse(ONBOARDING_OPTIONS),
    'GET /api/path': () => jsonResponse(path),
    'PUT /api/settings': async (request) => {
      const body = (await request.clone().json()) as Settings;
      if (body.dailyGoalMinutes === 20) path = FASTER_PATH;
      return jsonResponse(body);
    },
    ...routes,
  });
  const view = renderWithQueryClient(
    <>
      <SettingsSection />
      <Toaster />
    </>,
  );
  const saved = async () => {
    const put = requests.find((request) => request.method === 'PUT');
    return (await put?.clone().json()) as Settings | undefined;
  };
  return { ...view, requests, saved, user: userEvent.setup() };
}

function stubVibrate() {
  const vibrate = vi.fn(() => true);
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
  return vibrate;
}

const section = () => screen.getByRole('region', { name: 'Einstellungen' });

beforeEach(() => {
  useDevicePreferences.setState({ sound: true, haptics: true });
  useToastStore.setState({ current: null });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
  localStorage.clear();
});

describe('SettingsSection', () => {
  describe('Tagesziel', () => {
    it('shows the stored goal among 5, 10, 15 and 20 minutes', async () => {
      renderSettings();

      const goal = await within(section()).findByRole('radiogroup', { name: 'Tagesziel' });
      expect(
        within(goal)
          .getAllByRole('radio')
          .map((radio) => radio.closest('label')?.textContent),
      ).toEqual(['5 Min.', '10 Min.', '15 Min.', '20 Min.']);
      expect(within(goal).getByRole('radio', { name: '10 Min.' })).toBeChecked();
      expect(goal).toHaveAccessibleDescription('10 Min. pro Tag · Dranbleiben');
    });

    it('saves a new goal with the other settings and shows the re-estimated plan', async () => {
      const { user, saved } = renderSettings();
      const goal = await screen.findByRole('radiogroup', { name: 'Tagesziel' });

      await user.click(within(goal).getByRole('radio', { name: '20 Min.' }));

      const note = (await screen.findByText(/Lernplan angepasst/)).closest('[role="status"]');
      expect(note).toHaveTextContent('Lernplan angepasst: A1 bis ca. 26. Okt. 2026');
      expect(note).toHaveTextContent('(vorher 16. Nov. 2026)');
      expect(await saved()).toEqual({ ...SETTINGS, dailyGoalMinutes: 20 });
      expect(within(goal).getByRole('radio', { name: '20 Min.' })).toBeChecked();
      expect(goal).toHaveAccessibleDescription('20 Min. pro Tag · Volle Kraft');
    });

    it('keeps the old goal and explains when saving fails', async () => {
      const { user } = renderSettings({
        'PUT /api/settings': () => problemResponse({ status: 500, code: 'internal_error' }),
      });
      const goal = await screen.findByRole('radiogroup', { name: 'Tagesziel' });

      await user.click(within(goal).getByRole('radio', { name: '5 Min.' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Dein Tagesziel konnte nicht gespeichert werden.',
      );
      expect(within(goal).getByRole('radio', { name: '10 Min.' })).toBeChecked();
      expect(screen.queryByText(/Lernplan angepasst/)).not.toBeInTheDocument();
    });

    it('offers a retry when the settings cannot be loaded', async () => {
      renderSettings({
        'GET /api/settings': () => problemResponse({ status: 500, code: 'internal_error' }),
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Tagesziel und Behaltensrate konnten nicht geladen werden.',
      );
      expect(screen.getByRole('button', { name: 'Nochmals versuchen' })).toBeEnabled();
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });
  });

  describe('Ziel-Behaltensrate', () => {
    const openRetention = async (user: ReturnType<typeof userEvent.setup>) => {
      const toggle = await screen.findByRole('button', {
        name: 'Ziel-Behaltensrate anpassen: 90\u00a0%',
      });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      return screen.getByRole('slider', { name: 'Ziel-Behaltensrate' });
    };

    it('explains the target retention behind the advanced toggle', async () => {
      const { user } = renderSettings();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Ziel-Behaltensrate anpassen/ })).toBeEnabled(),
      );
      expect(screen.queryByRole('slider')).not.toBeInTheDocument();

      const slider = await openRetention(user);

      expect(slider).toHaveAttribute('min', '70');
      expect(slider).toHaveAttribute('max', '99');
      expect(slider).toHaveValue('90');
      expect(slider).toHaveAttribute('aria-valuetext', '90\u00a0%');
      expect(slider).toHaveAccessibleDescription(/Höher heisst: öfter wiederholen/);
      expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: /Standard/ })).not.toBeInTheDocument();
    });

    it('saves a changed rate with the other settings and confirms it', async () => {
      const { user, saved } = renderSettings();
      const slider = await openRetention(user);

      // jsdom does not move a range input with the arrow keys.
      fireEvent.change(slider, { target: { value: '85' } });
      expect(slider).toHaveAttribute('aria-valuetext', '85\u00a0%');
      await user.click(screen.getByRole('button', { name: 'Speichern' }));

      expect(await screen.findByText('Ziel-Behaltensrate gespeichert: 85 %')).toBeInTheDocument();
      expect(await saved()).toEqual({ ...SETTINGS, requestRetention: 0.85 });
      expect(
        screen.getByRole('button', { name: 'Ziel-Behaltensrate anpassen: 85\u00a0%' }),
      ).toBeVisible();
    });

    it('goes back to the default of 90 %', async () => {
      const { user } = renderSettings({
        'GET /api/settings': () => jsonResponse({ ...SETTINGS, requestRetention: 0.95 }),
      });
      const toggle = await screen.findByRole('button', {
        name: 'Ziel-Behaltensrate anpassen: 95\u00a0%',
      });
      await user.click(toggle);

      await user.click(screen.getByRole('button', { name: 'Standard (90\u00a0%)' }));

      expect(screen.getByRole('slider')).toHaveValue('90');
      expect(screen.getByRole('button', { name: 'Speichern' })).toBeEnabled();
    });
  });

  describe('device settings', () => {
    it('switches the sounds off and remembers it on this device', async () => {
      const { user } = renderSettings();

      await user.click(within(section()).getByRole('switch', { name: 'Töne' }));

      expect(screen.getByRole('switch', { name: 'Töne' })).not.toBeChecked();
      expect(useDevicePreferences.getState().sound).toBe(false);
      expect(localStorage.getItem(DEVICE_PREFERENCES_KEY)).toContain('"sound":false');
    });

    it('plays a sample when the sounds are switched back on', async () => {
      const play = vi.spyOn(soundPlayer, 'play').mockImplementation(() => undefined);
      useDevicePreferences.setState({ sound: false });
      const { user } = renderSettings();

      await user.click(screen.getByRole('switch', { name: 'Töne' }));

      expect(play).toHaveBeenCalledWith('correct');
      expect(useDevicePreferences.getState().sound).toBe(true);
    });

    it('hides "Vibration" where the device cannot vibrate', () => {
      renderSettings();

      expect(screen.queryByRole('switch', { name: 'Vibration' })).not.toBeInTheDocument();
    });

    it('offers "Vibration" where the device can vibrate and buzzes once when switched on', async () => {
      const vibrate = stubVibrate();
      useDevicePreferences.setState({ haptics: false });
      const { user } = renderSettings();

      const toggle = screen.getByRole('switch', { name: 'Vibration' });
      expect(toggle).not.toBeChecked();
      await user.click(toggle);

      expect(toggle).toBeChecked();
      expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.correct);
    });
  });
});
