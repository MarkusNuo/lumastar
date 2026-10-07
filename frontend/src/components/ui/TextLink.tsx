import { Link, type LinkProps } from 'react-router';
import { cx } from '../../lib/cx';

export interface TextLinkProps extends LinkProps {
  /** Muted, for a side way that should not compete with the main one. */
  subtle?: boolean;
}

/** A link inside running text or below a form, e.g. "Passwort vergessen?". */
export function TextLink({ subtle = false, className, ...rest }: TextLinkProps) {
  return (
    <Link
      {...rest}
      className={cx(
        'rounded-xs font-extrabold underline decoration-2 underline-offset-4 transition-colors duration-(--duration-fast) hover:text-fg',
        subtle ? 'text-fg-muted decoration-fg-subtle' : 'text-primary-soft',
        className,
      )}
    />
  );
}
