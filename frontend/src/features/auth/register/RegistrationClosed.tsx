import { ButtonLink } from '../../../components/ui/ButtonLink';
import { AUTH_ROUTES } from '../authRoutes';
import { AuthMessage } from '../AuthScreen';
import { AUTH_COPY } from '../copy';

const copy = AUTH_COPY.register.closed;

/** Registration is switched off on this installation: say so kindly and offer the sign-in. */
export function RegistrationClosed() {
  return (
    <AuthMessage
      backTo={AUTH_ROUTES.welcome}
      expression="encouraging"
      title={copy.title}
      text={copy.text}
      action={
        <ButtonLink to={AUTH_ROUTES.login} size="lg" fullWidth>
          {copy.login}
        </ButtonLink>
      }
    />
  );
}
