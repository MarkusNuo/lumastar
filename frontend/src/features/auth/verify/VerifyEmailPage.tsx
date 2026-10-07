import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { isApiError } from '../../../api/ApiError';
import { Button } from '../../../components/ui/Button';
import { ButtonLink } from '../../../components/ui/ButtonLink';
import { Callout } from '../../../components/ui/Callout';
import { LoadingDots } from '../../../components/ui/LoadingDots';
import { useCelebration } from '../../../lib/useCelebration';
import { refreshAccount } from '../../account/accountApi';
import { ResendButton } from '../../account/verification/ResendButton';
import { useAuthStatus } from '../authHooks';
import { linkProblem, type LinkProblem } from '../authProblems';
import { AUTH_ROUTES } from '../authRoutes';
import { AuthIntro, AuthMessage, AuthScreen } from '../AuthScreen';
import { AUTH_COPY } from '../copy';
import { call } from '../interimApi';

const copy = AUTH_COPY.verifyEmail;

function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => call('POST', '/api/auth/verify-email', { token }),
    onSuccess: () => refreshAccount(queryClient),
  });
}

/**
 * Route `/verify-email?token=…` from the verification mail (also for a changed address). It needs
 * no session, but a signed-in learner can ask for a new link right here.
 */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const verify = useVerifyEmail();
  const { mutate } = verify;
  const started = useRef(false);

  useEffect(() => {
    // Once only: a second request would find the link used up.
    if (!token || started.current) return;
    started.current = true;
    mutate(token);
  }, [token, mutate]);

  if (!token) return <VerifyLinkProblem problem="invalid" />;
  if (verify.isSuccess) return <Verified />;
  if (verify.isError) {
    const problem = linkProblem(verify.error);
    if (problem) return <VerifyLinkProblem problem={problem} />;
    if (isApiError(verify.error, 'email_taken')) return <AddressTaken />;
    return <VerifyFailed onRetry={() => mutate(token)} />;
  }
  return <Checking />;
}

function useSignedIn(): boolean {
  return useAuthStatus().data?.authenticated === true;
}

interface OnwardLinkProps {
  signedIn: boolean;
  /** Neutral when another button is the main action. */
  variant?: 'primary' | 'neutral';
}

/** Into the app with a session, to the sign-in without one. */
function OnwardLink({ signedIn, variant = 'primary' }: OnwardLinkProps) {
  return (
    <ButtonLink to={signedIn ? '/' : AUTH_ROUTES.login} variant={variant} size="lg" fullWidth>
      {signedIn ? copy.toApp : copy.toLogin}
    </ButtonLink>
  );
}

function Checking() {
  return (
    <AuthScreen className="justify-center">
      <div role="status" className="flex flex-col items-center gap-4">
        <AuthIntro expression="thinking" title={copy.checking} />
        <LoadingDots className="text-primary-soft" />
      </div>
    </AuthScreen>
  );
}

function Verified() {
  const signedIn = useSignedIn();
  useCelebration(true, 'complete');

  return (
    <AuthMessage
      expression="celebrating"
      title={copy.done.title}
      text={copy.done.text}
      action={<OnwardLink signedIn={signedIn} />}
    />
  );
}

function VerifyLinkProblem({ problem }: { problem: LinkProblem }) {
  const signedIn = useSignedIn();
  const message = AUTH_COPY.link[problem];
  const offerResend = problem === 'expired' && signedIn;
  const hint =
    problem === 'expired' ? (signedIn ? copy.expiredSignedIn : copy.expiredSignedOut) : '';

  return (
    <AuthMessage
      expression="encouraging"
      title={message.title}
      text={`${message.text} ${hint}`.trim()}
      action={
        <div className="flex flex-col gap-3">
          {offerResend && <ResendButton variant="primary" size="lg" fullWidth />}
          <OnwardLink signedIn={signedIn} variant={offerResend ? 'neutral' : 'primary'} />
        </div>
      }
    />
  );
}

/** Another account took the new address between the change and the click on the link. */
function AddressTaken() {
  const signedIn = useSignedIn();
  return (
    <AuthMessage
      expression="encouraging"
      title={copy.taken.title}
      text={copy.taken.text}
      action={<OnwardLink signedIn={signedIn} />}
    />
  );
}

function VerifyFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <AuthMessage
      expression="sad"
      title={copy.failedTitle}
      action={
        <Button variant="primary" size="lg" fullWidth icon={ArrowClockwiseIcon} onClick={onRetry}>
          {copy.retry}
        </Button>
      }
    >
      <Callout tone="danger">{copy.failed}</Callout>
    </AuthMessage>
  );
}
