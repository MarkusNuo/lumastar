import { CheckIcon, InfoIcon, XIcon, type Icon } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { cx } from '../../lib/cx';
import { springs } from '../../styles/motion';
import { UI_COPY } from './copy';
import { IconButton } from './IconButton';
import { useToastStore, type ToastTone } from './toastStore';

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  onDismiss?: () => void;
  className?: string;
}

const toneIcon: Record<ToastTone, Icon> = { success: CheckIcon, primary: InfoIcon };

/** Short confirmation card; usually shown through `showToast` rather than rendered directly. */
export function Toast({ message, tone = 'success', onDismiss, className }: ToastProps) {
  const ToneIcon = toneIcon[tone];

  return (
    <div
      data-tone={tone}
      className={cx(
        'flex items-center gap-3 rounded-card-sm tone-outline py-2 pr-2 pl-3 shadow-float',
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full tone-solid">
        <ToneIcon aria-hidden="true" size={20} weight="bold" />
      </span>
      <p className="min-w-0 flex-1 py-1 text-label font-extrabold text-fg">{message}</p>
      {onDismiss && (
        <IconButton
          icon={XIcon}
          label={UI_COPY.toast.dismiss}
          variant="ghost"
          size="sm"
          onClick={onDismiss}
        />
      )}
    </div>
  );
}

/**
 * Renders the current toast at the top of the screen, clear of bottom sheets and the navigation.
 * The status region stays mounted so screen readers announce every new message.
 */
export function Toaster() {
  const toast = useToastStore((state) => state.current);
  const dismiss = useToastStore((state) => state.dismiss);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.95 };

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-(--z-toast) mx-auto grid max-w-app px-gutter pt-[calc(var(--safe-top)+0.75rem)]"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={hidden}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={hidden}
            transition={springs.bouncy}
            // One grid cell for all: a replaced toast fades out in place instead of pushing down.
            className="pointer-events-auto col-start-1 row-start-1"
          >
            <Toast message={toast.message} tone={toast.tone} onDismiss={() => dismiss(toast.id)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
