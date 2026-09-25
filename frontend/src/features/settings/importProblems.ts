import { CLIENT_ERROR_CODES, isApiError } from '../../api/ApiError';
import type { ProblemDetail } from '../../api/types';
import { PROFILE_COPY } from './copy';

/** A German error message for the profile tab, optionally with technical details. */
export interface ProblemMessage {
  message: string;
  /** Technical lines for the curious, e.g. which data file is invalid. */
  details: string[];
}

type UnknownReferences = NonNullable<ProblemDetail['unknownReferences']>;

const copy = PROFILE_COPY.backup.problems;

export const problemMessage = (message: string): ProblemMessage => ({ message, details: [] });

/** The same message as the server's `upload_too_large`, for files rejected before uploading. */
export const TOO_LARGE_PROBLEM = problemMessage(copy.tooLarge);

/** German message for a failed import, by the problem code of the API. */
export function importProblem(error: unknown): ProblemMessage {
  if (!isApiError(error)) return problemMessage(copy.failed);
  switch (error.code) {
    case 'upload_too_large':
      return TOO_LARGE_PROBLEM;
    case 'invalid_backup_archive':
      return problemMessage(copy.invalidArchive);
    case 'unsupported_schema_version':
      return problemMessage(copy.unsupportedVersion);
    case 'invalid_backup_data':
      return {
        message: copy.invalidData,
        details: (error.problem?.errors ?? []).map(({ field, message }) => `${field}: ${message}`),
      };
    case 'unknown_content_references':
      return unknownContent(error.problem?.unknownReferences);
    case CLIENT_ERROR_CODES.network:
      return problemMessage(copy.network);
    default:
      return problemMessage(copy.failed);
  }
}

const REFERENCE_KINDS = ['units', 'exercises', 'items', 'skillTags'] as const;

function unknownContent(references: UnknownReferences | undefined): ProblemMessage {
  const kinds = REFERENCE_KINDS.map((kind) => ({
    ids: references?.[kind] ?? [],
    label: copy.unknownContentParts[kind],
  })).filter(({ ids }) => ids.length > 0);
  return {
    message: copy.unknownContent(kinds.map(({ ids, label }) => label(ids.length))),
    details: kinds.map(({ ids, label }) => `${label(ids.length)}: ${ids.join(', ')}`),
  };
}
