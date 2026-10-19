import { ExamIcon, MapTrifoldIcon } from '@phosphor-icons/react';
import { useNavigate } from 'react-router';
import { ActionList, ActionRow } from '../../components/ui/ActionList';
import { ONBOARDING_ROUTES } from '../onboarding/onboardingRoutes';
import { PROFILE_COPY } from './copy';

const copy = PROFILE_COPY.learning;

/** "Lernen": the plan up to C2 and a new placement test ("Neu einstufen"). */
export function LearningSection() {
  const navigate = useNavigate();

  return (
    <ActionList title={copy.title}>
      <ActionRow
        icon={MapTrifoldIcon}
        tone="secondary"
        label={copy.plan.label}
        description={copy.plan.description}
        onClick={() => void navigate(ONBOARDING_ROUTES.plan)}
      />
      <ActionRow
        icon={ExamIcon}
        tone="primary"
        label={copy.placement.label}
        description={copy.placement.description}
        onClick={() => void navigate(ONBOARDING_ROUTES.placementIntro)}
      />
    </ActionList>
  );
}
