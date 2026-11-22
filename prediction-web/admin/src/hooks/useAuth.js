import { useSelector } from 'react-redux';
import { can } from '../routers/permissions';

export function useAuth() {
  const { status, user } = useSelector((s) => s.auth);
  return {
    status,
    user,
    isAuthenticated: status === 'authenticated',
    isResolving: status === 'idle' || status === 'loading',
    can: (permission) => can(user, permission),
  };
}
