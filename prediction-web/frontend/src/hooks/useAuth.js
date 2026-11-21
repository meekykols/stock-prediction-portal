import { useSelector } from 'react-redux';

export function useAuth() {
  const { status, user, subscription } = useSelector((s) => s.auth);
  return {
    status,
    user,
    subscription,
    plan: subscription?.plan ?? null,
    isAuthenticated: status === 'authenticated',
    isResolving: status === 'idle' || status === 'loading',
  };
}
