import { isApiError } from '../../../api/ApiError';
import type { FieldErrors } from '../../../lib/useFormErrors';
import {
  normalize,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
} from '../accountRules';
import { invalidFields } from '../authProblems';
import { AUTH_COPY, FIELD_COPY } from '../copy';
import type { RegisterRequest } from '../../../api/types';

const copy = AUTH_COPY.register;

export interface RegistrationValues {
  displayName: string;
  email: string;
  password: string;
  inviteCode: string;
}

export type RegistrationField = keyof RegistrationValues;

export const EMPTY_REGISTRATION: RegistrationValues = {
  displayName: '',
  email: '',
  password: '',
  inviteCode: '',
};

/** The client checks of the form; the invite code only counts when registration needs one. */
export function registrationErrors(
  values: RegistrationValues,
  inviteRequired: boolean,
): FieldErrors<RegistrationField> {
  const displayName = validateDisplayName(values.displayName);
  const email = validateEmail(values.email);
  const password = validateNewPassword(values.password);
  return {
    displayName: displayName && FIELD_COPY.displayName.errors[displayName],
    email: email && FIELD_COPY.email.errors[email],
    password: password && FIELD_COPY.newPassword.errors[password],
    inviteCode:
      inviteRequired && normalize(values.inviteCode) === '' ? copy.inviteCode.required : undefined,
  };
}

export function toRegisterRequest(
  values: RegistrationValues,
  inviteRequired: boolean,
): RegisterRequest {
  return {
    displayName: normalize(values.displayName),
    email: normalize(values.email),
    password: values.password,
    ...(inviteRequired && { inviteCode: normalize(values.inviteCode) }),
  };
}

/** What a refused registration means for the form. */
export type RegistrationFailure =
  | { kind: 'fields'; errors: FieldErrors<RegistrationField> }
  | { kind: 'closed' }
  | { kind: 'message'; message: string };

const SERVER_FIELD_ERRORS: Partial<Record<string, [RegistrationField, string]>> = {
  displayName: ['displayName', copy.refused.displayName],
  email: ['email', FIELD_COPY.email.errors.invalid],
  password: ['password', copy.refused.password],
  inviteCode: ['inviteCode', copy.inviteCode.invalid],
};

export function registrationFailure(error: unknown): RegistrationFailure {
  if (isApiError(error, 'email_taken')) {
    return { kind: 'fields', errors: { email: copy.emailTaken } };
  }
  if (isApiError(error, 'invite_code_invalid')) {
    return { kind: 'fields', errors: { inviteCode: copy.inviteCode.invalid } };
  }
  if (isApiError(error, 'registration_closed')) return { kind: 'closed' };
  if (isApiError(error, 'validation_failed')) {
    const errors = Object.fromEntries(
      invalidFields(error).flatMap((field) => {
        const mapped = SERVER_FIELD_ERRORS[field];
        return mapped ? [mapped] : [];
      }),
    ) as FieldErrors<RegistrationField>;
    return Object.keys(errors).length > 0
      ? { kind: 'fields', errors }
      : { kind: 'message', message: copy.invalid };
  }
  return { kind: 'message', message: copy.failed };
}
