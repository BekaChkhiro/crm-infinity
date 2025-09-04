import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  console.log('AdminRoute - User:', user);
  console.log('AdminRoute - Profile:', profile);
  console.log('AdminRoute - Auth Loading:', loading);
  console.log('AdminRoute - Profile Loading:', profileLoading);

  if (loading || profileLoading || (user && !profile)) {
    console.log('AdminRoute - Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log('AdminRoute - No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== 'admin') {
    console.log('AdminRoute - User is not admin, role:', profile?.role);
    return <Navigate to="/dashboard" replace />;
  }

  console.log('AdminRoute - User is admin, rendering children');
  return <>{children}</>;
}