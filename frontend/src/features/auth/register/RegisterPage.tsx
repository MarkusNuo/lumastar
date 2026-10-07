import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { useGoBack } from '../../../app/useGoBack';
import { Button } from '../../../components/ui/Button';
import { Callout } from '../../../components/ui/Callout';
import { Checkbox } from '../../../components/ui/Checkbox';
import { FocusScreen, ScreenFooter } from '../../../components/ui/FocusScreen';
import { MascotMessage } from '../../../components/ui/MascotMessage';
import { PasswordField } from '../../../components/ui/PasswordField';
import { TextField } from '../../../components/ui/TextField';
import { TextLink } from '../../../components/ui/TextLink';
import { showToast } from '../../../components/ui/toastStore';
import { celebrate } from '../../../lib/celebrate';
import { moveToNextFieldOnEnter } from '../../../lib/moveToNextField';
import { useFormErrors } from '../../../lib/useFormErrors';
import { LEGAL_ROUTES } from '../../legal/legalRoutes';
import { ACCOUNT_STEP } from '../../onboarding/onboardingSteps';
import { StepHeader } from '../../onboarding/StepHeader';
import { DISPLAY_NAME_MAX_LENGTH } from '../accountRules';
import { authStatusQuery, useAuthStatus, useRegister } from '../authHooks';
import { useThrottleLock } from '../authProblems';
import { AUTH_ROUTES } from '../authRoutes';
import { AUTH_COPY, FIELD_COPY } from '../copy';
import {
  EMPTY_REGISTRATION,
  registrationErrors,
  registrationFailure,
  toRegisterRequest,
  type RegistrationField,
  type RegistrationValues,
} from './registration';
import { RegistrationClosed } from './RegistrationClosed';

const copy = AUTH_COPY.register;

// Long enough to read the address the link went to.
const CREATED_TOAST_MS = 6000;

/**
 * Route `/registrieren` (first step of the first start, PRD F1): the account. Once it exists the
 * learner is signed in and the guards continue with the onboarding questions.
 */
export function RegisterPage() {
  const status = useAuthStatus();
  const [closedByServer, setClosedByServer] = useState(false);
  const mode = status.data?.registrationMode ?? 'open';

  if (mode === 'closed' || closedByServer) return <RegistrationClosed />;
  return (
    <RegisterForm inviteRequired={mode === 'invite'} onClosed={() => setClosedByServer(true)} />
  );
}

interface RegisterFormProps {
  inviteRequired: boolean;
  onClosed: () => void;
}

function RegisterForm({ inviteRequired, onClosed }: RegisterFormProps) {
  const register = useRegister((request) => {
    celebrate();
    showToast(copy.created(request.email), { durationMs: CREATED_TOAST_MS });
  });
  const queryClient = useQueryClient();
  const goBack = useGoBack(AUTH_ROUTES.welcome);
  const nameRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<RegistrationValues>(EMPTY_REGISTRATION);
  const [failure, setFailure] = useState<string>();
  const throttle = useThrottleLock();
  const [formRef, form] = useFormErrors(registrationErrors(values, inviteRequired));
  const { errors } = form;

  useEffect(() => nameRef.current?.focus(), []);

  const change = <Field extends RegistrationField>(
    field: Field,
    value: RegistrationValues[Field],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    form.clear(field);
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (register.isPending || throttle.locked || !form.check()) return;
    setFailure(undefined);
    register.mutate(toRegisterRequest(values, inviteRequired), {
      onError: (error) => {
        if (throttle.lockOn(error)) {
          form.shake();
          return;
        }
        const refused = registrationFailure(error);
        if (refused.kind === 'fields') form.rejectFields(refused.errors);
        else if (refused.kind === 'message') setFailure(refused.message);
        else {
          onClosed();
          void queryClient.invalidateQueries({ queryKey: authStatusQuery.queryKey });
        }
      },
    });
  };

  return (
    <FocusScreen
      header={<StepHeader step={ACCOUNT_STEP} onBack={goBack} backDisabled={register.isPending} />}
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-1 flex-col">
        <div className="flex flex-col gap-5 pt-4 pb-6">
          <MascotMessage>
            <h1>{copy.title}</h1>
          </MascotMessage>
          <TextField
            ref={nameRef}
            label={FIELD_COPY.displayName.label}
            placeholder={FIELD_COPY.displayName.placeholder}
            hint={FIELD_COPY.displayName.hint}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            value={values.displayName}
            error={errors.displayName}
            onChange={(event) => change('displayName', event.target.value)}
            onKeyDown={moveToNextFieldOnEnter}
          />
          <TextField
            label={FIELD_COPY.email.label}
            placeholder={FIELD_COPY.email.placeholder}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={values.email}
            error={errors.email}
            onChange={(event) => change('email', event.target.value)}
            onKeyDown={moveToNextFieldOnEnter}
          />
          <PasswordField
            label={FIELD_COPY.newPassword.label}
            hint={FIELD_COPY.newPassword.hint}
            autoComplete="new-password"
            enterKeyHint={inviteRequired ? 'next' : 'done'}
            value={values.password}
            error={errors.password}
            onChange={(event) => change('password', event.target.value)}
            onKeyDown={moveToNextFieldOnEnter}
          />
          {inviteRequired && (
            <TextField
              label={copy.inviteCode.label}
              hint={copy.inviteCode.hint}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              value={values.inviteCode}
              error={errors.inviteCode}
              onChange={(event) => change('inviteCode', event.target.value)}
            />
          )}
          <Checkbox
            checked={values.acceptPrivacy}
            error={errors.acceptPrivacy}
            onChange={(event) => change('acceptPrivacy', event.target.checked)}
          >
            {copy.privacy.before}
            {/* A new tab keeps what was typed here. */}
            <TextLink to={LEGAL_ROUTES.privacy} target="_blank" rel="noopener">
              {copy.privacy.link}
              <span className="sr-only"> {copy.privacy.newTab}</span>
            </TextLink>
            {copy.privacy.after}
          </Checkbox>
          {throttle.locked && <Callout tone="warning">{copy.throttled}</Callout>}
          {failure && <Callout tone="danger">{failure}</Callout>}
        </div>
        <ScreenFooter>
          <div className="flex flex-col gap-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={register.isPending}
              disabled={throttle.locked}
            >
              {throttle.locked ? AUTH_COPY.throttledWait(throttle.countdown) : copy.submit}
            </Button>
            <p className="text-center text-label font-bold text-fg-muted">
              {copy.haveAccount} <TextLink to={AUTH_ROUTES.login}>{copy.login}</TextLink>
            </p>
          </div>
        </ScreenFooter>
      </form>
    </FocusScreen>
  );
}
