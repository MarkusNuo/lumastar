import type {
  DailyProgress,
  LessonResponse,
  OnboardingOptions,
  Profile,
  Streak,
} from '../api/types';
import type { Account, AuthStatus, ReminderSettings } from '../api/types';
import { SAMPLE_MULTIPLE_CHOICE } from '../features/lesson/sampleExercises';

/** GET /api/auth/status of a visitor without a session on an installation open for everyone. */
export function authStatus(fields: Partial<AuthStatus> = {}): AuthStatus {
  return { authenticated: false, registrationMode: 'open', legacyLoginAvailable: false, ...fields };
}

/** GET /api/account of a learner with a confirmed address. */
export function account(fields: Partial<Account> = {}): Account {
  return {
    email: 'erza@example.ch',
    emailVerified: true,
    displayName: 'Erza',
    createdAt: '2026-10-07T08:00:00Z',
    ...fields,
  };
}

/** GET /api/reminders as the backend starts them: off, daily at 19:00, streak rescue at 21:30. */
export function reminderSettings(fields: Partial<ReminderSettings> = {}): ReminderSettings {
  return { enabled: false, time: '19:00', rescueEnabled: true, rescueTime: '21:30', ...fields };
}

/** A learner right after creating the account; override what a test needs. */
export function profile(fields: Partial<Profile> = {}): Profile {
  return {
    displayName: 'Erza',
    dailyGoalMinutes: 10,
    motivations: [],
    onboardingCompleted: false,
    onboardingStep: 'profile',
    xpTotal: 0,
    email: 'erza@example.ch',
    emailVerified: true,
    emailRequired: false,
    ...fields,
  };
}

/** GET /api/progress/today of a learner with a 3-day streak who has not practised yet today. */
export function todayProgress(
  fields: Partial<Omit<DailyProgress, 'streak'>> = {},
  streak: Partial<Streak> = {},
): DailyProgress {
  return {
    date: '2026-10-05',
    minutesToday: 0,
    goalMinutes: 10,
    goalMet: false,
    xpToday: 0,
    lessonsToday: 0,
    ...fields,
    streak: {
      current: 3,
      longest: 7,
      extendedToday: false,
      freezesLeft: 1,
      freezeUsedYesterday: false,
      lastActiveDate: '2026-10-04',
      ...streak,
    },
  };
}

/** GET /api/onboarding/options as the backend serves it. */
export const ONBOARDING_OPTIONS: OnboardingOptions = {
  motivations: [
    { value: 'family', label: 'Familie/Partner' },
    { value: 'travel', label: 'Reisen' },
    { value: 'work', label: 'Beruf' },
    { value: 'heritage', label: 'Herkunft' },
    { value: 'interest', label: 'Interesse' },
  ],
  dailyGoalMinutes: [5, 10, 15, 20],
  selfAssessments: [
    {
      value: 'nothing',
      label: 'Ich kann kein Wort',
      placementSkippable: true,
      startLevel: 'A0',
    },
    {
      value: 'few_words',
      label: 'Ich kenne ein paar Wörter',
      placementSkippable: false,
      startLevel: 'A1.1',
    },
    {
      value: 'simple_sentences',
      label: 'Ich verstehe einfache Sätze',
      placementSkippable: false,
      startLevel: 'A1.3',
    },
    {
      value: 'everyday_conversation',
      label: 'Ich komme im Alltag zurecht',
      placementSkippable: false,
      startLevel: 'A2.2',
    },
    {
      value: 'understand_much',
      label: 'Ich verstehe viel, will aber besser schreiben',
      placementSkippable: false,
      startLevel: 'B1.2',
    },
  ],
};

/** A started lesson with one multiple-choice exercise, as POST /api/lessons and friends answer. */
export function lessonResponse(fields: Partial<LessonResponse> = {}): LessonResponse {
  return {
    sessionId: '5b0c8a4e-0000-4000-8000-0000000000aa',
    unitId: 'a1_u01_greetings',
    kind: 'lesson',
    exercises: [{ ...SAMPLE_MULTIPLE_CHOICE, difficulty: 1, itemIds: [], level: 'A1.1' }],
    ...fields,
  };
}
