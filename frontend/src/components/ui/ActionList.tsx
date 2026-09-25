import { CaretRightIcon, type Icon } from '@phosphor-icons/react';
import { useId, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { LoadingDots } from './LoadingDots';
import type { Tone } from './tones';

export interface ActionListProps {
  title: string;
  /** `ActionRow`s. */
  children: ReactNode;
  className?: string;
}

/** Titled group of actions and settings in one card, e.g. on the profile tab. */
export function ActionList({ title, children, className }: ActionListProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className={cx('flex flex-col gap-2', className)}>
      <h2
        id={titleId}
        className="px-1 text-caption font-extrabold tracking-wider text-fg-muted uppercase"
      >
        {title}
      </h2>
      <ul className="divide-y-2 divide-border overflow-hidden rounded-card border-2 border-border bg-surface">
        {children}
      </ul>
    </section>
  );
}

export interface ActionRowProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'children' | 'aria-labelledby' | 'aria-describedby'
> {
  icon: Icon;
  /** Colour of the icon tile. */
  tone?: Tone;
  label: string;
  description?: string;
  /** Shows animated dots instead of the caret and ignores clicks. */
  loading?: boolean;
}

/** One tappable row of an `ActionList`: coloured icon tile, label, short description. */
export function ActionRow({
  icon: RowIcon,
  tone = 'primary',
  label,
  description,
  loading = false,
  disabled = false,
  type = 'button',
  className,
  onClick,
  ...rest
}: ActionRowProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) return;
    onClick?.(event);
  };

  return (
    <li>
      <button
        {...rest}
        type={type}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        aria-disabled={loading || undefined}
        aria-busy={loading || undefined}
        onClick={handleClick}
        className={cx(
          'flex min-h-18 w-full cursor-pointer items-center gap-4 px-4 py-3 text-left transition-colors duration-(--duration-fast) select-none focus-visible:-outline-offset-4 active:bg-surface-raised hover:enabled:bg-surface-raised/60 disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress',
          className,
        )}
      >
        <span
          aria-hidden="true"
          data-tone={disabled ? 'locked' : tone}
          className="grid size-11 shrink-0 place-items-center rounded-button tone-solid edge-3d"
        >
          <RowIcon size={24} weight="bold" />
        </span>
        <span className="min-w-0 flex-1">
          <span id={labelId} className="block text-body font-extrabold text-fg">
            {label}
          </span>
          {description && (
            <span id={descriptionId} className="block text-caption font-bold text-fg-muted">
              {description}
            </span>
          )}
        </span>
        {loading ? (
          <LoadingDots className="shrink-0 text-primary-soft" />
        ) : (
          <CaretRightIcon
            aria-hidden="true"
            size={20}
            weight="bold"
            className="shrink-0 text-fg-subtle"
          />
        )}
      </button>
    </li>
  );
}
