import { describe, expect, it } from 'vitest';
import { onboardingRedirect } from './onboardingRoutes';

describe('onboardingRedirect', () => {
  it('keeps a learner with open questions on the questions', () => {
    expect(onboardingRedirect('profile', '/')).toBe('/onboarding');
    expect(onboardingRedirect('profile', '/einstufung/test')).toBe('/onboarding');
    expect(onboardingRedirect('profile', '/onboarding')).toBeUndefined();
  });

  it('sends a learner without placement to the placement intro, but lets the answers be changed', () => {
    expect(onboardingRedirect('placement', '/')).toBe('/einstufung');
    expect(onboardingRedirect('placement', '/lesson/a1_u01_greetings')).toBe('/einstufung');
    expect(onboardingRedirect('placement', '/einstufung-alt')).toBe('/einstufung');
    expect(onboardingRedirect('placement', '/onboarding')).toBeUndefined();
    expect(onboardingRedirect('placement', '/einstufung')).toBeUndefined();
    expect(onboardingRedirect('placement', '/einstufung/test')).toBeUndefined();
  });

  it('opens the app once onboarding is done, keeping the placement open for "Neu einstufen"', () => {
    expect(onboardingRedirect('done', '/onboarding')).toBe('/');
    expect(onboardingRedirect('done', '/')).toBeUndefined();
    expect(onboardingRedirect('done', '/einstufung')).toBeUndefined();
    expect(onboardingRedirect('done', '/einstufung/ergebnis/42')).toBeUndefined();
    expect(onboardingRedirect('done', '/plan')).toBeUndefined();
  });
});
