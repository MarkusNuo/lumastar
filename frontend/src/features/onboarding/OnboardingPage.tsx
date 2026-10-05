import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { OnboardingOptions, Profile } from '../../api/types';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { useMe } from '../auth/authHooks';
import { ONBOARDING_COPY } from './copy';
import { onboardingOptionsQuery, useAnswerOnboarding } from './onboardingApi';
import { initialAnswers, isAnswered, toggleMotivation, toRequest } from './onboardingAnswers';
import { dailyGoalOptions, motivationOptions, selfAssessmentOptions } from './onboardingOptions';
import { ONBOARDING_ROUTES } from './onboardingRoutes';
import { QUESTION_STEPS } from './onboardingSteps';
import { StepHeader } from './StepHeader';
import { ChoiceStep } from './steps/ChoiceStep';
import { useStepFlow } from './useStepFlow';

const copy = ONBOARDING_COPY;

/** Route `/onboarding`: motivation, daily goal and self-assessment (PRD F1), then the placement. */
export function OnboardingPage() {
  const me = useMe();
  const options = useQuery(onboardingOptionsQuery);

  if (me.data && options.data) {
    return <OnboardingQuestions profile={me.data} options={options.data} />;
  }
  return (
    <FocusScreen header={<StepHeader step={QUESTION_STEPS[0]} />} className="justify-center">
      {options.isError ? (
        <LoadFailed
          message={copy.loadFailed}
          retrying={options.isFetching}
          onRetry={() => void options.refetch()}
        />
      ) : (
        <LoadingBlock label={copy.loading} className="h-60" />
      )}
    </FocusScreen>
  );
}

function OnboardingQuestions({
  profile,
  options,
}: {
  profile: Profile;
  options: OnboardingOptions;
}) {
  const navigate = useNavigate();
  const flow = useStepFlow(QUESTION_STEPS);
  const [answers, setAnswers] = useState(() => initialAnswers(profile));
  const saveAnswers = useAnswerOnboarding();
  const motivationOrder = options.motivations.map((option) => option.value);

  const toPlacement = () => void navigate(ONBOARDING_ROUTES.placementIntro, { replace: true });
  const submit = () => {
    const request = toRequest(answers);
    if (request) saveAnswers.mutate(request, { onSuccess: toPlacement });
  };

  // Back from the first question only leads somewhere once the answers were saved before.
  const back =
    flow.index > 0 ? flow.back : profile.onboardingStep === 'placement' ? toPlacement : undefined;
  const common = {
    nextLabel: copy.next,
    canContinue: isAnswered(flow.step, answers),
    direction: flow.direction,
  };

  return (
    <FocusScreen
      header={<StepHeader step={flow.step} onBack={back} backDisabled={saveAnswers.isPending} />}
    >
      {flow.step === 'motivation' && (
        <ChoiceStep
          key="motivation"
          {...common}
          question={copy.motivation.question}
          hint={copy.motivation.hint}
          options={motivationOptions(options)}
          isSelected={(value) => answers.motivations.includes(value)}
          onSelect={(value) =>
            setAnswers({
              ...answers,
              motivations: toggleMotivation(answers.motivations, value, motivationOrder),
            })
          }
          onNext={flow.next}
        />
      )}
      {flow.step === 'dailyGoal' && (
        <ChoiceStep
          key="dailyGoal"
          {...common}
          question={copy.dailyGoal.question}
          hint={copy.dailyGoal.hint}
          options={dailyGoalOptions(options)}
          isSelected={(value) => answers.dailyGoalMinutes === value}
          onSelect={(value) => setAnswers({ ...answers, dailyGoalMinutes: value })}
          onNext={flow.next}
        />
      )}
      {flow.step === 'selfAssessment' && (
        <ChoiceStep
          key="selfAssessment"
          {...common}
          question={copy.selfAssessment.question}
          hint={copy.selfAssessment.hint}
          options={selfAssessmentOptions(options)}
          isSelected={(value) => answers.selfAssessment === value}
          onSelect={(value) => setAnswers({ ...answers, selfAssessment: value })}
          onNext={submit}
          pending={saveAnswers.isPending}
          failure={saveAnswers.isError ? copy.saveFailed : undefined}
        />
      )}
    </FocusScreen>
  );
}
