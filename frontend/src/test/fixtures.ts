import type { OnboardingOptions, Profile } from '../api/types';

/** A learner right after creating the account; override what a test needs. */
export function profile(fields: Partial<Profile> = {}): Profile {
  return {
    displayName: 'Erza',
    dailyGoalMinutes: 10,
    motivations: [],
    onboardingCompleted: false,
    onboardingStep: 'profile',
    xpTotal: 0,
    ...fields,
  };
}

/** GET /api/onboarding/options as the backend serves it (DECISIONS #46). */
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
