import React from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { AdminLayout } from '@/modules/admin/layouts/AdminLayout';
import { DashboardLayout } from '@/modules/user/layouts/DashboardLayout';

interface AdaptiveLayoutProps {
  children: React.ReactNode;
}

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
  // Use DashboardLayout for all users since RoleBasedNavigation handles role-specific menus
  return <DashboardLayout>{children}</DashboardLayout>;
}