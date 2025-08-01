import React from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import AdminDashboard from '@/pages/AdminDashboard';
import { UserDashboard } from '@/pages/user-dashboard/UserDashboard';
import Dashboard from '@/pages/Dashboard';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function RoleDashboard() {
  const { profile, loading } = useProfile();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Route based on user role
  switch (profile?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'user':
      return <UserDashboard />;
    default:
      // Fallback to original dashboard for users without specific roles
      return <Dashboard />;
  }
}