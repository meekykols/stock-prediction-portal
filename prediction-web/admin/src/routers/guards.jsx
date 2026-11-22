import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PageLoader from '../components/ui/PageLoader';
import Forbidden from '../components/ui/Forbidden';
import { ROUTES } from './routes';

export function RequireStaff() {
  const { isAuthenticated, isResolving } = useAuth();
  const location = useLocation();
  if (isResolving) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function GuestOnly() {
  const { isAuthenticated, isResolving } = useAuth();
  const location = useLocation();
  if (isResolving) return <PageLoader />;
  if (isAuthenticated) {
    const from = location.state?.from;
    return <Navigate to={from?.pathname ? `${from.pathname}${from.search || ''}` : '/'} replace />;
  }
  return <Outlet />;
}

export function RequirePermission({ permission, children }) {
  const { can } = useAuth();
  return can(permission) ? children : <Forbidden />;
}

/** Staff without dashboard access land on the first page they can open. */
export function HomeRedirect({ children }) {
  const { can } = useAuth();
  if (can(ROUTES[0].permission)) return children;
  const first = ROUTES.find((r) => r.label && r.path !== '/' && can(r.permission));
  return <Navigate to={first?.path || '/account'} replace />;
}
