import { describe, expect, it } from 'vitest';
import spec from '../../../../backend/openapi/openapi.json?raw';
import {
  DISPLAY_NAME_MAX_LENGTH,
  hasErrors,
  normalizeDisplayName,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateDisplayName,
  validatePassword,
} from './setupRules';

interface LengthConstraint {
  minLength?: number;
  maxLength?: number;
}

function setupRequestProperty(name: 'displayName' | 'password'): LengthConstraint {
  const contract = JSON.parse(spec) as {
    components: { schemas: { SetupRequest: { properties: Record<string, LengthConstraint> } } };
  };
  const property = contract.components.schemas.SetupRequest.properties[name];
  if (!property) throw new Error(`SetupRequest.${name} is missing in the API contract`);
  return property;
}

describe('setup rules', () => {
  it('mirror the SetupRequest constraints of the API contract', () => {
    expect(setupRequestProperty('displayName')).toMatchObject({
      minLength: 1,
      maxLength: DISPLAY_NAME_MAX_LENGTH,
    });
    expect(setupRequestProperty('password')).toMatchObject({
      minLength: PASSWORD_MIN_LENGTH,
      maxLength: PASSWORD_MAX_LENGTH,
    });
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
      expect(normalizeDisplayName('  Erza ')).toBe('Erza');
    });
  });

  describe('password', () => {
    it('needs at least 8 characters', () => {
      expect(validatePassword('1234567', '1234567').password).toBe('tooShort');
      expect(validatePassword('12345678', '12345678')).toEqual({});
    });

    it('allows at most 128 characters', () => {
      const long = 'x'.repeat(129);
      expect(validatePassword(long, long).password).toBe('tooLong');
    });

    it('keeps spaces, because they belong to the password', () => {
      expect(validatePassword('  kurz  ', '  kurz  ')).toEqual({});
    });

    it('asks for the confirmation', () => {
      expect(validatePassword('geheim123', '').confirmation).toBe('required');
    });

    it('detects a confirmation that differs', () => {
      const errors = validatePassword('geheim123', 'geheim124');
      expect(errors.confirmation).toBe('mismatch');
      expect(hasErrors(errors)).toBe(true);
    });
  });
});
