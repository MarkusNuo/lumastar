import { ButtonLink } from '../../../components/ui/ButtonLink';
import { FocusScreen } from '../../../components/ui/FocusScreen';
import { Mascot } from '../../../components/ui/Mascot';
import { Wordmark } from '../../../components/ui/Wordmark';
import { LegalLinks } from '../../legal/LegalLinks';
import { useAuthStatus } from '../authHooks';
import { AUTH_ROUTES } from '../authRoutes';
import { AUTH_COPY } from '../copy';

const copy = AUTH_COPY.welcome;

/** Route `/willkommen`: where everyone without a session starts. */
export function WelcomePage() {
  const status = useAuthStatus();
  const closed = status.data?.registrationMode === 'closed';

  return (
    <FocusScreen
      backdrop
      className="items-center justify-center gap-4 pb-6 text-center"
      footer={
        <div className="flex flex-col gap-3">
          {!closed && (
            <ButtonLink to={AUTH_ROUTES.register} size="lg" fullWidth>
              {copy.register}
            </ButtonLink>
          )}
          <ButtonLink
            to={AUTH_ROUTES.login}
            variant={closed ? 'primary' : 'neutral'}
            size="lg"
            fullWidth
          >
            {copy.login}
          </ButtonLink>
          {closed && (
            <p className="text-center text-caption font-bold text-fg-subtle">{copy.closed}</p>
          )}
          <LegalLinks className="pt-1" />
        </div>
      }
    >
      <Mascot expression="celebrating" size="xl" />
      <Wordmark size="lg" />
      <h1 className="text-headline font-black">{copy.title}</h1>
      <p className="max-w-xs text-lead font-bold text-fg-muted">{copy.text}</p>
    </FocusScreen>
  );
}
