import { Navigate, Outlet, useLocation } from 'react-router';
import { ConnectionErrorScreen } from '../../app/ConnectionErrorScreen';
import { SplashScreen } from '../../app/SplashScreen';
import { useMe } from '../auth/authHooks';
import { onboardingRedirect } from './onboardingRoutes';

/** Keeps a signed-in learner on the open onboarding step: questions, placement test, then the app. */
export function OnboardingGuard() {
  const me = useMe();
  const { pathname } = useLocation();

  if (!me.data) {
    return me.isError ? (
      <ConnectionErrorScreen onRetry={() => void me.refetch()} retrying={me.isFetching} />
    ) : (
      <SplashScreen />
    );
  }

  const redirect = onboardingRedirect(me.data.onboardingStep, pathname);
  return redirect ? <Navigate to={redirect} replace /> : <Outlet />;
}
