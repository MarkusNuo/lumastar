import type { OnboardingOptions, Profile } from '../../api/types';

/**
 * Whether the learner may start at A0 instead of taking the test (PRD F1): only before the first
 * placement and only with the self-assessment the backend marks as skippable ("Ich kann kein Wort").
 */
export function canSkipPlacement(profile: Profile, options: OnboardingOptions): boolean {
  if (profile.onboardingStep !== 'placement') return false;
  const chosen = options.selfAssessments.find((option) => option.value === profile.selfAssessment);
  return chosen?.placementSkippable ?? false;
}
