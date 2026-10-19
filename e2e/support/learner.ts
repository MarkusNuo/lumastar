import { RUN_ID } from './env.ts';

/**
 * The learner the setup project registers and every signed-in project shares. Clearly fake on
 * purpose: the database is a fresh Testcontainer per run, and the address is unique per run because
 * Mailpit keeps the mails of earlier runs.
 */
export const LEARNER = {
  displayName: 'Testa',
  email: `e2e-${RUN_ID}-learner@lumastar.test`,
  password: 'lumastar-e2e-password',
} as const;

export const WRONG_PASSWORD = 'lumastar-e2e-wrong-password';

/**
 * The answers of the onboarding questions (PRD F1) the setup project gives, with the labels of the
 * option cards. "Ich kann kein Wort" allows skipping the placement test, so every run starts at A0.
 * The daily goal is not the default of a new profile, so the export shows that it was saved.
 */
export const ONBOARDING = {
  motivations: [
    { value: 'family', label: 'Familie/Partner' },
    { value: 'travel', label: 'Reisen' },
  ],
  dailyGoal: { minutes: 15, label: 'Mit Schwung' },
  selfAssessment: { value: 'nothing', label: 'Ich kann kein Wort' },
} as const;

/** The level of the learner after skipping the placement test. */
export const START_LEVEL = 'A0';
