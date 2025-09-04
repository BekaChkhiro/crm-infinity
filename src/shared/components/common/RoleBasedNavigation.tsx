import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/core/config/client';
import { cn } from '@/shared/utils/utils';
import { Badge } from '@/shared/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/components/ui/collapsible';
import { 
  Home,
  FolderOpen,
  User,
  Settings,
  Shield,
  Users,
  Database,
  Activity,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface UserProject {
  id: string;
  name: string;
  status: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  hasSubmenu?: boolean;
}

const userNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Tasks', href: '/tasks', icon: FileText },
  { name: 'Projects', href: '/projects', icon: FolderOpen, hasSubmenu: true },
  { name: 'Profile', href: '/profile/edit', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
] as const;

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin/dashboard', icon: Shield },
  { name: 'User Management', href: '/admin/users', icon: Users },
  { name: 'Project Management', href: '/admin/projects', icon: Database },
  { name: 'System Activity', href: '/admin/activity', icon: Activity },
  { name: 'All Tasks', href: '/admin/tasks', icon: FileText },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

interface RoleBasedNavigationProps {
  className?: string;
  onItemClick?: () => void;
}

export function RoleBasedNavigation({ className, onItemClick }: RoleBasedNavigationProps) {
  const location = useLocation();
  const { profile } = useProfile();
  const { user } = useAuth();
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  
  // Determine which navigation to show based on user role
  const navigation = profile?.role === 'admin' ? adminNavigation : userNavigation;
  const roleLabel = profile?.role === 'admin' ? 'Administrator' : 'User';
  const roleColor = profile?.role === 'admin' ? 'destructive' : 'secondary';

  // Fetch user's projects
  useEffect(() => {
    if (user && profile?.role !== 'admin') {
      fetchUserProjects();
    }
  }, [user, profile?.role]);

  // Auto-expand projects menu when on projects or project pages
  useEffect(() => {
    if (location.pathname === '/projects' || location.pathname.startsWith('/project/')) {
      setProjectsExpanded(true);
    }
  }, [location.pathname]);

  const fetchUserProjects = async () => {
    try {
      // Fetch projects where the user is a member
      const { data: memberProjects, error: memberProjectsError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user?.id);
      
      if (memberProjectsError) throw memberProjectsError;
      
      if (!memberProjects || memberProjects.length === 0) {
        setUserProjects([]);
        return;
      }
      
      // Extract project IDs
      const projectIds = memberProjects.map(mp => mp.project_id);
      
      // Fetch full project details
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status')
        .in('id', projectIds)
        .order('name');
      
      if (projectsError) throw projectsError;

      setUserProjects(projects || []);
    } catch (error) {
      console.error('Error fetching user projects:', error);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Role Badge */}
      <div className="px-3">
        <Badge variant={roleColor} className="w-full justify-center py-2">
          {profile?.role === 'admin' ? (
            <Shield className="w-3 h-3 mr-1" />
          ) : (
            <User className="w-3 h-3 mr-1" />
          )}
          {roleLabel}
        </Badge>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 px-3">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/admin' && location.pathname === '/admin' && profile?.role === 'admin');
          
          // Special handling for Projects with submenu
          if (item.hasSubmenu && item.name === 'Projects' && profile?.role !== 'admin') {
            // Projects main button should not be active when on /projects or individual project pages
            const isProjectsMainActive = false;
            
            return (
              <div key={item.name}>
                <Collapsible open={projectsExpanded} onOpenChange={setProjectsExpanded}>
                  <CollapsibleTrigger asChild>
                    <button className={cn(
                      'group flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors text-left',
                      isProjectsMainActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}>
                      <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                      {item.name}
                      {projectsExpanded ? (
                        <ChevronDown className="ml-auto h-4 w-4" />
                      ) : (
                        <ChevronRight className="ml-auto h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    <Link
                      to={item.href}
                      onClick={onItemClick}
                      className={cn(
                        'group flex items-center px-6 py-2 text-sm font-medium rounded-md transition-colors',
                        location.pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                      style={{ marginLeft: '20px' }}
                    >
                      All Projects
                    </Link>
                    {userProjects.map((project) => (
                      <Link
                        key={project.id}
                        to={`/project/${project.id}`}
                        onClick={onItemClick}
                        className={cn(
                          'group flex items-center px-6 py-2 text-sm font-medium rounded-md transition-colors',
                          location.pathname === `/project/${project.id}`
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        )}
                        style={{ marginLeft: '20px' }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{project.name}</span>
                          <Badge variant="outline" className="text-xs ml-2">
                            {project.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onItemClick}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Quick Stats for Admin */}
      {profile?.role === 'admin' && (
        <div className="px-3 pt-4 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-2">Quick Stats</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">System Status</span>
              <Badge variant="outline" className="text-xs">
                Online
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}