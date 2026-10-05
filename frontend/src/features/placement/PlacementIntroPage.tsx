import { ArrowLeftIcon, SmileyIcon, TimerIcon, type Icon } from '@phosphor-icons/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useGoBack } from '../../app/useGoBack';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { IconButton } from '../../components/ui/IconButton';
import { Mascot } from '../../components/ui/Mascot';
import { useMe } from '../auth/authHooks';
import { onboardingOptionsQuery } from '../onboarding/onboardingApi';
import { ONBOARDING_ROUTES } from '../onboarding/onboardingRoutes';
import { PLACEMENT_COPY } from './copy';
import { skipPlacement } from './placementApi';
import { canSkipPlacement } from './placementSkip';
import { useOpenPlacementResult } from './useOpenPlacementResult';

const copy = PLACEMENT_COPY.intro;

/**
 * Route `/einstufung`: what the placement test is about, before the first test (PRD 6) and for
 * "Neu einstufen". A learner who cannot speak a word yet may start at A0 straight away (PRD F1).
 */
export function PlacementIntroPage() {
  const me = useMe();
  const options = useQuery(onboardingOptionsQuery);
  const navigate = useNavigate();
  const goBack = useGoBack(ONBOARDING_ROUTES.home);
  const openResult = useOpenPlacementResult();
  const skip = useMutation({
    mutationFn: skipPlacement,
    onSuccess: (result) => openResult(result.testId, result),
  });

  const firstPlacement = me.data?.onboardingStep === 'placement';
  const skippable = me.data && options.data ? canSkipPlacement(me.data, options.data) : false;
  // Before the first test, back leads to the questions so the answers can still be changed.
  const back = firstPlacement
    ? () => void navigate(ONBOARDING_ROUTES.questions, { replace: true })
    : goBack;

  return (
    <FocusScreen
      backdrop
      header={
        <IconButton
          icon={ArrowLeftIcon}
          label={copy.back}
          variant="ghost"
          disabled={skip.isPending}
          onClick={back}
        />
      }
      className="items-center justify-center gap-5 pb-6 text-center"
      footer={
        <div className="flex flex-col gap-3">
          {skip.isError && <Callout tone="danger">{copy.skipFailed}</Callout>}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={skip.isPending}
            onClick={() => void navigate(ONBOARDING_ROUTES.placementTest)}
          >
            {copy.start}
          </Button>
          {skippable && (
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              loading={skip.isPending}
              onClick={() => skip.mutate()}
            >
              {copy.skip}
            </Button>
          )}
        </div>
      }
    >
      <Mascot expression="thinking" size="xl" />
      <div className="flex flex-col gap-2">
        <p className="text-caption font-black tracking-wider text-primary-soft uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="text-headline font-black">
          {firstPlacement ? copy.title : copy.replacementTitle}
        </h1>
        <p className="max-w-sm text-body text-fg-muted">
          {firstPlacement ? copy.text : copy.replacementText}
        </p>
      </div>
      <ul className="flex flex-wrap justify-center gap-2">
        <Fact icon={TimerIcon} text={copy.facts.duration} />
        <Fact icon={SmileyIcon} text={copy.facts.relaxed} />
      </ul>
    </FocusScreen>
  );
}

function Fact({ icon: FactIcon, text }: { icon: Icon; text: string }) {
  return (
    <li
      data-tone="secondary"
      className="inline-flex items-center gap-2 rounded-full tone-outline px-3.5 py-1.5 text-label font-extrabold"
    >
      <FactIcon aria-hidden="true" size={18} weight="bold" />
      {text}
    </li>
  );
}
