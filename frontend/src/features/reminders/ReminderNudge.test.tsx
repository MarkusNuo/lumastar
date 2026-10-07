import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Profile, ReminderSettings } from '../../api/types';
import { useVerificationBannerDismissed } from '../account/verification/bannerDismissed';
import {
  installFakePush,
  removeFakePush,
  SERVER_KEY,
  type FakePushOptions,
} from '../../test/fakePush';
import { profile, reminderSettings } from '../../test/fixtures';
import { jsonResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import { REMINDER_COPY } from './copy';
import { REMINDER_NUDGE_KEY, useReminderNudge, type ReminderNudgeState } from './nudgeStore';
import { ReminderNudge } from './ReminderNudge';
import { REMINDER_ROUTE } from './reminderRoutes';

interface Setup {
  nudge?: ReminderNudgeState;
  push?: FakePushOptions;
  settings?: ReminderSettings;
  me?: Profile;
}

function renderNudge({
  nudge = 'due',
  push,
  settings = reminderSettings(),
  me = profile({ onboardingCompleted: true, onboardingStep: 'done' }),
}: Setup = {}) {
  useReminderNudge.setState({ state: nudge });
  installFakePush(push);
  stubApi({
    'GET /api/me': () => jsonResponse(me),
    'GET /api/reminders': () => jsonResponse(settings),
    'GET /api/push/config': () => jsonResponse({ available: true, publicKey: SERVER_KEY }),
  });
  const view = renderRoutes(
    [
      { path: '/', element: <ReminderNudge /> },
      { path: REMINDER_ROUTE, element: screenNamed('Erinnerungen') },
    ],
    '/',
  );
  return { ...view, user: userEvent.setup() };
}

const nudge = () => screen.findByRole('region', { name: REMINDER_COPY.nudge.title });

beforeEach(() => {
  useVerificationBannerDismissed.setState({ dismissed: false });
});

afterEach(() => {
  removeFakePush();
  localStorage.clear();
});

describe('ReminderNudge', () => {
  it('asks after the first lesson and leads to the reminder settings', async () => {
    const { user, router } = renderNudge();

    await user.click(await screen.findByRole('button', { name: REMINDER_COPY.nudge.accept }));

    expect(router.state.location.pathname).toBe(REMINDER_ROUTE);
    expect(useReminderNudge.getState().state).toBe('done');
  });

  it('never comes back once dismissed', async () => {
    const { user } = renderNudge();

    await user.click(await screen.findByRole('button', { name: 'Hinweis ausblenden' }));

    expect(screen.queryByRole('region', { name: REMINDER_COPY.nudge.title })).toBeNull();
    expect(JSON.parse(localStorage.getItem(REMINDER_NUDGE_KEY) ?? '{}')).toMatchObject({
      state: { state: 'done' },
    });
  });

  it('also asks in iPhone Safari, where the settings guide to the home screen', async () => {
    renderNudge({
      push: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      },
    });

    expect(await nudge()).toBeInTheDocument();
  });

  it.each<[string, Setup]>([
    ['before the first lesson', { nudge: 'waiting' }],
    ['when the reminders are on already', { settings: reminderSettings({ enabled: true }) }],
    ['where notifications are blocked', { push: { permission: 'denied' } }],
    ['where the browser has no push', { push: { worker: false } }],
    ['while the e-mail banner asks for a confirmation', { me: profile({ emailVerified: false }) }],
  ])('stays away %s', async (_, setup) => {
    renderNudge(setup);

    // The status needs the backend's answers; give them time to arrive.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('region', { name: REMINDER_COPY.nudge.title })).toBeNull();
  });
});
