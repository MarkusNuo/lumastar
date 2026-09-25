import { XIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { cx } from '../../lib/cx';
import { springs } from '../../styles/motion';
import { UI_COPY } from './copy';
import { IconButton } from './IconButton';

export interface SheetProps {
  open: boolean;
  /** Escape and a tap on the scrim close the sheet. */
  onClose: () => void;
  /** `alertdialog` for confirmations that interrupt the flow. */
  role?: 'dialog' | 'alertdialog';
  'aria-labelledby': string;
  'aria-describedby'?: string;
  /** Focused on open; defaults to the panel itself. Focus returns to the trigger on close. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

/** Modal bottom sheet over a scrim: keeps focus inside and slides in with a spring. */
export function Sheet({ open, ...panelProps }: SheetProps) {
  return <AnimatePresence>{open && <SheetPanel key="sheet" {...panelProps} />}</AnimatePresence>;
}

function SheetPanel({
  onClose,
  role = 'dialog',
  initialFocusRef,
  className,
  children,
  ...labels
}: Omit<SheetProps, 'open'>) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement;
    (initialFocusRef?.current ?? panelRef.current)?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, [initialFocusRef]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
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
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role={role}
        aria-modal="true"
        {...labels}
        tabIndex={-1}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springs.sheet}
        onKeyDown={handleKeyDown}
        className={cx(
          'absolute inset-x-0 bottom-0 mx-auto max-w-app rounded-t-sheet bg-surface px-gutter pt-6 pb-[calc(var(--safe-bottom)+1.25rem)] shadow-sheet focus:outline-none',
          className,
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}

export interface SheetHeaderProps {
  /** Referenced by the sheet's `aria-labelledby`. */
  titleId: string;
  title: string;
  onClose: () => void;
}

/** Title row with a close button, for sheets that are not confirmations. */
export function SheetHeader({ titleId, title, onClose }: SheetHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={titleId} className="min-w-0 text-title font-black">
        {title}
      </h2>
      <IconButton
        icon={XIcon}
        label={UI_COPY.sheet.close}
        variant="ghost"
        className="-mr-2"
        onClick={onClose}
      />
    </div>
  );
}

const FOCUSABLE = [
  'button:not(:disabled)',
  'a[href]',
  'input:not(:disabled)',
  'textarea:not(:disabled)',
  'select:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Keeps Tab and Shift+Tab inside the sheet. */
function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE);
  const first = focusable?.[0];
  const last = focusable?.[focusable.length - 1];
  if (!first || !last) return;
  // The panel itself holds focus when no control asked for it.
  const onPanel = document.activeElement === container;
  if (event.shiftKey && (document.activeElement === first || onPanel)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || onPanel)) {
    event.preventDefault();
    first.focus();
  }
}
