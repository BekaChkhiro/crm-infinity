import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/utils/utils';
import { Badge } from '@/shared/components/ui/badge';
import { 
  Shield,
  Users,
  Database,
  Activity,
  FileText,
  Settings,
  BarChart3
} from 'lucide-react';

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin/dashboard', icon: Shield },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Project Management', href: '/admin/projects', icon: Database },
  { name: 'System Activity', href: '/admin/activity', icon: Activity },
  { name: 'Time Analytics', href: '/admin/time-analytics', icon: BarChart3 },
  { name: 'All Tasks', href: '/admin/tasks', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

interface AdminNavigationProps {
  className?: string;
  onItemClick?: () => void;
}

export function AdminNavigation({ className, onItemClick }: AdminNavigationProps) {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return location.pathname === href || location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className={cn("space-y-2", className)}>
      {/* Role Badge */}
      <div className="px-3 mb-4">
        <Badge variant="destructive" className="text-xs">
          Administrator
        </Badge>
      </div>

      {/* Navigation Links */}
      {adminNavigation.map((item) => (
        <Link
          key={item.name}
          to={item.href}
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
            isActive(item.href)
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          )}
          onClick={onItemClick}
        >
          <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
          {item.name}
        </Link>
      ))}
    </nav>
  );
}