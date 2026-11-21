import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageLoader from '../ui/PageLoader';

/** Login/register: bounce signed-in users to the dashboard. */
export default function GuestRoute() {
  const { isAuthenticated, isResolving } = useAuth();
  if (isResolving) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <Outlet />;
}
