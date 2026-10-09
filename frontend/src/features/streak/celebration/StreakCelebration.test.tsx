import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router';
import { MotionConfig } from 'motion/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LessonStreak } from '../../../api/types';
import { celebrate } from '../../../lib/celebrate';
import { playCue } from '../../../lib/effects/playCue';
import { jsonResponse, stubApi } from '../../../test/http';
import { renderRoutes } from '../../../test/router';
import type { LessonResult } from '../../lesson/model';
import { LessonEnd } from '../../lesson/result/LessonEnd';

vi.mock('../../../lib/celebrate', () => ({ celebrate: vi.fn() }));
vi.mock('../../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
});

const EXTENDED: LessonStreak = { current: 5, previous: 4, extendedToday: true, freezeUsed: false };

const GOAL_MET: LessonResult = {
  kind: 'lesson',
  xp: { earned: 15, breakdown: { base: 10, perfectBonus: 0, speedBonus: 5 }, total: 115 },
  accuracy: 0.75,
  correctCount: 9,
  exerciseCount: 12,
  durationMs: 240_000,
  learnedItems: [],
  saved: true,
  dailyGoal: { minutesToday: 6, goalMinutes: 5, goalMet: true, justMet: true },
  streak: EXTENDED,
};

const GOAL_REACHED: LessonStreak = {
  current: 10,
  previous: 9,
  extendedToday: true,
  freezeUsed: false,
  goalReached: { target: 10, options: [20, 30, 50] },
};

const FOCUS_SUGGESTION = {
  skillTag: 'grammar.definite_article',
  label: 'Bestimmter Artikel',
  unitId: 'focus_grammar.definite_article_1',
};

/**
 * A finished lesson whose "Weiter" leads to the learning path and whose focus card starts the
 * focus lesson, as in LessonRunner.
 */
function LessonEndOnRoute({ result }: { result: LessonResult }) {
  const navigate = useNavigate();
  return (
    <LessonEnd
      result={result}
      retrying={false}
      onContinue={() => void navigate('/', { replace: true })}
      onRetrySave={vi.fn()}
      onStartFocus={(unitId) => void navigate(`/fokus/${unitId}`, { replace: true })}
    />
  );
}

function renderLessonEnd(
  streak: LessonStreak = EXTENDED,
  reducedMotion: 'user' | 'always' = 'user',
  result: LessonResult = GOAL_MET,
) {
  const rendered = renderRoutes(
    [
      {
        path: '/lektion',
        element: (
          <MotionConfig reducedMotion={reducedMotion}>
            <LessonEndOnRoute result={{ ...result, streak }} />
          </MotionConfig>
        ),
      },
      { path: '/', element: <h1>Lernpfad</h1> },
      { path: '/fokus/:unitId', element: <h1>Fokus-Lektion</h1> },
    ],
    '/lektion',
  );
  const visited: string[] = [];
  rendered.router.subscribe((state) => visited.push(state.location.pathname));
  return { user: userEvent.setup(), visited, ...rendered };
}

const learningPath = () => screen.queryByRole('heading', { name: 'Lernpfad' });
const continueButton = () => screen.getByRole('button', { name: 'Weiter' });

describe('streak celebration', () => {
  it('follows the result directly and only then opens the learning path', async () => {
    const { user, router } = renderLessonEnd();

    await user.click(continueButton());

    expect(screen.getByTestId('streak-celebration')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '5 Tage Streak!', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Streak verlängert!')).toBeInTheDocument();
    expect(learningPath()).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lektion');

    await user.click(continueButton());

    expect(router.state.location.pathname).toBe('/');
    expect(learningPath()).toBeInTheDocument();
  });

  it('starts the suggested focus lesson only after the flame, without the path in between', async () => {
    const { user, router, visited } = renderLessonEnd(EXTENDED, 'user', {
      ...GOAL_MET,
      focusSuggestion: FOCUS_SUGGESTION,
    });

    await user.click(screen.getByRole('button', { name: 'Fokus-Lektion starten' }));

    expect(screen.getByTestId('streak-celebration')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lektion');

    await user.click(continueButton());

    expect(router.state.location.pathname).toBe(`/fokus/${FOCUS_SUGGESTION.unitId}`);
    expect(screen.getByRole('heading', { name: 'Fokus-Lektion' })).toBeInTheDocument();
    expect(visited).toEqual([`/fokus/${FOCUS_SUGGESTION.unitId}`]);
  });

  it('moves the focus to the flame and on to the trophy, so screen readers announce them', async () => {
    stubApi({});
    const { user } = renderLessonEnd(GOAL_REACHED);

    await user.click(continueButton());
    expect(screen.getByRole('heading', { name: '10 Tage Streak!', level: 1 })).toHaveFocus();

    await user.click(continueButton());
    expect(
      screen.getByRole('heading', { name: 'Ziel erreicht: 10 Tage!', level: 1 }),
    ).toHaveFocus();
  });

  it('lets the cold flame catch fire with sound, vibration and flame confetti', async () => {
    const { user } = renderLessonEnd();
    await user.click(continueButton());

    expect(screen.getByTestId('streak-celebration')).toHaveAttribute('data-phase', 'intro');
    await waitFor(() => expect(playCue).toHaveBeenCalledWith('streak'));
    expect(celebrate).toHaveBeenCalledWith(expect.objectContaining({ palette: 'flame' }));
    expect(screen.getByTestId('streak-celebration')).not.toHaveAttribute('data-phase', 'intro');
  });

  it('jumps to the lit flame and the new number on a tap', async () => {
    const { user } = renderLessonEnd();
    await user.click(continueButton());
    const stage = screen.getByTestId('streak-celebration');

    fireEvent.pointerDown(stage);

    expect(stage).toHaveAttribute('data-phase', 'settled');
    expect(playCue).toHaveBeenCalledWith('streak');
    expect(stage.querySelector('[data-lit="true"]')).not.toBeNull();
  });

  it('greets the first day of a new streak', async () => {
    const { user } = renderLessonEnd({
      current: 1,
      previous: 0,
      extendedToday: true,
      freezeUsed: false,
    });
    await user.click(continueButton());

    expect(screen.getByText('Dein Streak beginnt!')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 Tag Streak!' })).toBeInTheDocument();
    expect(screen.getByText('Der erste Funke ist gezündet!')).toBeInTheDocument();
  });

  it('shows the trophy and saves the next goal when the streak reached its goal', async () => {
    const requests = stubApi({
      'PUT /api/streak/goal': () =>
        jsonResponse({ target: 30, progress: 10, reached: false, options: [20, 50, 75] }),
    });
    const { user, router } = renderLessonEnd(GOAL_REACHED);
    await user.click(continueButton());
    await user.click(continueButton());

    expect(screen.queryByTestId('streak-celebration')).not.toBeInTheDocument();
    expect(screen.getByTestId('streak-goal-reached')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ziel erreicht: 10 Tage!', level: 1 }),
    ).toBeInTheDocument();
    await waitFor(() => expect(playCue).toHaveBeenCalledWith('streakGoal'));
    const chips = screen.getByRole('radiogroup', { name: 'Nächstes Ziel' });
    expect(chips).toHaveTextContent('20 Tage30 Tage50 Tage');

    await user.click(screen.getByRole('radio', { name: '30 Tage' }));

    expect(await screen.findByText('Neues Ziel: 30 Tage')).toBeInTheDocument();
    const [request] = requests;
    expect(request?.method).toBe('PUT');
    expect(await request?.json()).toEqual({ target: 30 });
    expect(router.state.location.pathname).toBe('/lektion');

    await user.click(continueButton());

    expect(router.state.location.pathname).toBe('/');
  });

  it('lets the next goal wait for the streak screen', async () => {
    const requests = stubApi({});
    const { user, router } = renderLessonEnd(GOAL_REACHED);
    await user.click(continueButton());
    await user.click(continueButton());

    expect(
      screen.getByText('Du kannst dein nächstes Ziel auch später auf der Streak-Seite wählen.'),
    ).toBeInTheDocument();
    await user.click(continueButton());

    expect(router.state.location.pathname).toBe('/');
    expect(requests).toHaveLength(0);
  });

  it('shows the trophy of a goal only once, even when the result is shown again', async () => {
    stubApi({});
    const first = renderLessonEnd(GOAL_REACHED);
    await first.user.click(continueButton());
    await first.user.click(continueButton());
    expect(screen.getByTestId('streak-goal-reached')).toBeInTheDocument();
    first.unmount();

    const again = renderLessonEnd(GOAL_REACHED);
    await again.user.click(continueButton());
    expect(screen.getByTestId('streak-celebration')).toBeInTheDocument();
    await again.user.click(continueButton());

    expect(screen.queryByTestId('streak-goal-reached')).not.toBeInTheDocument();
    expect(again.router.state.location.pathname).toBe('/');
  });

  it('says so when the next goal could not be saved', async () => {
    stubApi({ 'PUT /api/streak/goal': () => Promise.reject(new TypeError('Failed to fetch')) });
    const { user } = renderLessonEnd(GOAL_REACHED);
    await user.click(continueButton());
    await user.click(continueButton());

    await user.click(screen.getByRole('radio', { name: '50 Tage' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Das Ziel konnte nicht gespeichert werden.',
    );
    expect(screen.getByRole('radio', { name: '50 Tage' })).not.toBeChecked();
  });
});

describe('streak celebration with reduced motion', () => {
  it('shows the lit flame and the new number at once, without sparks', async () => {
    const { user } = renderLessonEnd(undefined, 'always');
    await user.click(continueButton());
    const stage = screen.getByTestId('streak-celebration');

    expect(stage).toHaveAttribute('data-phase', 'settled');
    expect(stage.querySelector('[data-lit="true"]')).not.toBeNull();
    expect(screen.queryAllByTestId('streak-ember')).toHaveLength(0);
    // The visible number comes first, before the unit and the screen-reader title.
    expect(stage.querySelector('h1')).toHaveTextContent(/^5Tage Streak/);
    expect(stage.querySelector('h1')).toHaveFocus();
    await act(() => Promise.resolve());
    expect(playCue).toHaveBeenCalledWith('streak');
  });
});
