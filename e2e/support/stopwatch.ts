/**
 * Measures how long a flow takes the learner: time spent on test-only work, such as screenshots,
 * is left out.
 */
export class Stopwatch {
  private readonly startedAt = performance.now();
  private excludedMs = 0;

  /** Runs `work` without counting its time. */
  async excluding<T>(work: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await work();
    } finally {
      this.excludedMs += performance.now() - start;
    }
  }

  elapsedMs(): number {
    return performance.now() - this.startedAt - this.excludedMs;
  }
}
