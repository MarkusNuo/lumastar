import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Profile } from '../../api/types';
import { ONBOARDING_OPTIONS, profile } from '../../test/fixtures';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { OnboardingPage } from './OnboardingPage';

type Routes = Parameters<typeof stubApi>[0];

function renderOnboarding(learner: Profile = profile(), routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/me': () => jsonResponse(learner),
    'GET /api/onboarding/options': () => jsonResponse(ONBOARDING_OPTIONS),
    ...routes,
  });
  const router = createMemoryRouter(
    [
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '/einstufung', element: <h1>Einstufung</h1> },
    ],
    { initialEntries: ['/onboarding'] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return { requests, router, user: userEvent.setup() };
}

const option = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });
const next = () => screen.getByRole('button', { name: 'Weiter' });

describe('OnboardingPage', () => {
  it('asks for one or more motivations with the labels of the API', async () => {
    const { user } = renderOnboarding();

    expect(
      await screen.findByRole('heading', { name: 'Warum lernst du Gheg?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Schritt 3 von 5');
    expect(next()).toBeDisabled();

    await user.click(option('Reisen'));
    await user.click(option('Familie/Partner'));
    expect(option('Reisen')).toHaveAttribute('aria-pressed', 'true');
    expect(option('Familie/Partner')).toHaveAttribute('aria-pressed', 'true');

    await user.click(option('Reisen'));
    expect(option('Reisen')).toHaveAttribute('aria-pressed', 'false');
    expect(next()).toBeEnabled();
  });

  it('saves motivations, daily goal and self-assessment, then opens the placement', async () => {
    const { user, requests, router } = renderOnboarding(profile(), {
      'PUT /api/onboarding': () => jsonResponse({ placementSkippable: false, startLevel: 'A1.3' }),
    });

    await user.click(await screen.findByRole('button', { name: /^Interesse/ }));
    await user.click(option('Familie/Partner'));
    await user.click(next());

    expect(screen.getByRole('heading', { name: /Wie viel Zeit/ })).toBeInTheDocument();
    // The profile's default goal is preselected, so this step is one tap.
    expect(option('Dranbleiben')).toHaveAttribute('aria-pressed', 'true');
    await user.click(option('Mit Schwung'));
    await user.click(next());

    expect(screen.getByRole('heading', { name: 'Wie gut kannst du schon Gheg?' })).toBeVisible();
    expect(next()).toBeDisabled();
    await user.click(option('Ich verstehe einfache Sätze'));
    await user.click(next());

    expect(await screen.findByRole('heading', { name: 'Einstufung' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/einstufung');
    const saved = requests.find((request) => request.method === 'PUT');
    expect(await saved?.json()).toEqual({
      motivations: ['family', 'interest'],
      dailyGoalMinutes: 15,
      selfAssessment: 'simple_sentences',
    });
  });

  it('keeps the answers when going back a step', async () => {
    const { user } = renderOnboarding();

    await user.click(await screen.findByRole('button', { name: /^Beruf/ }));
    await user.click(next());
    await user.click(screen.getByRole('button', { name: 'Zurück' }));

    expect(option('Beruf')).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers no way back from the first question before the answers were saved', async () => {
    renderOnboarding();

    await screen.findByRole('heading', { name: 'Warum lernst du Gheg?' });
    expect(screen.queryByRole('button', { name: 'Zurück' })).not.toBeInTheDocument();
  });

  it('leads back to the placement when changing answers given before', async () => {
    const { user, router } = renderOnboarding(
      profile({
        onboardingStep: 'placement',
        motivations: ['work'],
        selfAssessment: 'few_words',
      }),
    );

    await user.click(await screen.findByRole('button', { name: 'Zurück' }));

    expect(router.state.location.pathname).toBe('/einstufung');
  });

  it('says so when the answers cannot be saved', async () => {
    const { user } = renderOnboarding(
      profile({ motivations: ['travel'], selfAssessment: 'nothing' }),
      { 'PUT /api/onboarding': () => problemResponse({ status: 500, code: 'internal_error' }) },
    );

    await user.click(await screen.findByRole('button', { name: 'Weiter' }));
    await user.click(next());
    await user.click(next());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deine Antworten konnten nicht gespeichert werden.',
    );
  });
});
