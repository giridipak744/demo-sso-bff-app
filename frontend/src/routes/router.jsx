import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import LandingPage from '../pages/LandingPage';
import ProfilePage from '../pages/ProfilePage';
import SecurityPage from '../pages/SecurityPage';
import SessionsPage from '../pages/SessionsPage';
import ActivityPage from '../pages/ActivityPage';
import LoggedOutPage from '../pages/LoggedOutPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/logged-out',
    element: <LoggedOutPage />,
  },
  {
    // All routes inside AppLayout require authentication via ProtectedRoute
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <ProfilePage />, // redirect old dashboard to profile
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '/security',
        element: <SecurityPage />,
      },
      {
        path: '/sessions',
        element: <SessionsPage />,
      },
      {
        path: '/activity',
        element: <ActivityPage />,
      },
    ],
  },
]);

export default router;
