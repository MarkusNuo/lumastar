import { useEffect, useState } from 'react';
import { useShake } from './useShake';

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

/**
 * Field errors of a form. The client checks show up after the first submit and then follow the
 * input live; an error from the server stays on its field until that field changes. A rejected
 * submit shakes the form and focuses its first invalid field. Returns the form's ref and the form.
 */
export function useFormErrors<Field extends string>(clientErrors: FieldErrors<Field>) {
  const [formRef, shake] = useShake<HTMLFormElement>();
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors<Field>>({});
  const [rejections, setRejections] = useState(0);

  useEffect(() => {
    if (rejections === 0) return;
    shake();
    formRef.current.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [rejections, shake, formRef]);

  const reject = () => setRejections((count) => count + 1);
  const errors: FieldErrors<Field> = { ...(submitted ? clientErrors : {}), ...serverErrors };

  const form = {
    errors,
    /** Starts a submit: true when every client check passes, otherwise the form is rejected. */
    check: (): boolean => {
      setSubmitted(true);
      setServerErrors({});
      const valid = !Object.values(clientErrors).some(Boolean);
      if (!valid) reject();
      return valid;
    },
    /** Shows errors the server reported for single fields. */
    rejectFields: (fieldErrors: FieldErrors<Field>) => {
      setServerErrors(fieldErrors);
      reject();
    },
    /** Shakes the form without a field error, e.g. while sign-in is throttled. */
    shake,
    /** The field changed: its server error no longer applies. */
    clear: (field: Field) =>
      setServerErrors((current) =>
        field in current
          ? (Object.fromEntries(
              Object.entries(current).filter(([key]) => key !== field),
            ) as FieldErrors<Field>)
          : current,
      ),
  };
  return [formRef, form] as const;
}
