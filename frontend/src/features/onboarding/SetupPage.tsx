import { useState } from 'react';
import { isApiError } from '../../api/ApiError';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { celebrate } from '../../lib/celebrate';
import { useSetupAccount } from '../auth/authHooks';
import { SETUP_COPY } from './copy';
import { ACCOUNT_STEPS } from './onboardingSteps';
import { normalizeDisplayName } from './setupRules';
import { StepHeader } from './StepHeader';
import { NameStep } from './steps/NameStep';
import { PasswordStep } from './steps/PasswordStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { useStepFlow } from './useStepFlow';

function failureMessage(error: Error | null): string | undefined {
  if (!error) return undefined;
  if (isApiError(error, 'account_exists')) return SETUP_COPY.failure.accountExists;
  if (isApiError(error, 'validation_failed')) return SETUP_COPY.failure.invalid;
  return SETUP_COPY.failure.failed;
}

/**
 * First start, part one (PRD F1): the account. Once it exists the learner is signed in and the
 * onboarding guard continues with the questions on /onboarding.
 */
export function SetupPage() {
  const flow = useStepFlow(ACCOUNT_STEPS);
  const setupAccount = useSetupAccount();
  const [displayName, setDisplayName] = useState('');

  if (flow.step === 'welcome') return <WelcomeStep onStart={flow.next} />;

  const createAccount = (password: string) => {
    setupAccount.mutate(
      { displayName: normalizeDisplayName(displayName), password },
      { onSuccess: celebrate },
    );
  };

  return (
    <FocusScreen
      header={
        <StepHeader step={flow.step} onBack={flow.back} backDisabled={setupAccount.isPending} />
      }
    >
      {flow.step === 'name' && (
        <NameStep
          key="name"
          value={displayName}
          onChange={setDisplayName}
          onNext={flow.next}
          direction={flow.direction}
        />
      )}
      {flow.step === 'password' && (
        <PasswordStep
          key="password"
          displayName={normalizeDisplayName(displayName)}
          onSubmit={createAccount}
          pending={setupAccount.isPending}
          failure={failureMessage(setupAccount.error)}
          direction={flow.direction}
        />
      )}
    </FocusScreen>
  );
}
