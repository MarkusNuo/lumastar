/*
 * Client-side mirror of the account request constraints in backend/openapi/openapi.json, so mistakes
 * show up instantly. accountRules.test.ts fails when the contract changes.
 */
export const DISPLAY_NAME_MAX_LENGTH = 40;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;

export type DisplayNameError = 'required' | 'tooLong';
export type EmailError = 'required' | 'invalid' | 'tooLong';
export type PasswordError = 'required' | 'tooShort' | 'tooLong';
export type ConfirmationError = 'required' | 'mismatch';

// Deliberately loose: one @, no spaces and a dot in the domain. The mail itself proves the rest.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The backend strips names and addresses, so they are checked (and sent) without outer spaces. */
export function normalize(value: string): string {
  return value.trim();
}

export function validateDisplayName(name: string): DisplayNameError | undefined {
  const normalized = normalize(name);
  if (normalized.length === 0) return 'required';
  if (normalized.length > DISPLAY_NAME_MAX_LENGTH) return 'tooLong';
  return undefined;
}

export function validateEmail(email: string): EmailError | undefined {
  const normalized = normalize(email);
  if (normalized.length === 0) return 'required';
  if (normalized.length > EMAIL_MAX_LENGTH) return 'tooLong';
  return EMAIL_PATTERN.test(normalized) ? undefined : 'invalid';
}

/** A new password; spaces count, because they belong to it. */
export function validateNewPassword(password: string): PasswordError | undefined {
  if (password.length === 0) return 'required';
  if (password.length < PASSWORD_MIN_LENGTH) return 'tooShort';
  if (password.length > PASSWORD_MAX_LENGTH) return 'tooLong';
  return undefined;
}

export function validateConfirmation(
  password: string,
  confirmation: string,
): ConfirmationError | undefined {
  if (confirmation.length === 0) return 'required';
  return confirmation === password ? undefined : 'mismatch';
}

/** An existing password is only checked for presence; its rules may have been different. */
export function validateCurrentPassword(password: string): 'required' | undefined {
  return password.length === 0 ? 'required' : undefined;
}
