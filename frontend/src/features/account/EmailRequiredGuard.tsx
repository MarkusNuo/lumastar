import { Navigate, Outlet, useLocation } from 'react-router';
import { ConnectionErrorScreen } from '../../app/ConnectionErrorScreen';
import { SplashScreen } from '../../app/SplashScreen';
import { useMe } from '../auth/authHooks';
import { emailStepRedirect } from './accountRoutes';

/**
 * The account of the former single-user version needs an e-mail address before anything else;
 * every other account passes straight through.
 */
export function EmailRequiredGuard() {
  const me = useMe();
  const { pathname } = useLocation();

  if (!me.data) {
    return me.isError ? (
      <ConnectionErrorScreen onRetry={() => void me.refetch()} retrying={me.isFetching} />
    ) : (
      <SplashScreen />
    );
  }

  const redirect = emailStepRedirect(me.data.emailRequired, pathname);
  return redirect ? <Navigate to={redirect} replace /> : <Outlet />;
}
