import { CheckIcon } from '@phosphor-icons/react';
import { useId, useState, type SubmitEvent } from 'react';
import { useGoBack } from '../../app/useGoBack';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { TextField } from '../../components/ui/TextField';
import { showToast } from '../../components/ui/toastStore';
import { useFormErrors } from '../../lib/useFormErrors';
import { DISPLAY_NAME_MAX_LENGTH, normalize, validateDisplayName } from '../auth/accountRules';
import { useMe } from '../auth/authHooks';
import { FIELD_COPY } from '../auth/copy';
import { useChangeDisplayName } from './accountApi';
import { ACCOUNT_ROUTES } from './accountRoutes';
import { AccountScreen, AccountScreenLoading } from './AccountScreen';
import { ACCOUNT_COPY } from './copy';

const copy = ACCOUNT_COPY.displayName;

/** Route `/profil/name`. */
export function ChangeDisplayNamePage() {
  const me = useMe();

  return me.data ? (
    <DisplayNameForm current={me.data.displayName} />
  ) : (
    <AccountScreenLoading title={copy.title} query={me} />
  );
}

function DisplayNameForm({ current }: { current: string }) {
  const change = useChangeDisplayName();
  const goBack = useGoBack(ACCOUNT_ROUTES.profile);
  const formId = useId();
  const [name, setName] = useState(current);
  const nameError = validateDisplayName(name);
  const [formRef, form] = useFormErrors({
    displayName: nameError && FIELD_COPY.displayName.errors[nameError],
  });

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (change.isPending || !form.check()) return;
    const displayName = normalize(name);
    if (displayName === current) {
      goBack();
      return;
    }
    change.mutate(displayName, {
      onSuccess: () => {
        showToast(copy.saved);
        goBack();
      },
    });
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
          icon={CheckIcon}
          loading={change.isPending}
        >
          {copy.submit}
        </Button>
      }
    >
      <form ref={formRef} id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label={FIELD_COPY.displayName.label}
          placeholder={FIELD_COPY.displayName.placeholder}
          hint={FIELD_COPY.displayName.hint}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="done"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          value={name}
          error={form.errors.displayName}
          onChange={(event) => setName(event.target.value)}
        />
        {change.isError && <Callout tone="danger">{copy.failed}</Callout>}
      </form>
    </AccountScreen>
  );
}
