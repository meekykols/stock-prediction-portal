import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PageLoader from '../ui/PageLoader';

export default function ProtectedRoute() {
  const { isAuthenticated, isResolving } = useAuth();
  const location = useLocation();
  if (isResolving) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
