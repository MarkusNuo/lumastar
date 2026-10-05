import type { Motivation, OnboardingRequest, Profile, SelfAssessment } from '../../api/types';
import type { QuestionStep } from './onboardingSteps';

/** The answers of the onboarding questions while they are being given. */
export interface OnboardingAnswers {
  motivations: Motivation[];
  dailyGoalMinutes: number;
  selfAssessment?: SelfAssessment;
}

/** Starts from what the profile already knows, so changing the answers later keeps the others. */
export function initialAnswers(profile: Profile): OnboardingAnswers {
  return {
    motivations: profile.motivations,
    dailyGoalMinutes: profile.dailyGoalMinutes,
    selfAssessment: profile.selfAssessment,
  };
}

/** Adds or removes a motivation and keeps the order in which the options are shown. */
export function toggleMotivation(
  selected: readonly Motivation[],
  motivation: Motivation,
  order: readonly Motivation[],
): Motivation[] {
  const next = selected.includes(motivation)
    ? selected.filter((candidate) => candidate !== motivation)
    : [...selected, motivation];
  return order.filter((candidate) => next.includes(candidate));
}

export function isAnswered(step: QuestionStep, answers: OnboardingAnswers): boolean {
  switch (step) {
    case 'motivation':
      return answers.motivations.length > 0;
    case 'dailyGoal':
      return answers.dailyGoalMinutes > 0;
    case 'selfAssessment':
      return answers.selfAssessment !== undefined;
  }
}

/** The request once every question is answered, otherwise undefined. */
export function toRequest(answers: OnboardingAnswers): OnboardingRequest | undefined {
  const { motivations, dailyGoalMinutes, selfAssessment } = answers;
  if (motivations.length === 0 || selfAssessment === undefined) return undefined;
  return { motivations, dailyGoalMinutes, selfAssessment };
}
