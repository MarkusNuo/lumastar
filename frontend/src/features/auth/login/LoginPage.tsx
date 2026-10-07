import { SignInIcon } from '@phosphor-icons/react';
import { useId, useState, type SubmitEvent } from 'react';
import { isApiError } from '../../../api/ApiError';
import { Button } from '../../../components/ui/Button';
import { Callout } from '../../../components/ui/Callout';
import type { MascotExpression } from '../../../components/ui/Mascot';
import { PasswordField } from '../../../components/ui/PasswordField';
import { TextField } from '../../../components/ui/TextField';
import { TextLink } from '../../../components/ui/TextLink';
import { moveToNextFieldOnEnter } from '../../../lib/moveToNextField';
import { useFormErrors } from '../../../lib/useFormErrors';
import { normalize, validateCurrentPassword, validateEmail } from '../accountRules';
import { useAuthStatus, useLogin } from '../authHooks';
import { rejectInvalid, useThrottleLock, type ServerFields } from '../authProblems';
import { AUTH_ROUTES } from '../authRoutes';
import { AuthIntro, AuthScreen } from '../AuthScreen';
import { AUTH_COPY, FIELD_COPY } from '../copy';
import type { ForgotPasswordState } from '../password/ForgotPasswordPage';

const copy = AUTH_COPY.login;

const SERVER_FIELDS: ServerFields<'email' | 'password'> = {
  email: ['email', FIELD_COPY.email.errors.invalid],
  password: ['password', copy.wrongCredentials],
};

/** Route `/anmelden`: e-mail and password. */
export function LoginPage() {
  const status = useAuthStatus();
  const login = useLogin();
  const formId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<string>();
  const throttle = useThrottleLock();
  const emailError = validateEmail(email);
  const [formRef, form] = useFormErrors({
    email: emailError && FIELD_COPY.email.errors[emailError],
    password: validateCurrentPassword(password) && FIELD_COPY.currentPassword.required,
  });

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (throttle.locked || login.isPending || !form.check()) return;
    setFailure(undefined);
    login.mutate(
      { email: normalize(email), password },
      {
        onError: (error) => {
          if (throttle.lockOn(error)) form.shake();
          else if (isApiError(error, 'invalid_credentials')) {
            form.rejectFields({ password: copy.wrongCredentials });
          } else if (!rejectInvalid(error, SERVER_FIELDS, form, setFailure)) {
            setFailure(copy.failed);
          }
        },
      },
    );
  };

  const expression: MascotExpression = login.isPending
    ? 'thinking'
    : form.errors.password || throttle.locked
      ? 'encouraging'
      : 'happy';
  const forgotState: ForgotPasswordState = { email: normalize(email) };

  return (
    <AuthScreen
      backTo={AUTH_ROUTES.welcome}
      footer={
        <div className="flex flex-col gap-4">
          <Button
            type="submit"
            form={formId}
            variant="primary"
            size="lg"
            fullWidth
            icon={throttle.locked ? undefined : SignInIcon}
            loading={login.isPending}
            disabled={throttle.locked}
          >
            {throttle.locked ? AUTH_COPY.throttledWait(throttle.countdown) : copy.submit}
          </Button>
          {status.data?.registrationMode !== 'closed' && (
            <p className="text-center text-label font-bold text-fg-muted">
              {copy.noAccount} <TextLink to={AUTH_ROUTES.register}>{copy.register}</TextLink>
            </p>
          )}
          {status.data?.legacyLoginAvailable && (
            <p className="text-center text-caption">
              <TextLink to={AUTH_ROUTES.legacyLogin} subtle>
                {copy.legacy}
              </TextLink>
            </p>
          )}
        </div>
      }
    >
      <AuthIntro expression={expression} title={copy.title} text={copy.text} compact />
      <form ref={formRef} id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label={FIELD_COPY.email.label}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          value={email}
          error={form.errors.email}
          onChange={(event) => {
            setEmail(event.target.value);
            form.clear('email');
            // "Address or password wrong" is about both fields.
            form.clear('password');
          }}
          onKeyDown={moveToNextFieldOnEnter}
        />
        <PasswordField
          label={FIELD_COPY.currentPassword.label}
          autoComplete="current-password"
          enterKeyHint="go"
          value={password}
          error={form.errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            form.clear('password');
          }}
        />
        <TextLink
          to={AUTH_ROUTES.forgotPassword}
          state={forgotState}
          className="self-end text-label"
        >
          {copy.forgot}
        </TextLink>
        {throttle.locked && <Callout tone="warning">{copy.throttled}</Callout>}
        {failure && <Callout tone="danger">{failure}</Callout>}
      </form>
    </AuthScreen>
  );
}
