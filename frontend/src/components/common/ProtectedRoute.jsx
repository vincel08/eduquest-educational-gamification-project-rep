import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ roles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles.length && !roles.includes(user.role)) {
    const fallback = {
      student: '/student/dashboard',
      teacher: '/teacher/dashboard',
      administrator: '/admin/dashboard',
    };
    return <Navigate to={fallback[user.role] || '/login'} replace />;
  }

  return <Outlet />;
}
