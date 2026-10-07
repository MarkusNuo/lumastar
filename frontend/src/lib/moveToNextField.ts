import type { KeyboardEvent } from 'react';

const TEXT_FIELDS =
  'input:not([type="checkbox"]):not([type="hidden"]):not([hidden]):not(:disabled)';

/**
 * Enter in a text field that is not the form's last one moves on to the next field instead of
 * submitting the half-filled form, the way the phone keyboard's "next" key suggests.
 */
export function moveToNextFieldOnEnter(event: KeyboardEvent<HTMLInputElement>): void {
  if (event.key !== 'Enter') return;
  const fields = Array.from(
    event.currentTarget.form?.querySelectorAll<HTMLInputElement>(TEXT_FIELDS) ?? [],
  );
  const next = fields[fields.indexOf(event.currentTarget) + 1];
  if (!next) return;
  event.preventDefault();
  next.focus();
}
