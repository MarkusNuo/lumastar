import { useId, useRef } from 'react';
import { Button } from './Button';
import type { ButtonVariant } from './buttonStyles';
import { Mascot, type MascotExpression } from './Mascot';
import { Sheet } from './Sheet';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  text?: string;
  /** The safe choice; focused on open and triggered by Escape. */
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  mascot?: MascotExpression;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Bottom sheet asking to confirm a step that loses something, e.g. leaving a lesson. */
export function ConfirmDialog({
  open,
  title,
  text,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'danger',
  mascot = 'sad',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const textId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Sheet
      open={open}
      onClose={onCancel}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={text ? textId : undefined}
      initialFocusRef={cancelRef}
      className="flex flex-col items-center gap-3 text-center"
    >
      <Mascot expression={mascot} size="md" />
      <h2 id={titleId} className="text-title font-black">
        {title}
      </h2>
      {text && (
        <p id={textId} className="text-body text-fg-muted">
          {text}
        </p>
      )}
      <div className="mt-2 flex w-full flex-col gap-3">
        <Button ref={cancelRef} variant="primary" size="lg" fullWidth onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} size="lg" fullWidth onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
