import { isApiError } from '../../../api/ApiError';
import type { AttemptSubmission, Verdict } from '../model';

/*
 * Sends answers to the backend in the background, one after another, so the lesson never waits
 * for the network. Failed sends are retried quietly with backoff until the outbox is
 * disposed. Order matters: the backend only accepts a retry after the first answer of an exercise.
 */

export type OutboxSubmission = Omit<AttemptSubmission, 'retry'>;
export type SendAttempt = (submission: AttemptSubmission) => Promise<Verdict>;
export type VerdictListener = (key: number, verdict: Verdict) => void;

const DEFAULT_BACKOFF_MS = [500, 1000, 2000, 4000, 8000];
/** Conflicts that are fixed by flipping the retry flag; a second one means something else is off. */
const MAX_CONFLICTS_PER_ATTEMPT = 2;

interface QueuedAttempt {
  key: number;
  submission: OutboxSubmission;
  conflicts: number;
}

export class AttemptOutbox {
  private readonly queue: QueuedAttempt[] = [];
  /** Exercises whose first answer the backend has recorded; later answers are retries. */
  private readonly recorded = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private running = false;
  private disposed = false;
  private wakeUp: (() => void) | undefined;

  private readonly send: SendAttempt;
  private readonly onVerdict: VerdictListener;
  private readonly backoffMs: readonly number[];

  constructor(
    send: SendAttempt,
    onVerdict: VerdictListener,
    backoffMs: readonly number[] = DEFAULT_BACKOFF_MS,
  ) {
    this.send = send;
    this.onVerdict = onVerdict;
    this.backoffMs = backoffMs;
  }

  /** Number of answers not yet evaluated by the backend. */
  get pending(): number {
    return this.queue.length;
  }

  enqueue(key: number, submission: OutboxSubmission): void {
    if (this.disposed) return;
    this.queue.push({ key, submission, conflicts: 0 });
    this.notify();
    void this.drain();
  }

  /** Stops waiting for the next retry and sends right away. */
  retryNow(): void {
    this.wakeUp?.();
  }

  /** Resolves once every answer is evaluated, or after `timeoutMs` at the latest. */
  whenIdle(timeoutMs: number): Promise<void> {
    if (this.queue.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      };
      const timer = setTimeout(finish, timeoutMs);
      const unsubscribe = this.subscribe(() => {
        if (this.queue.length === 0) finish();
      });
    });
  }

  /** Subscribes to changes of {@link pending}; returns the unsubscribe function. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  dispose(): void {
    this.disposed = true;
    this.queue.length = 0;
    this.wakeUp?.();
    this.notify();
    this.listeners.clear();
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    let failures = 0;
    while (!this.isDisposed()) {
      const head = this.queue[0];
      if (!head) break;
      const { exerciseId } = head.submission;
      try {
        const verdict = await this.send({
          ...head.submission,
          retry: this.recorded.has(exerciseId),
        });
        if (this.isDisposed()) break;
        this.recorded.add(exerciseId);
        this.queue.shift();
        failures = 0;
        this.onVerdict(head.key, verdict);
        this.notify();
      } catch (error) {
        if (this.isDisposed()) break;
        if (this.resolveConflict(head, error)) continue;
        if (isApiError(error) && error.isTransient) {
          await this.wait(this.backoffMs[Math.min(failures, this.backoffMs.length - 1)] ?? 0);
          failures += 1;
          continue;
        }
        // Not recoverable (e.g. signed out): drop it, the lesson goes on without that answer.
        this.queue.shift();
        this.notify();
      }
    }
    this.running = false;
  }

  /** A lost response may leave the backend's view of the first answer different from ours. */
  private resolveConflict(attempt: QueuedAttempt, error: unknown): boolean {
    if (attempt.conflicts >= MAX_CONFLICTS_PER_ATTEMPT) return false;
    const { exerciseId } = attempt.submission;
    if (isApiError(error, 'exercise_already_answered')) {
      this.recorded.add(exerciseId);
    } else if (isApiError(error, 'retry_before_first_attempt')) {
      this.recorded.delete(exerciseId);
    } else {
      return false;
    }
    attempt.conflicts += 1;
    return true;
  }

  private async wait(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      this.wakeUp = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    this.wakeUp = undefined;
  }

  /** A method, so the compiler does not assume the flag unchanged across awaits. */
  private isDisposed(): boolean {
    return this.disposed;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
