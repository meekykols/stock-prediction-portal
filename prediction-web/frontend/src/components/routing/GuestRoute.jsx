import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageLoader from '../ui/PageLoader';

/**
 * Login/register: once signed in, send the user where they were heading.
 * This guard re-renders the moment the session lands, so it owns the redirect.
 */
export function postAuthDestination(location) {
  const from = location.state?.from;
  if (from?.pathname) return `${from.pathname}${from.search || ''}`;
  const plan = new URLSearchParams(location.search).get('plan');
  if (plan && /^[a-z0-9-]+$/.test(plan)) return `/app/billing?plan=${plan}`;
  return '/app';
}

export default function GuestRoute() {
  const { isAuthenticated, isResolving } = useAuth();
  const location = useLocation();
  if (isResolving) return <PageLoader />;
  if (isAuthenticated) return <Navigate to={postAuthDestination(location)} replace />;
  return <Outlet />;
}
