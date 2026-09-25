import type { ProblemDetail } from './types';

/** Codes the client assigns itself when the server could not be reached or sent no problem detail. */
export const CLIENT_ERROR_CODES = {
  network: 'network_error',
  unexpectedResponse: 'unexpected_response',
} as const;

interface ApiErrorOptions {
  status: number;
  code: string;
  problem?: ProblemDetail;
  cause?: unknown;
}

/**
 * Every failed API call rejects with an ApiError. `code` is the stable machine-readable code of the
 * RFC 9457 problem detail (e.g. `invalid_credentials`) or one of {@link CLIENT_ERROR_CODES}.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  /** HTTP status; 0 when no response arrived. */
  readonly status: number;
  readonly code: string;
  readonly problem: ProblemDetail | undefined;

  constructor(message: string, { status, code, problem, cause }: ApiErrorOptions) {
    super(message, { cause });
    this.status = status;
    this.code = code;
    this.problem = problem;
  }

  /** Network failures and server errors may succeed when tried again; client errors will not. */
  get isTransient(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

export function isProblemDetail(body: unknown): body is ProblemDetail {
  if (typeof body !== 'object' || body === null) return false;
  const { code, status, title } = body as Record<string, unknown>;
  return typeof code === 'string' && typeof status === 'number' && typeof title === 'string';
}

/** Reads a failed response; bodies that are not problem details (e.g. proxy errors) still map. */
export async function toApiError(response: Response): Promise<ApiError> {
  const body = await readJson(response);
  if (isProblemDetail(body)) {
    return new ApiError(body.detail ?? body.title, {
      status: response.status,
      code: body.code,
      problem: body,
    });
  }
  return new ApiError(`Unexpected response with status ${response.status}`, {
    status: response.status,
    code: CLIENT_ERROR_CODES.unexpectedResponse,
  });
}

export function toNetworkError(cause: unknown): ApiError {
  return new ApiError('The server could not be reached', {
    status: 0,
    code: CLIENT_ERROR_CODES.network,
    cause,
  });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown;
  } catch {
    return undefined;
  }
}
