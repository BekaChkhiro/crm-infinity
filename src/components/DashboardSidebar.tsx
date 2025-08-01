import React from 'react';
import { FolderOpen, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RoleBasedNavigation } from '@/components/RoleBasedNavigation';

export function DashboardSidebar() {
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const handleSignOut = async () => {
    await signOut();
  };

  const dashboardTitle = profile?.role === 'admin' ? 'ადმინ პანელი' : 'INFINITY';

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b">
        <div className="flex items-center space-x-2">
          <FolderOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">{dashboardTitle}</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationCenter />
        </div>
      </div>

      {/* Role-based Navigation */}
      <div className="flex-1 py-4 overflow-y-auto">
        <RoleBasedNavigation />
      </div>

      {/* Footer */}
      <div className="border-t p-4 space-y-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSignOut}
          className="w-full justify-start"
        >
          <LogOut className="mr-3 h-4 w-4" />
          გასვლა
        </Button>
      </div>
    </div>
  );
}