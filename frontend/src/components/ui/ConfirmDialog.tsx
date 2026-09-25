import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { springs } from '../../styles/motion';
import { Button } from './Button';
import type { ButtonVariant } from './buttonStyles';
import { Mascot, type MascotExpression } from './Mascot';

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
export function ConfirmDialog({ open, ...panelProps }: ConfirmDialogProps) {
  return (
    <AnimatePresence>{open && <ConfirmPanel key="confirm" {...panelProps} />}</AnimatePresence>
  );
}

function ConfirmPanel({
  title,
  text,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'danger',
  mascot = 'sad',
  onCancel,
  onConfirm,
}: Omit<ConfirmDialogProps, 'open'>) {
  const titleId = useId();
  const textId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    cancelRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
    } else if (event.key === 'Tab') {
      trapFocus(event, panelRef.current);
    }
  };

  return (
    <div className="fixed inset-0 z-(--z-sheet)">
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-scrim"
        onClick={onCancel}
      />
      <motion.div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={text ? textId : undefined}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springs.sheet}
        onKeyDown={handleKeyDown}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-w-app flex-col items-center gap-3 rounded-t-sheet bg-surface px-gutter pt-6 pb-[calc(var(--safe-bottom)+1.25rem)] text-center shadow-sheet"
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
      </motion.div>
    </div>
  );
}

/** Keeps Tab and Shift+Tab inside the dialog. */
function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  const focusable = container?.querySelectorAll<HTMLElement>('button:not(:disabled)');
  const first = focusable?.[0];
  const last = focusable?.[focusable.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
