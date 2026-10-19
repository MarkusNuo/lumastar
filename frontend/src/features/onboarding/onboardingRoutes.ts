import type { OnboardingStep } from '../../api/types';

/** Routes of the onboarding after the account step and of the placement test. */
export const ONBOARDING_ROUTES = {
  questions: '/onboarding',
  placementIntro: '/einstufung',
  placementTest: '/einstufung/test',
  placementResult: (testId: string) => `/einstufung/ergebnis/${testId}`,
  plan: '/plan',
  home: '/',
} as const;

const PLACEMENT_PREFIX = '/einstufung';

function isPlacementRoute(pathname: string): boolean {
  return pathname === PLACEMENT_PREFIX || pathname.startsWith(`${PLACEMENT_PREFIX}/`);
}

/**
 * Where a signed-in learner has to go for the onboarding step the backend reports, or undefined to
 * stay. The questions stay open until the first placement, so the answers can still be changed;
 * the placement routes stay open afterwards for "Neu einstufen".
 */
export function onboardingRedirect(step: OnboardingStep, pathname: string): string | undefined {
  const onQuestions = pathname === ONBOARDING_ROUTES.questions;
  switch (step) {
    case 'profile':
      return onQuestions ? undefined : ONBOARDING_ROUTES.questions;
    case 'placement':
      return onQuestions || isPlacementRoute(pathname)
        ? undefined
        : ONBOARDING_ROUTES.placementIntro;
    case 'done':
      return onQuestions ? ONBOARDING_ROUTES.home : undefined;
  }
}
