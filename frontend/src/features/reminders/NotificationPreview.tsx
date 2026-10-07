import { motion } from 'motion/react';
import { cx } from '../../lib/cx';
import { springs } from '../../styles/motion';
import { REMINDER_COPY } from './copy';

const copy = REMINDER_COPY.preview;

/** The app icon the system shows next to a reminder (public/icons, npm run gen:icons). */
const APP_ICON = '/icons/icon-192.png';

/**
 * A reminder as the system shows it: app icon and name, title, text and the two buttons. It drops
 * in like a real notification, so the learner sees what they are switching on.
 */
export function NotificationPreview({ className }: { className?: string }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springs.bouncy}
      aria-label={copy.label}
      className={cx(
        'flex flex-col gap-2 rounded-card-lg border-2 border-border-strong bg-surface-raised p-3 shadow-float',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-caption font-bold text-fg-muted">
        <img src={APP_ICON} alt="" className="size-5 rounded-xs" />
        <span className="text-fg">{copy.app}</span>
        <span aria-hidden="true">·</span>
        <span>{copy.when}</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body font-black text-fg">{copy.title}</p>
          <p className="text-label font-bold text-fg-muted">{copy.body}</p>
        </div>
        <img src={APP_ICON} alt="" className="size-11 shrink-0 rounded-sm" />
      </div>
      <div className="flex gap-5 border-t-2 border-border pt-2 text-label font-extrabold text-secondary">
        {copy.actions.map((action) => (
          <span key={action}>{action}</span>
        ))}
      </div>
    </motion.figure>
  );
}
