import { ArrowClockwiseIcon, CheckIcon, SignOutIcon } from '@phosphor-icons/react';
import { useId, useState, type SubmitEvent } from 'react';
import { isApiError } from '../../api/ApiError';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { PasswordField } from '../../components/ui/PasswordField';
import { TextField } from '../../components/ui/TextField';
import { showToast } from '../../components/ui/toastStore';
import { moveToNextFieldOnEnter } from '../../lib/moveToNextField';
import { useFormErrors } from '../../lib/useFormErrors';
import { normalize, validateCurrentPassword, validateEmail } from '../auth/accountRules';
import { useLogout, useMe } from '../auth/authHooks';
import { invalidFields, useThrottleLock } from '../auth/authProblems';
import { AuthIntro, AuthScreen } from '../auth/AuthScreen';
import { AUTH_COPY, FIELD_COPY } from '../auth/copy';
import { useChangeEmail } from './accountApi';
import { isWrongPassword } from './accountProblems';
import { ACCOUNT_COPY } from './copy';
import { ResendButton } from './verification/ResendButton';

const copy = ACCOUNT_COPY.addEmail;

// Long enough to read the address the link went to.
const SAVED_TOAST_MS = 6000;

/**
 * Route `/e-mail-hinzufuegen`: the account of the former single-user version gets its e-mail
 * address before anything else (the guard keeps it here until the backend no longer requires it).
 */
export function AddEmailPage() {
  const change = useChangeEmail((account) => {
    if (account.email) showToast(copy.saved(account.email), { durationMs: SAVED_TOAST_MS });
  });
  // Still required after a successful save: the backend waits for the link to be opened.
  return change.isSuccess ? (
    <WaitForConfirmation email={change.variables.newEmail} />
  ) : (
    <AddEmailForm change={change} />
  );
}

function LogoutButton() {
  const logout = useLogout();
  return (
    <Button
      variant="ghost"
      size="md"
      fullWidth
      icon={SignOutIcon}
      loading={logout.isPending}
      onClick={() => logout.mutate()}
    >
      {copy.logout}
    </Button>
  );
}

function AddEmailForm({ change }: { change: ReturnType<typeof useChangeEmail> }) {
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
    if (change.isPending || throttle.locked || !form.check()) return;
    setFailure(undefined);
    change.mutate(
      { newEmail: normalize(email), password },
      {
        onError: (error) => {
          if (throttle.lockOn(error)) form.shake();
          else if (isWrongPassword(error)) {
            form.rejectFields({ password: FIELD_COPY.currentPassword.wrong });
          } else if (isApiError(error, 'email_taken')) {
            form.rejectFields({ email: ACCOUNT_COPY.email.taken });
          } else if (invalidFields(error).length > 0) {
            form.rejectFields({ email: FIELD_COPY.email.errors.invalid });
          } else setFailure(ACCOUNT_COPY.email.failed);
        },
      },
    );
  };

  return (
    <AuthScreen
      footer={
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            form={formId}
            size="lg"
            fullWidth
            icon={throttle.locked ? undefined : CheckIcon}
            loading={change.isPending}
            disabled={throttle.locked}
          >
            {throttle.locked ? AUTH_COPY.throttledWait(throttle.countdown) : copy.submit}
          </Button>
          <LogoutButton />
        </div>
      }
    >
      <AuthIntro
        expression={change.isPending ? 'thinking' : 'encouraging'}
        title={copy.title}
        text={copy.text}
        compact
      />
      <form ref={formRef} id={formId} noValidate onSubmit={submit} className="flex flex-col gap-5">
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
          value={email}
          error={form.errors.email}
          onChange={(event) => {
            setEmail(event.target.value);
            form.clear('email');
          }}
          onKeyDown={moveToNextFieldOnEnter}
        />
        <PasswordField
          label={FIELD_COPY.currentPassword.label}
          hint={ACCOUNT_COPY.email.passwordHint}
          autoComplete="current-password"
          enterKeyHint="done"
          value={password}
          error={form.errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            form.clear('password');
          }}
        />
        {throttle.locked && <Callout tone="warning">{AUTH_COPY.register.throttled}</Callout>}
        {failure && <Callout tone="danger">{failure}</Callout>}
      </form>
    </AuthScreen>
  );
}

function WaitForConfirmation({ email }: { email: string }) {
  const me = useMe();

  return (
    <AuthScreen
      className="justify-center"
      footer={
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            fullWidth
            icon={ArrowClockwiseIcon}
            loading={me.isFetching}
            onClick={() => void me.refetch()}
          >
            {copy.waiting.check}
          </Button>
          <ResendButton size="md" fullWidth />
          <LogoutButton />
        </div>
      }
    >
      <AuthIntro
        expression="happy"
        title={copy.waiting.title}
        text={copy.waiting.text(email)}
        focusTitle
      />
    </AuthScreen>
  );
}
