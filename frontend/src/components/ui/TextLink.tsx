import { Link, type LinkProps } from 'react-router';
import { cx } from '../../lib/cx';

/** Look of a link inside running text or below a form, e.g. "Passwort vergessen?". */
export const textLinkClass =
  'rounded-xs font-extrabold text-primary-soft underline decoration-2 underline-offset-4 transition-colors duration-(--duration-fast) hover:text-fg';

export function TextLink({ className, ...rest }: LinkProps) {
  return <Link {...rest} className={cx(textLinkClass, className)} />;
}
