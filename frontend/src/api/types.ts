import type { components } from './schema';

/* Readable names for the generated schemas; never declare API shapes by hand. */
type Schemas = components['schemas'];

export type AuthStatus = Schemas['AuthStatusResponse'];
export type Level = Schemas['Level'];
export type Profile = Schemas['ProfileResponse'];
export type ProblemDetail = Schemas['ProblemDetail'];

export type LessonResponse = Schemas['LessonResponse'];
export type LessonExerciseResponse = Schemas['LessonExercise'];
export type SubmittedAnswer = Schemas['SubmittedAnswer'];
export type AttemptResponse = Schemas['AttemptResponse'];
export type ErrorCategory = Schemas['ErrorCategory'];
export type StandardForms = Schemas['StandardFormsResponse'];
export type LessonResultResponse = Schemas['LessonResultResponse'];
export type LessonKind = Schemas['LessonKind'];
export type FocusSuggestion = Schemas['FocusSuggestion'];
export type CheckpointResult = Schemas['CheckpointResult'];

export type LessonDailyGoal = Schemas['LessonDailyGoal'];
export type LessonStreak = Schemas['LessonStreak'];

export type ReviewSummary = Schemas['ReviewSummaryResponse'];

export type DailyProgress = Schemas['DailyProgressResponse'];
export type Streak = Schemas['StreakResponse'];

export type Stats = Schemas['StatsResponse'];
export type LevelProgress = Schemas['LevelProgress'];
export type MasteryArea = Schemas['MasteryArea'];
export type SkillArea = Schemas['SkillArea'];
export type FrequentError = Schemas['FrequentError'];
export type PracticeTarget = Schemas['PracticeTarget'];
export type Heatmap = Schemas['Heatmap'];
export type HeatmapDay = Schemas['HeatmapDay'];
export type DueForecast = Schemas['DueForecast'];
export type DueDay = Schemas['DueDay'];

export type Settings = Schemas['SettingsResponse'];
export type SettingsRequest = Schemas['SettingsRequest'];

export type LevelBadgeCode = Schemas['LevelBadge'];
export type EarnedBadge = Schemas['BadgeResponse'];

export type ImportResult = Schemas['ImportResult'];
export type BackupCounts = Schemas['BackupCounts'];

export type OnboardingStep = Schemas['OnboardingStep'];
export type Motivation = Schemas['Motivation'];
export type SelfAssessment = Schemas['SelfAssessment'];
export type OnboardingOptions = Schemas['OnboardingOptionsResponse'];
export type OnboardingRequest = Schemas['OnboardingRequest'];

export type PlacementItem = Schemas['PlacementItem'];
export type StartPlacementResponse = Schemas['StartPlacementResponse'];
export type PlacementAnswerResponse = Schemas['PlacementAnswerResponse'];
export type PlacementResult = Schemas['PlacementResultResponse'];
export type SkillEstimate = Schemas['SkillEstimate'];

export type LearningPath = Schemas['PathResponse'];
export type LearningPathStage = Schemas['PathStage'];
export type LearningPathUnit = Schemas['PathUnit'];
export type PassedStage = Schemas['PassedStage'];
export type CheckpointStatus = Schemas['CheckpointStatus'];
export type PlanUnitStatus = Schemas['PlanUnitStatus'];
export type PlanChange = Schemas['PlanChangeResponse'];
export type PlanChangeKind = Schemas['PlanChangeKind'];
