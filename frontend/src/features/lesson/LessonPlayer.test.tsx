import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AttemptResponse, LessonResultResponse } from '../../api/types';
import { playCue } from '../../lib/effects/playCue';
import { jsonResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { EMPTY_LEXICON } from './evaluation/standardFormLexicon';
import { LessonPlayer } from './LessonPlayer';
import type { Lesson } from './model';
import { SAMPLE_FILL_GAP_CHOICES, SAMPLE_MULTIPLE_CHOICE } from './sampleExercises';

vi.mock('../../lib/celebrate', () => ({ celebrate: vi.fn() }));
vi.mock('../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

const SESSION_ID = '5b0c8a4e-0000-4000-8000-000000000001';
const ATTEMPTS = `POST /api/lessons/${SESSION_ID}/attempts`;
const COMPLETE = `POST /api/lessons/${SESSION_ID}/complete`;

const LESSON: Lesson = {
  sessionId: SESSION_ID,
  unitId: 'a1_u01_greetings',
  kind: 'lesson',
  exercises: [SAMPLE_MULTIPLE_CHOICE, SAMPLE_FILL_GAP_CHOICES],
};

const RESULT: LessonResultResponse = {
  kind: 'lesson',
  xpEarned: 15,
  xpBreakdown: { base: 10, perfectBonus: 0, speedBonus: 5 },
  accuracy: 0.5,
  durationMs: 75_000,
  correctCount: 1,
  exerciseCount: 2,
  learnedItems: [{ id: 'item_miredita', gheg: 'mirëdita', de: 'guten Tag, hallo', known: false }],
  xpTotal: 115,
  learnedWordsTotal: 1,
};

function attemptResponse(overrides: Partial<AttemptResponse>): AttemptResponse {
  return {
    exerciseId: SAMPLE_MULTIPLE_CHOICE.id,
    outcome: 'correct',
    countsAsCorrect: true,
    explanation: 'Erklärung vom Server',
    rating: 'good',
    ...overrides,
  };
}

/** Evaluates like the pre-check: the picked option is correct if it is the first solution. */
function answerLikePrecheck(request: Request): Promise<Response> {
  return request
    .clone()
    .json()
    .then((body: { exerciseId: string; answer: { choice: string } }) => {
      const exercise = LESSON.exercises.find((candidate) => candidate.id === body.exerciseId);
      const correct =
        exercise?.type !== 'match_pairs' && exercise?.solutions[0] === body.answer.choice;
      return jsonResponse(
        attemptResponse({
          exerciseId: body.exerciseId,
          outcome: correct ? 'correct' : 'wrong',
          countsAsCorrect: correct,
        }),
      );
    });
}

function renderPlayer(lesson: Lesson = LESSON) {
  const onFinish = vi.fn();
  const onQuit = vi.fn();
  const onStartFocus = vi.fn();
  const { queryClient } = renderWithQueryClient(
    <LessonPlayer
      lesson={lesson}
      lexicon={EMPTY_LEXICON}
      onQuit={onQuit}
      onFinish={onFinish}
      onStartFocus={onStartFocus}
    />,
  );
  return { user: userEvent.setup(), onFinish, onQuit, onStartFocus, queryClient };
}

const feedback = () => screen.findByRole('dialog');

const optionOrder = () =>
  within(screen.getByRole('group', { name: SAMPLE_MULTIPLE_CHOICE.prompt.text }))
    .getAllByRole('button')
    .map((button) => button.textContent);

describe('LessonPlayer', () => {
  it('shows the pre-check at once and switches to the backend verdict when it differs', async () => {
    let answer: (response: Response) => void = () => undefined;
    const requests = stubApi({
      [ATTEMPTS]: () => new Promise<Response>((resolve) => (answer = resolve)),
    });
    const { user } = renderPlayer();

    await user.click(screen.getByRole('button', { name: /natën e mirë/ }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));

    const sheet = await feedback();
    expect(within(sheet).getByRole('heading', { name: 'Nicht ganz' })).toBeInTheDocument();
    expect(within(sheet).getByText('mirëdita')).toBeInTheDocument();

    answer(
      jsonResponse(
        attemptResponse({
          outcome: 'correct_standard_form',
          countsAsCorrect: true,
          solution: 'mirëdita',
          hint: 'Auf Gheg sagt man eher **mirëdita** statt **mirdita**.',
        }),
      ),
    );

    expect(
      await within(sheet).findByRole('heading', { name: 'Richtig, aber Standard' }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText('mirëdita', { selector: 'strong' })).toBeInTheDocument();

    const body = (await requests[0]?.clone().json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      exerciseId: SAMPLE_MULTIPLE_CHOICE.id,
      answer: { choice: 'natën e mirë' },
      retry: false,
    });
    expect(body.responseTimeMs).toEqual(expect.any(Number));
  });

  it('repeats a wrong exercise at the end, then shows the result', async () => {
    const requests = stubApi({
      [ATTEMPTS]: answerLikePrecheck,
      [COMPLETE]: () => jsonResponse(RESULT),
    });
    const { user, onFinish } = renderPlayer();
    const progress = () => screen.getByRole('progressbar', { name: 'Lektionsfortschritt' });
    const firstOrder = optionOrder();

    await user.click(screen.getByRole('button', { name: /mirupafshim/ }));
    await user.keyboard('{Enter}');
    await feedback();
    expect(progress()).toHaveAttribute('aria-valuenow', '0');
    await user.keyboard('{Enter}');

    await user.click(await screen.findByRole('button', { name: 'po' }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await feedback();
    expect(progress()).toHaveAttribute('aria-valuenow', '1');
    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(await screen.findByText('Nochmals')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: SAMPLE_MULTIPLE_CHOICE.prompt.text })).toBeVisible();
    expect(optionOrder(), 'the retry keeps the order of the options').toEqual(firstOrder);
    await user.click(screen.getByRole('button', { name: /mirëdita/ }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(await screen.findByRole('button', { name: 'Weiter' }));

    expect(await screen.findByRole('heading', { name: 'Lektion geschafft!' })).toBeInTheDocument();
    expect(screen.getByText('15 XP verdient')).toBeInTheDocument();

    const bodies = await Promise.all(
      requests
        .filter((request) => request.url.endsWith('/attempts'))
        .map((request) => request.clone().json() as Promise<{ retry: boolean }>),
    );
    expect(bodies.map((body) => body.retry)).toEqual([false, false, true]);

    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ saved: true }));
  });

  it('refreshes XP, level, plan and review counts once the result is saved', async () => {
    stubApi({ [ATTEMPTS]: answerLikePrecheck, [COMPLETE]: () => jsonResponse(RESULT) });
    const { user, queryClient } = renderPlayer({ ...LESSON, exercises: [SAMPLE_MULTIPLE_CHOICE] });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await user.click(screen.getByRole('button', { name: /mirëdita/ }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(await screen.findByRole('button', { name: 'Weiter' }));
    await screen.findByRole('heading', { name: 'Lektion geschafft!' });

    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      ['me'],
      ['plan'],
      ['review'],
    ]);
  });

  it('starts the focus lesson the result suggests', async () => {
    stubApi({
      [ATTEMPTS]: answerLikePrecheck,
      [COMPLETE]: () =>
        jsonResponse({
          ...RESULT,
          focusSuggestion: {
            skillTag: 'vocab.greetings',
            label: 'Begrüssungen',
            unitId: 'focus_vocab.greetings_1',
          },
        }),
    });
    const { user, onStartFocus } = renderPlayer({ ...LESSON, exercises: [SAMPLE_MULTIPLE_CHOICE] });

    await user.click(screen.getByRole('button', { name: /mirëdita/ }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(await screen.findByRole('button', { name: 'Weiter' }));
    const suggestion = await screen.findByRole('region', {
      name: 'Fokus-Lektion vorgeschlagen: Begrüssungen',
    });
    await user.click(within(suggestion).getByRole('button', { name: 'Fokus-Lektion starten' }));

    expect(onStartFocus).toHaveBeenCalledWith('focus_vocab.greetings_1');
  });

  it('asks before leaving the lesson', async () => {
    stubApi({});
    const { user, onQuit } = renderPlayer();

    await user.click(screen.getByRole('button', { name: 'Lektion schliessen' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Lektion wirklich beenden?' });
    await user.click(within(dialog).getByRole('button', { name: 'Weiterlernen' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onQuit).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    await user.click(await screen.findByRole('button', { name: 'Beenden' }));
    expect(onQuit).toHaveBeenCalledOnce();
  });

  it('cheers three correct answers in a row with a combo badge and the combo sound', async () => {
    const lesson: Lesson = {
      ...LESSON,
      exercises: [
        SAMPLE_MULTIPLE_CHOICE,
        SAMPLE_FILL_GAP_CHOICES,
        { ...SAMPLE_MULTIPLE_CHOICE, id: 'ex_a1_u01_greetings_099' },
      ],
    };
    stubApi({ [ATTEMPTS]: answerLikePrecheck });
    const { user } = renderPlayer(lesson);
    const combo = () => screen.queryByText('3 richtig in Folge!');

    await user.click(screen.getByRole('button', { name: /mirëdita/ }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(await screen.findByRole('button', { name: 'Weiter' }));
    await user.click(await screen.findByRole('button', { name: 'po' }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(combo()).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Weiter' }));
    await user.click(await screen.findByRole('button', { name: /mirëdita/ }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(await screen.findByText('3 richtig in Folge!')).toBeInTheDocument();
    expect(vi.mocked(playCue).mock.calls.filter(([cue]) => cue !== 'tap')).toEqual([
      ['correct'],
      ['correct'],
      ['combo'],
    ]);
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    await waitFor(() => expect(combo()).not.toBeInTheDocument());
  });

  it('encourages after a wrong answer: mascot on the sheet and the soft wrong sound', async () => {
    stubApi({ [ATTEMPTS]: answerLikePrecheck });
    const { user } = renderPlayer();

    await user.click(screen.getByRole('button', { name: /mirupafshim/ }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));

    const sheet = await feedback();
    expect(sheet.querySelector('[data-expression="encouraging"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(playCue).toHaveBeenLastCalledWith('wrong');
    expect(playCue).toHaveBeenCalledWith('tap');
  });
});
