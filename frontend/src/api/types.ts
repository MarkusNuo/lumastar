import type { components } from './schema';

/* Readable names for the generated schemas; never declare API shapes by hand. */
type Schemas = components['schemas'];

export type AuthStatus = Schemas['AuthStatusResponse'];
export type Level = Schemas['Level'];
export type Profile = Schemas['ProfileResponse'];
export type SetupRequest = Schemas['SetupRequest'];
export type ProblemDetail = Schemas['ProblemDetail'];

export type Curriculum = Schemas['CurriculumResponse'];
export type CurriculumStage = Schemas['CurriculumStage'];
export type CurriculumUnit = Schemas['CurriculumUnit'];

export type LessonResponse = Schemas['LessonResponse'];
export type LessonExerciseResponse = Schemas['LessonExercise'];
export type SubmittedAnswer = Schemas['SubmittedAnswer'];
export type AttemptResponse = Schemas['AttemptResponse'];
export type LessonResultResponse = Schemas['LessonResultResponse'];
