import { useMe } from '../../auth/authHooks';
import { useVerificationBannerDismissed } from './bannerDismissed';

/** The unconfirmed address while the banner asks for its confirmation, else undefined. */
export function useVerificationBannerEmail(): string | undefined {
  const me = useMe();
  const dismissed = useVerificationBannerDismissed((state) => state.dismissed);
  const email = me.data?.email;
  return email && !me.data?.emailVerified && !dismissed ? email : undefined;
}
