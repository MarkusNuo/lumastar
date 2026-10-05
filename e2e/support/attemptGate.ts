import type { Page, Route } from '@playwright/test';

const ATTEMPTS = '**/api/lessons/*/attempts';

/**
 * Holds every answer the lesson player sends (POST /api/lessons/{id}/attempts) until the test lets
 * it through. While an answer is held, the feedback sheet on screen can only come from the
 * frontend's instant pre-check, so a test can compare it with the backend's binding verdict.
 */
export class AttemptGate {
  private readonly held: Route[] = [];

  private constructor() {}

  static async install(page: Page): Promise<AttemptGate> {
    const gate = new AttemptGate();
    await page.route(ATTEMPTS, (route) => gate.hold(route));
    return gate;
  }

  /** Answers sent by the player and not yet passed on to the backend. */
  get heldCount(): number {
    return this.held.length;
  }

  /** Passes the oldest held answer on to the backend. */
  async release(): Promise<void> {
    const route = this.held.shift();
    if (!route) throw new Error('No answer is held');
    await route.continue();
  }

  private hold(route: Route): void {
    if (route.request().method() === 'POST') {
      this.held.push(route);
    } else {
      void route.continue();
    }
  }
}
