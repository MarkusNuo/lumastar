import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/ApiError';
import type { ProblemDetail } from '../../api/types';
import { linkProblem, rejectInvalid, serverFieldErrors, type ServerFields } from './authProblems';

function problem(code: string, fields: string[] = []): ApiError {
  const detail: ProblemDetail = {
    status: 400,
    code,
    title: 'Problem',
    errors: fields.map((field) => ({ field, message: 'invalid' })),
  };
  return new ApiError(detail.title, { status: detail.status, code, problem: detail });
}

const FIELDS: ServerFields<'email' | 'password'> = {
  newEmail: ['email', 'Adresse prüfen'],
  password: ['password', 'Passwort prüfen'],
};

describe('serverFieldErrors', () => {
  it('puts each refused request field on the form field that shows it', () => {
    expect(serverFieldErrors(problem('validation_failed', ['password']), FIELDS)).toEqual({
      password: 'Passwort prüfen',
    });
  });

  it('leaves out request fields the form does not show', () => {
    expect(serverFieldErrors(problem('validation_failed', ['token']), FIELDS)).toEqual({});
  });

  it('finds nothing in other errors', () => {
    expect(serverFieldErrors(problem('email_taken'), FIELDS)).toEqual({});
  });
});

describe('rejectInvalid', () => {
  function attempt(error: unknown) {
    const form = { rejectFields: vi.fn() };
    const fail = vi.fn();
    return { handled: rejectInvalid(error, FIELDS, form, fail), form, fail };
  }

  it('rejects the fields it can show', () => {
    const { handled, form, fail } = attempt(problem('validation_failed', ['newEmail']));

    expect(handled).toBe(true);
    expect(form.rejectFields).toHaveBeenCalledWith({ email: 'Adresse prüfen' });
    expect(fail).not.toHaveBeenCalled();
  });

  it('asks to check the input when no shown field was refused', () => {
    const { handled, form, fail } = attempt(problem('validation_failed', ['displayName']));

    expect(handled).toBe(true);
    expect(form.rejectFields).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledWith('Deine Angaben wurden nicht angenommen. Prüfe sie bitte.');
  });

  it('leaves every other error to the caller', () => {
    const { handled, form, fail } = attempt(problem('invalid_password'));

    expect(handled).toBe(false);
    expect(form.rejectFields).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });
});

describe('linkProblem', () => {
  it.each([
    [problem('token_expired'), 'expired'],
    [problem('token_invalid'), 'invalid'],
    [problem('validation_failed', ['token']), 'invalid'],
    [problem('validation_failed', ['newPassword']), undefined],
    [problem('email_taken'), undefined],
  ])('reads %s as %s', (error, expected) => {
    expect(linkProblem(error)).toBe(expected);
  });
});
