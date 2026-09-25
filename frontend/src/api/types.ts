import type { components } from './schema';

/* Readable names for the generated schemas; never declare API shapes by hand. */
type Schemas = components['schemas'];

export type AuthStatus = Schemas['AuthStatusResponse'];
export type Level = Schemas['Level'];
export type Profile = Schemas['ProfileResponse'];
export type SetupRequest = Schemas['SetupRequest'];
export type ProblemDetail = Schemas['ProblemDetail'];
