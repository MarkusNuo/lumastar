import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { isApiError } from '../../api/ApiError';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { IconButton } from '../../components/ui/IconButton';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { celebrate } from '../../lib/celebrate';
import { useSetupAccount } from '../auth/authHooks';
import { SETUP_COPY } from './copy';
import { normalizeDisplayName } from './setupRules';
import { NameStep } from './steps/NameStep';
import { PasswordStep } from './steps/PasswordStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { useStepFlow } from './useStepFlow';

/*
 * First start (PRD F1). This milestone only creates the account; motivation, daily goal and
 * self-assessment (M3) are appended to SETUP_STEPS and rendered below like the other steps.
 */
const SETUP_STEPS = ['welcome', 'name', 'password'] as const;

function failureMessage(error: Error | null): string | undefined {
  if (!error) return undefined;
  if (isApiError(error, 'account_exists')) return SETUP_COPY.failure.accountExists;
  if (isApiError(error, 'validation_failed')) return SETUP_COPY.failure.invalid;
  return SETUP_COPY.failure.failed;
}

export function SetupPage() {
  const flow = useStepFlow(SETUP_STEPS);
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
        <>
          <IconButton
            icon={ArrowLeftIcon}
            label={SETUP_COPY.back}
            variant="ghost"
            disabled={setupAccount.isPending}
            onClick={flow.back}
          />
          <ProgressBar
            label={SETUP_COPY.progressLabel}
            value={flow.index}
            max={flow.count}
            valueText={SETUP_COPY.progressValue(flow.index, flow.count - 1)}
          />
        </>
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
