import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, CLIENT_ERROR_CODES } from '../../../api/ApiError';
import type { AttemptSubmission, Verdict } from '../model';
import { AttemptOutbox, type SendAttempt } from './attemptOutbox';

const SERVER_VERDICT: Verdict = {
  outcome: 'correct',
  countsAsCorrect: true,
  explanation: 'Erklärung',
  source: 'server',
};

const networkError = () => new ApiError('offline', { status: 0, code: CLIENT_ERROR_CODES.network });
const conflict = (code: string) => new ApiError('conflict', { status: 409, code });

function submission(exerciseId: string) {
  return { exerciseId, answer: { kind: 'choice', choice: 'po' }, responseTimeMs: 1200 } as const;
}

function setup(send: SendAttempt) {
  const verdicts: [number, Verdict][] = [];
  const outbox = new AttemptOutbox(send, (key, verdict) => verdicts.push([key, verdict]), [100]);
  return { outbox, verdicts };
}

describe('AttemptOutbox', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends answers one after another and reports each verdict with its key', async () => {
    const sent: AttemptSubmission[] = [];
    const { outbox, verdicts } = setup((attempt) => {
      sent.push(attempt);
      return Promise.resolve(SERVER_VERDICT);
    });

    outbox.enqueue(0, submission('ex_1'));
    outbox.enqueue(1, submission('ex_2'));
    expect(outbox.pending).toBe(2);
    await vi.runAllTimersAsync();

    expect(sent.map((attempt) => attempt.exerciseId)).toEqual(['ex_1', 'ex_2']);
    expect(verdicts.map(([key]) => key)).toEqual([0, 1]);
    expect(outbox.pending).toBe(0);
  });

  it('marks the second answer to an exercise as a retry', async () => {
    const sent: AttemptSubmission[] = [];
    const { outbox } = setup((attempt) => {
      sent.push(attempt);
      return Promise.resolve(SERVER_VERDICT);
    });

    outbox.enqueue(0, submission('ex_1'));
    outbox.enqueue(1, submission('ex_2'));
    outbox.enqueue(2, submission('ex_1'));
    await vi.runAllTimersAsync();

    expect(sent.map((attempt) => attempt.retry)).toEqual([false, false, true]);
  });

  it('retries quietly after a network failure and keeps the order', async () => {
    const send = vi
      .fn<SendAttempt>()
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(networkError())
      .mockResolvedValue(SERVER_VERDICT);
    const { outbox, verdicts } = setup(send);

    outbox.enqueue(0, submission('ex_1'));
    outbox.enqueue(1, submission('ex_2'));
    await vi.advanceTimersByTimeAsync(50);
    expect(verdicts).toHaveLength(0);
    expect(outbox.pending).toBe(2);

    await vi.runAllTimersAsync();

    expect(send.mock.calls.map(([attempt]) => attempt.exerciseId)).toEqual([
      'ex_1',
      'ex_1',
      'ex_1',
      'ex_2',
    ]);
    expect(verdicts.map(([key]) => key)).toEqual([0, 1]);
  });

  it('sends right away when asked instead of waiting for the backoff', async () => {
    const send = vi
      .fn<SendAttempt>()
      .mockRejectedValueOnce(networkError())
      .mockResolvedValue(SERVER_VERDICT);
    const onVerdict = vi.fn();
    const outbox = new AttemptOutbox(send, onVerdict, [60_000]);

    outbox.enqueue(0, submission('ex_1'));
    await vi.advanceTimersByTimeAsync(10);
    outbox.retryNow();
    await vi.advanceTimersByTimeAsync(10);

    expect(onVerdict).toHaveBeenCalledOnce();
  });

  it('drops an answer the backend rejects for good and goes on with the next', async () => {
    const send = vi
      .fn<SendAttempt>()
      .mockRejectedValueOnce(new ApiError('gone', { status: 404, code: 'lesson_not_found' }))
      .mockResolvedValue(SERVER_VERDICT);
    const { outbox, verdicts } = setup(send);

    outbox.enqueue(0, submission('ex_1'));
    outbox.enqueue(1, submission('ex_2'));
    await vi.runAllTimersAsync();

    expect(verdicts.map(([key]) => key)).toEqual([1]);
    expect(outbox.pending).toBe(0);
  });

  it('sends a repetition as first answer when the first answer was lost', async () => {
    const send = vi
      .fn<SendAttempt>()
      .mockRejectedValueOnce(new ApiError('bad', { status: 422, code: 'answer_type_mismatch' }))
      .mockResolvedValue(SERVER_VERDICT);
    const { outbox } = setup(send);

    outbox.enqueue(0, submission('ex_1'));
    outbox.enqueue(1, submission('ex_1'));
    await vi.runAllTimersAsync();

    expect(send.mock.calls[1]?.[0].retry).toBe(false);
  });

  it('turns an answer into a retry when the backend already recorded the first one', async () => {
    const send = vi
      .fn<SendAttempt>()
      .mockRejectedValueOnce(conflict('exercise_already_answered'))
      .mockResolvedValue(SERVER_VERDICT);
    const { outbox, verdicts } = setup(send);

    outbox.enqueue(0, submission('ex_1'));
    await vi.runAllTimersAsync();

    expect(send.mock.calls.map(([attempt]) => attempt.retry)).toEqual([false, true]);
    expect(verdicts).toHaveLength(1);
  });

  it('turns a retry into a first answer when the backend has none', async () => {
    const send = vi
      .fn<SendAttempt>()
      .mockResolvedValueOnce(SERVER_VERDICT)
      .mockRejectedValueOnce(conflict('retry_before_first_attempt'))
      .mockResolvedValue(SERVER_VERDICT);
    const { outbox } = setup(send);

    outbox.enqueue(0, submission('ex_1'));
    outbox.enqueue(1, submission('ex_1'));
    await vi.runAllTimersAsync();

    expect(send.mock.calls.map(([attempt]) => attempt.retry)).toEqual([false, true, false]);
  });

  it('notifies subscribers when the number of pending answers changes', async () => {
    const { outbox } = setup(() => Promise.resolve(SERVER_VERDICT));
    const listener = vi.fn();
    outbox.subscribe(listener);

    outbox.enqueue(0, submission('ex_1'));
    await vi.runAllTimersAsync();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops sending and reporting once disposed', async () => {
    const send = vi.fn<SendAttempt>().mockRejectedValue(networkError());
    const { outbox, verdicts } = setup(send);

    outbox.enqueue(0, submission('ex_1'));
    await vi.advanceTimersByTimeAsync(10);
    outbox.dispose();
    await vi.runAllTimersAsync();

    expect(send).toHaveBeenCalledOnce();
    expect(verdicts).toHaveLength(0);
    expect(outbox.pending).toBe(0);
  });
});
