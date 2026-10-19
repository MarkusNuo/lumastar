import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { AuroraBackdrop } from './AuroraBackdrop';

export interface FocusScreenProps {
  /** Top row, e.g. back button and progress bar. */
  header?: ReactNode;
  /** Main action pinned to the bottom; forms can render a {@link ScreenFooter} themselves. */
  footer?: ReactNode;
  /** Brand glows behind the content, for welcome-like moments. */
  backdrop?: boolean;
  className?: string;
  children: ReactNode;
}

/** Full-height screen without app navigation: one task, one big button. */
export function FocusScreen({
  header,
  footer,
  backdrop = false,
  className,
  children,
}: FocusScreenProps) {
  return (
    <div className="relative isolate mx-auto flex min-h-dvh max-w-app flex-col px-gutter pt-(--safe-top)">
      {backdrop && <AuroraBackdrop />}
      {header && <header className="flex h-16 shrink-0 items-center gap-3">{header}</header>}
      <main className={cx('flex flex-1 flex-col', className)}>{children}</main>
      {footer && <ScreenFooter>{footer}</ScreenFooter>}
    </div>
  );
}

/** Keeps the main action within thumb reach, also while the content scrolls underneath. */
export function ScreenFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-gutter mt-auto bg-bg px-gutter pt-4 pb-[calc(var(--safe-bottom)+1.5rem)]">
      {children}
    </div>
  );
}
