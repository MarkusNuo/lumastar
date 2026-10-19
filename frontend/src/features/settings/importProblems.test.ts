import { describe, expect, it } from 'vitest';
import { ApiError, CLIENT_ERROR_CODES } from '../../api/ApiError';
import type { ProblemDetail } from '../../api/types';
import { importProblem } from './importProblems';

function apiError(status: number, code: string, problem: Partial<ProblemDetail> = {}): ApiError {
  return new ApiError('failed', {
    status,
    code,
    problem: { status, code, title: 'Problem', ...problem },
  });
}

const UNCHANGED = 'Deine Lerndaten sind unverändert.';

describe('importProblem', () => {
  it.each([
    [413, 'upload_too_large', 'Die Datei ist zu gross. Ein Backup darf höchstens 20 MB haben'],
    [422, 'invalid_backup_archive', 'Diese Datei ist kein Lumastar-Backup.'],
    [422, 'unsupported_schema_version', 'aus einer Lumastar-Version, die diese Installation nicht'],
  ])('explains %i %s and says that nothing changed', (status, code, text) => {
    const { message, details } = importProblem(apiError(status, code));

    expect(message).toContain(text);
    expect(message).toContain(UNCHANGED);
    expect(details).toEqual([]);
  });

  it('lists the invalid fields of invalid_backup_data as details', () => {
    const problem = importProblem(
      apiError(422, 'invalid_backup_data', {
        errors: [
          { field: 'data/sessions.json', message: 'missing' },
          { field: 'data/profile.json.timeZone', message: 'must be a time zone' },
        ],
      }),
    );

    expect(problem.message).toBe(`Das Backup enthält ungültige Daten. ${UNCHANGED}`);
    expect(problem.details).toEqual([
      'data/sessions.json: missing',
      'data/profile.json.timeZone: must be a time zone',
    ]);
  });

  it('counts the unknown content of unknown_content_references', () => {
    const problem = importProblem(
      apiError(422, 'unknown_content_references', {
        unknownReferences: {
          units: ['a1_u09_food'],
          exercises: ['ex_a1_u09_food_001', 'ex_a1_u09_food_002'],
          items: [],
          skillTags: [],
        },
      }),
    );

    expect(problem.message).toBe(
      `Das Backup verweist auf Inhalte, die es hier nicht gibt (1 Einheit, 2 Übungen). ${UNCHANGED}`,
    );
    expect(problem.details).toEqual([
      '1 Einheit: a1_u09_food',
      '2 Übungen: ex_a1_u09_food_001, ex_a1_u09_food_002',
    ]);
  });

  it('still explains unknown_content_references without the reference list', () => {
    expect(importProblem(apiError(422, 'unknown_content_references')).message).toBe(
      `Das Backup verweist auf Inhalte, die es hier nicht gibt. ${UNCHANGED}`,
    );
  });

  it('points at the connection when the server was not reached', () => {
    const offline = new ApiError('offline', { status: 0, code: CLIENT_ERROR_CODES.network });

    expect(importProblem(offline).message).toBe(
      'Lumastar erreicht den Server gerade nicht. Prüfe deine Verbindung.',
    );
  });

  it.each([
    ['another problem code', apiError(400, 'bad_request')],
    ['a server error', apiError(500, 'internal_error')],
    ['an unexpected error', new Error('boom')],
  ])('falls back to a general message for %s', (_, error) => {
    expect(importProblem(error).message).toBe(
      'Der Import hat nicht geklappt. Versuch es nochmals.',
    );
  });
});
