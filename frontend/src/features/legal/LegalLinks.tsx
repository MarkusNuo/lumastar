import { TextLink } from '../../components/ui/TextLink';
import { cx } from '../../lib/cx';
import { LEGAL_COPY } from './copy';
import { LEGAL_ROUTES } from './legalRoutes';

/** "Datenschutz · Impressum" in small print, e.g. below the welcome buttons. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label={LEGAL_COPY.linksLabel} className={cx('text-caption', className)}>
      <ul className="flex items-center justify-center gap-2 text-fg-subtle">
        <li>
          <TextLink to={LEGAL_ROUTES.privacy} className="text-fg-muted">
            {LEGAL_COPY.privacy}
          </TextLink>
        </li>
        <li aria-hidden="true">·</li>
        <li>
          <TextLink to={LEGAL_ROUTES.imprint} className="text-fg-muted">
            {LEGAL_COPY.imprint}
          </TextLink>
        </li>
      </ul>
    </nav>
  );
}
