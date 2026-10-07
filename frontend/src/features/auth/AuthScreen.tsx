import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useGoBack } from '../../app/useGoBack';
import { FocusScreen } from '../../components/ui/FocusScreen';
import { IconButton } from '../../components/ui/IconButton';
import { Mascot, type MascotExpression } from '../../components/ui/Mascot';
import { Wordmark } from '../../components/ui/Wordmark';
import { cx } from '../../lib/cx';
import { AUTH_COPY } from './copy';

export interface AuthScreenProps {
  /** Where "Zurück" leads when the screen was opened directly; without it there is no way back. */
  backTo?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A screen of the signed-out area: way back, the wordmark, one task and its button. */
export function AuthScreen({ backTo, footer, className, children }: AuthScreenProps) {
  return (
    <FocusScreen
      backdrop
      header={
        <>
          {backTo ? <BackButton fallback={backTo} /> : <HeaderSpacer />}
          <Wordmark size="sm" className="mx-auto" />
          <HeaderSpacer />
        </>
      }
      footer={footer}
      className={cx('gap-6 pb-6', className)}
    >
      {children}
    </FocusScreen>
  );
}

function BackButton({ fallback }: { fallback: string }) {
  const goBack = useGoBack(fallback);
  return (
    <IconButton icon={ArrowLeftIcon} label={AUTH_COPY.back} variant="ghost" onClick={goBack} />
  );
}

/** Keeps the wordmark centred against the back button. */
function HeaderSpacer() {
  return <span aria-hidden="true" className="size-12 shrink-0" />;
}

export interface AuthIntroProps {
  expression: MascotExpression;
  title: string;
  text?: ReactNode;
  /** Smaller mascot for screens with several fields. */
  compact?: boolean;
  /** Moves focus to the heading, so screen readers read a screen that replaced a form. */
  focusTitle?: boolean;
}

/** Mascot, heading and a short text at the top of an auth screen. */
export function AuthIntro({
  expression,
  title,
  text,
  compact = false,
  focusTitle = false,
}: AuthIntroProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus({ preventScroll: true });
  }, [focusTitle]);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Mascot expression={expression} size={compact ? 'lg' : 'xl'} />
      <h1
        ref={titleRef}
        tabIndex={focusTitle ? -1 : undefined}
        className="text-headline font-black focus:outline-none"
      >
        {title}
      </h1>
      {text && <p className="max-w-xs text-body text-fg-muted">{text}</p>}
    </div>
  );
}

export interface AuthMessageProps extends Omit<AuthIntroProps, 'compact' | 'focusTitle'> {
  backTo?: string;
  /** The way on, e.g. a button link to the sign-in. */
  action: ReactNode;
  children?: ReactNode;
}

/** A screen that only tells something, e.g. that a link expired, and offers one way on. */
export function AuthMessage({ backTo, action, children, ...intro }: AuthMessageProps) {
  return (
    <AuthScreen backTo={backTo} className="justify-center" footer={action}>
      <AuthIntro {...intro} focusTitle />
      {children}
    </AuthScreen>
  );
}
