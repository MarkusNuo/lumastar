/*
 * Client-side mirror of the SetupRequest constraints in backend/openapi/openapi.json, so mistakes
 * show up instantly. setupRules.test.ts fails when the contract changes.
 */
export const DISPLAY_NAME_MAX_LENGTH = 40;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type DisplayNameError = 'required' | 'tooLong';
export type PasswordError = 'tooShort' | 'tooLong';
export type ConfirmationError = 'required' | 'mismatch';

export interface PasswordErrors {
  password?: PasswordError;
  confirmation?: ConfirmationError;
}

/** The backend strips the name, so it is checked (and sent) without surrounding spaces. */
export function normalizeDisplayName(name: string): string {
  return name.trim();
}

export function validateDisplayName(name: string): DisplayNameError | undefined {
  const normalized = normalizeDisplayName(name);
  if (normalized.length === 0) return 'required';
  if (normalized.length > DISPLAY_NAME_MAX_LENGTH) return 'tooLong';
  return undefined;
}

export function validatePassword(password: string, confirmation: string): PasswordErrors {
  const errors: PasswordErrors = {};
  if (password.length < PASSWORD_MIN_LENGTH) errors.password = 'tooShort';
  else if (password.length > PASSWORD_MAX_LENGTH) errors.password = 'tooLong';

  if (confirmation.length === 0) errors.confirmation = 'required';
  else if (confirmation !== password) errors.confirmation = 'mismatch';
  return errors;
}

export function hasErrors(errors: PasswordErrors): boolean {
  return errors.password !== undefined || errors.confirmation !== undefined;
}
