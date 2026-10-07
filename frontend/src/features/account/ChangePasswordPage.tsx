import { KeyIcon } from '@phosphor-icons/react';
import { useId, useState, type SubmitEvent } from 'react';
import { useGoBack } from '../../app/useGoBack';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { PasswordField } from '../../components/ui/PasswordField';
import { showToast } from '../../components/ui/toastStore';
import { moveToNextFieldOnEnter } from '../../lib/moveToNextField';
import { useFormErrors } from '../../lib/useFormErrors';
import { validateCurrentPassword, validateNewPassword } from '../auth/accountRules';
import { useMe } from '../auth/authHooks';
import { rejectInvalid, useThrottleLock, type ServerFields } from '../auth/authProblems';
import { AUTH_COPY, FIELD_COPY } from '../auth/copy';
import { useChangePassword } from './accountApi';
import { isWrongPassword } from './accountProblems';
import { ACCOUNT_ROUTES } from './accountRoutes';
import { AccountScreen } from './AccountScreen';
import { ACCOUNT_COPY } from './copy';

const copy = ACCOUNT_COPY.password;

const SERVER_FIELDS: ServerFields<'currentPassword' | 'newPassword'> = {
  currentPassword: ['currentPassword', copy.wrongCurrent],
  newPassword: ['newPassword', AUTH_COPY.register.refused.password],
};

/** Route `/profil/passwort`: the current password confirms the new one. */
export function ChangePasswordPage() {
  const email = useMe().data?.email;
  const change = useChangePassword();
  const goBack = useGoBack(ACCOUNT_ROUTES.profile);
  const formId = useId();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [failure, setFailure] = useState<string>();
  const throttle = useThrottleLock();
  const newError = validateNewPassword(newPassword);
  const [formRef, form] = useFormErrors({
    currentPassword:
      validateCurrentPassword(currentPassword) && FIELD_COPY.currentPassword.required,
    newPassword: newError && FIELD_COPY.newPassword.errors[newError],
  });

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (change.isPending || throttle.locked || !form.check()) return;
    setFailure(undefined);
    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          showToast(copy.saved);
          goBack();
        },
        onError: (error) => {
          if (throttle.lockOn(error)) form.shake();
          else if (isWrongPassword(error))
            form.rejectFields({ currentPassword: copy.wrongCurrent });
          else if (!rejectInvalid(error, SERVER_FIELDS, form, setFailure)) {
            setFailure(copy.failed);
          }
        },
      },
    );
  };

  return (
    <AccountScreen
      title={copy.title}
      busy={change.isPending}
      footer={
        <Button
          type="submit"
          form={formId}
          size="lg"
          fullWidth
          icon={throttle.locked ? undefined : KeyIcon}
          loading={change.isPending}
          disabled={throttle.locked}
        >
          {throttle.locked ? AUTH_COPY.throttledWait(throttle.countdown) : copy.submit}
        </Button>
      }
    >
      <form ref={formRef} id={formId} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {/* Lets password managers file the new password under the right account. */}
        <input type="email" autoComplete="username" value={email ?? ''} hidden readOnly />
        <PasswordField
          label={copy.currentLabel}
          autoComplete="current-password"
          enterKeyHint="next"
          value={currentPassword}
          error={form.errors.currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
            form.clear('currentPassword');
          }}
          onKeyDown={moveToNextFieldOnEnter}
        />
        <PasswordField
          label={copy.newLabel}
          hint={FIELD_COPY.newPassword.hint}
          autoComplete="new-password"
          enterKeyHint="done"
          value={newPassword}
          error={form.errors.newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            form.clear('newPassword');
          }}
        />
        {throttle.locked && <Callout tone="warning">{AUTH_COPY.register.throttled}</Callout>}
        {failure && <Callout tone="danger">{failure}</Callout>}
      </form>
    </AccountScreen>
  );
}
