import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * Wrap any route that requires authentication.
 * While auth state is loading, shows a spinner.
 * If the user is not authenticated, triggers a redirect to the landing page.
 * If authenticated, renders the children.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
