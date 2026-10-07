import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { isApiError } from '../../api/ApiError';
import { Button } from '../../components/ui/Button';
import { Callout } from '../../components/ui/Callout';
import { showToast } from '../../components/ui/toastStore';
import { REMINDER_COPY } from './copy';
import { useSendTestReminder } from './remindersApi';

const copy = REMINDER_COPY.test;

/** Sends a test notification to all the learner's devices, this one among them. */
export function TestReminderButton() {
  const send = useSendTestReminder();
  const problem = send.isError
    ? failureText(send.error)
    : send.data?.delivered === 0
      ? copy.notDelivered
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="neutral"
        size="lg"
        fullWidth
        icon={PaperPlaneTiltIcon}
        loading={send.isPending}
        onClick={() =>
          send.mutate(undefined, {
            onSuccess: (result) => {
              if (result.delivered > 0) showToast(copy.sent, { tone: 'primary' });
            },
          })
        }
      >
        {copy.button}
      </Button>
      {problem && <Callout tone="danger">{problem}</Callout>}
    </div>
  );
}

function failureText(error: Error): string {
  if (isApiError(error, 'no_push_devices')) return copy.noDevice;
  if (isApiError(error, 'too_many_requests')) return copy.tooMany;
  return copy.failed;
}
