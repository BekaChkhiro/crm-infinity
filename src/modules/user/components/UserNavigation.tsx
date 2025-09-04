import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  FileText,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface UserProject {
  id: string;
  name: string;
  status: string;
}

const userNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Tasks', href: '/tasks', icon: FileText },
  { name: 'Projects', href: '/projects', icon: FolderOpen, hasSubmenu: true },
  { name: 'Profile', href: '/profile/edit', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
] as const;

interface UserNavigationProps {
  className?: string;
  onItemClick?: () => void;
}

export function UserNavigation({ className, onItemClick }: UserNavigationProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [projectsExpanded, setProjectsExpanded] = useState(false);

  // Fetch user's projects
  useEffect(() => {
    if (user) {
      fetchUserProjects();
    }
  }, [user]);

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
      
      // Fetch the actual project details
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status')
        .in('id', projectIds)
        .order('name');
      
      if (projectsError) throw projectsError;
      
      setUserProjects(projects || []);
    } catch (error: any) {
      console.error('Error fetching user projects:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <nav className={cn("space-y-2", className)}>
      {/* Role Badge */}
      <div className="px-3 mb-4">
        <Badge variant="secondary" className="text-xs">
          User
        </Badge>
      </div>

      {/* Navigation Links */}
      {userNavigation.map((item) => (
        <div key={item.name}>
          {item.hasSubmenu ? (
            <Collapsible open={projectsExpanded} onOpenChange={setProjectsExpanded}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground group",
                    isActive(item.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {projectsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-6 mt-1 space-y-1">
                <Link
                  to="/projects"
                  className={cn(
                    "block px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                    location.pathname === "/projects"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                  onClick={onItemClick}
                >
                  All Projects
                </Link>
                {userProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/project/${project.id}`}
                    className={cn(
                      "block px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                      location.pathname === `/project/${project.id}`
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                    onClick={onItemClick}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{project.name}</span>
                      <Badge 
                        variant={project.status === 'active' ? 'default' : 'secondary'} 
                        className="ml-2 text-xs"
                      >
                        {project.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ) : (
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
          )}
        </div>
      ))}
    </nav>
  );
}