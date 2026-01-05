import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated?: boolean; // Allow override for development
}

// Development mode: Skip authentication check (set to false when backend is ready)
const SKIP_AUTH_CHECK = false; // Backend auth is ready, authentication enabled

export const ProtectedRoute = ({ children, isAuthenticated }: ProtectedRouteProps) => {
  const { isAuthenticated: authStatus } = useAuth();

  // Development mode: Allow all access
  if (SKIP_AUTH_CHECK) {
    return <>{children}</>;
  }

  // Production mode: Check authentication
  const authenticated = isAuthenticated !== undefined ? isAuthenticated : authStatus;

  if (!authenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
