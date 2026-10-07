import { IMPRINT } from './imprint';
import { LegalPage } from './LegalPage';
import { PRIVACY_POLICY } from './privacyPolicy';

/** Route `/datenschutz`. */
export function PrivacyPage() {
  return <LegalPage document={PRIVACY_POLICY} />;
}

/** Route `/impressum`. */
export function ImprintPage() {
  return <LegalPage document={IMPRINT} />;
}
