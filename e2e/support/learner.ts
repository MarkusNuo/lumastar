/**
 * The single account of the throwaway e2e instance. Clearly fake on purpose: the database is a fresh
 * Testcontainer per run and is discarded afterwards.
 */
export const LEARNER = {
  displayName: 'Testa',
  password: 'lingora-e2e-password',
} as const;

export const WRONG_PASSWORD = 'lingora-e2e-wrong-password';
