import { Navigate, Outlet } from 'react-router';
import { ConnectionErrorScreen } from '../../app/ConnectionErrorScreen';
import { SplashScreen } from '../../app/SplashScreen';
import { useAuthStatus, useRefreshAuthOnUnauthorized } from './authHooks';
import { authRedirect, type AuthArea } from './authRoutes';

/** Renders its child routes only in the matching auth state and redirects otherwise. */
export function AuthGuard({ area }: { area: AuthArea }) {
  const status = useAuthStatus();
  useRefreshAuthOnUnauthorized();

  if (!status.data) {
    return status.isError ? (
      <ConnectionErrorScreen onRetry={() => void status.refetch()} retrying={status.isFetching} />
    ) : (
      <SplashScreen />
    );
  }

  const redirect = authRedirect(status.data, area);
  return redirect ? <Navigate to={redirect} replace /> : <Outlet />;
}
