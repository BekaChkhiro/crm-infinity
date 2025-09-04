import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationCenter } from '@/shared/components/common/NotificationCenter';
import { ThemeToggle } from '@/shared/components/common/ThemeToggle';
import { AdminNavigation } from './AdminNavigation';

export function AdminSidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">ადმინ პანელი</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationCenter />
        </div>
      </div>

      {/* Admin Navigation */}
      <div className="flex-1 py-4 overflow-y-auto">
        <AdminNavigation />
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