import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useGoBack } from '../../app/useGoBack';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { IconButton } from '../../components/ui/IconButton';
import { LoadFailed, LoadingBlock } from '../../components/ui/LoadState';
import { Mascot, type MascotExpression } from '../../components/ui/Mascot';
import { cx } from '../../lib/cx';
import { ACCOUNT_ROUTES } from './accountRoutes';
import { ACCOUNT_COPY } from './copy';

export interface AccountScreenProps {
  title: string;
  footer?: ReactNode;
  /** The back button is disabled while a change is being saved. */
  busy?: boolean;
  className?: string;
  children: ReactNode;
}

/** One account setting per screen, with the way back to the profile. */
export function AccountScreen({
  title,
  footer,
  busy = false,
  className,
  children,
}: AccountScreenProps) {
  const goBack = useGoBack(ACCOUNT_ROUTES.profile);

  return (
    <FocusScreen
      header={
        <>
          <IconButton
            icon={ArrowLeftIcon}
            label={ACCOUNT_COPY.back}
            variant="ghost"
            disabled={busy}
            onClick={goBack}
          />
          <h1 className="min-w-0 text-title font-black">{title}</h1>
        </>
      }
      footer={footer}
      className={cx('gap-6 pt-2 pb-6', className)}
    >
      {children}
    </FocusScreen>
  );
}

export interface AccountScreenLoadingProps {
  title: string;
  /** The query the screen waits for. */
  query: { isError: boolean; isFetching: boolean; refetch: () => Promise<unknown> };
}

/** The account screen while its data loads, or a retry when loading failed. */
export function AccountScreenLoading({ title, query }: AccountScreenLoadingProps) {
  return (
    <AccountScreen title={title}>
      {query.isError ? (
        <LoadFailed
          message={ACCOUNT_COPY.section.loadFailed}
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <LoadingBlock label={ACCOUNT_COPY.section.loading} className="h-32" />
      )}
    </AccountScreen>
  );
}

export interface AccountMessageProps {
  title: string;
  expression: MascotExpression;
  heading: string;
  text: string;
  /** The way on, e.g. back to the profile. */
  action: ReactNode;
}

/**
 * The account screen after a change that still needs a step, e.g. opening a link. It replaces the
 * form, so focus moves to its heading and screen readers read the outcome.
 */
export function AccountMessage({ title, expression, heading, text, action }: AccountMessageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  return (
    <AccountScreen
      title={title}
      footer={action}
      className="items-center justify-center text-center"
    >
      <Mascot expression={expression} size="xl" />
      <div role="status" className="flex flex-col gap-2">
        <h2 ref={headingRef} tabIndex={-1} className="text-headline font-black focus:outline-none">
          {heading}
        </h2>
        <p className="max-w-xs text-body wrap-break-word text-fg-muted">{text}</p>
      </div>
    </AccountScreen>
  );
}
