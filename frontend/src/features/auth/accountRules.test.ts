import { describe, expect, it } from 'vitest';
import spec from '../../../../backend/openapi/openapi.json?raw';
import {
  DISPLAY_NAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  normalize,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateConfirmation,
  validateCurrentPassword,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
} from './accountRules';

interface LengthConstraint {
  minLength?: number;
  maxLength?: number;
}

function contractProperty(schema: string, name: string): LengthConstraint {
  const contract = JSON.parse(spec) as {
    components: { schemas: Record<string, { properties: Record<string, LengthConstraint> }> };
  };
  const property = contract.components.schemas[schema]?.properties[name];
  if (!property) throw new Error(`${schema}.${name} is missing in the API contract`);
  return property;
}

describe('account rules', () => {
  it('mirror the constraints of the API contract', () => {
    expect(contractProperty('RegisterRequest', 'displayName')).toMatchObject({
      maxLength: DISPLAY_NAME_MAX_LENGTH,
    });
    expect(contractProperty('RegisterRequest', 'email')).toMatchObject({
      maxLength: EMAIL_MAX_LENGTH,
    });
    const newPassword = { minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH };
    expect(contractProperty('RegisterRequest', 'password')).toMatchObject(newPassword);
    expect(contractProperty('PasswordChangeRequest', 'newPassword')).toMatchObject(newPassword);
    expect(contractProperty('PasswordResetConfirmRequest', 'newPassword')).toMatchObject(
      newPassword,
    );
  });

  describe('display name', () => {
    it.each(['', '   '])('requires a name, not just spaces (%j)', (name) => {
      expect(validateDisplayName(name)).toBe('required');
    });

    it('accepts up to 40 characters, not counting surrounding spaces', () => {
      expect(validateDisplayName(`  ${'a'.repeat(40)}  `)).toBeUndefined();
      expect(validateDisplayName('a'.repeat(41))).toBe('tooLong');
    });

    it('is sent without surrounding spaces', () => {
      expect(normalize('  Erza ')).toBe('Erza');
    });
  });

  describe('e-mail address', () => {
    it.each(['erza@example.ch', ' erza@example.ch ', 'e.rza+lumastar@mail.example.co'])(
      'accepts %j',
      (email) => {
        expect(validateEmail(email)).toBeUndefined();
      },
    );

    it.each(['erza', 'erza@', '@example.ch', 'erza@example', 'erza @example.ch', 'a@b@c.ch'])(
      'rejects %j',
      (email) => {
        expect(validateEmail(email)).toBe('invalid');
      },
    );

    it('requires an address and allows at most 254 characters', () => {
      expect(validateEmail('  ')).toBe('required');
      expect(validateEmail(`${'a'.repeat(245)}@example.ch`)).toBe('tooLong');
    });
  });

  describe('new password', () => {
    it('needs 8 to 128 characters', () => {
      expect(validateNewPassword('')).toBe('required');
      expect(validateNewPassword('1234567')).toBe('tooShort');
      expect(validateNewPassword('12345678')).toBeUndefined();
      expect(validateNewPassword('x'.repeat(129))).toBe('tooLong');
    });

    it('keeps spaces, because they belong to the password', () => {
      expect(validateNewPassword('  kurz  ')).toBeUndefined();
    });

    it('needs a matching confirmation', () => {
      expect(validateConfirmation('geheim123', '')).toBe('required');
      expect(validateConfirmation('geheim123', 'geheim124')).toBe('mismatch');
      expect(validateConfirmation('geheim123', 'geheim123')).toBeUndefined();
    });
  });

  it('only checks that a current password is there, whatever its length', () => {
    expect(validateCurrentPassword('')).toBe('required');
    expect(validateCurrentPassword('kurz')).toBeUndefined();
  });
});
