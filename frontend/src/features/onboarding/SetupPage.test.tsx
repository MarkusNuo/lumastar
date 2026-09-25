import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Profile } from '../../api/types';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { authStatusQuery } from '../auth/authHooks';
import { SetupPage } from './SetupPage';

vi.mock('../../lib/celebrate', () => ({ celebrate: vi.fn() }));

const PROFILE: Profile = {
  displayName: 'Erza',
  dailyGoalMinutes: 10,
  motivations: [],
  onboardingCompleted: false,
  onboardingStep: 'profile',
  xpTotal: 0,
};

async function fillInSetup(name: string, password: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Los geht’s' }));
  await user.type(screen.getByLabelText('Dein Name'), `${name}{Enter}`);
  await user.type(screen.getByLabelText('Passwort'), password);
  await user.type(screen.getByLabelText('Passwort wiederholen'), `${password}{Enter}`);
}

describe('SetupPage', () => {
  it('walks from the welcome through name and password', async () => {
    const user = userEvent.setup();
    stubApi({});
    renderWithQueryClient(<SetupPage />);

    expect(screen.getByRole('heading', { name: 'Willkommen bei Lingora!' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Los geht’s' }));

    const next = screen.getByRole('button', { name: 'Weiter' });
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('Einrichtung');
    await user.type(screen.getByLabelText('Dein Name'), '   ');
    expect(next).toBeDisabled();
    await user.type(screen.getByLabelText('Dein Name'), 'Erza');
    await user.click(next);

    expect(screen.getByRole('heading')).toHaveTextContent('Freut mich, Erza!');
    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(screen.getByLabelText('Dein Name')).toHaveValue('   Erza');
  });

  it('creates the account with the trimmed name and signs in', async () => {
    const requests = stubApi({ 'POST /api/auth/setup': () => jsonResponse(PROFILE, 201) });
    const { queryClient } = renderWithQueryClient(<SetupPage />);

    await fillInSetup('  Erza ', 'geheim123');

    await vi.waitFor(() =>
      expect(queryClient.getQueryData(authStatusQuery.queryKey)).toEqual({
        authenticated: true,
        setupRequired: false,
        displayName: 'Erza',
      }),
    );
    expect(await requests[0]?.json()).toEqual({ displayName: 'Erza', password: 'geheim123' });
  });

  it('explains when the instance already has an account', async () => {
    stubApi({
      'POST /api/auth/setup': () => problemResponse({ status: 409, code: 'account_exists' }),
      'GET /api/auth/status': () => jsonResponse({ authenticated: false, setupRequired: false }),
    });
    renderWithQueryClient(<SetupPage />);

    await fillInSetup('Erza', 'geheim123');

    expect(await screen.findByRole('alert')).toHaveTextContent('gibt es schon ein Konto');
  });
});
