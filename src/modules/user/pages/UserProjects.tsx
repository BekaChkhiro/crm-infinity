import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Search,
  Filter,
  FolderOpen,
  ListFilter,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  end_date: string | null;
  task_count?: number;
  completed_tasks?: number;
  completion_percentage?: number;
}

interface ProjectFilters {
  search: string;
  status: string;
  category: string;
}

export default function UserProjects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    status: 'all',
    category: 'all'
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user) {
      fetchUserProjects();
    }
  }, [user]);

  const fetchUserProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch projects where the user is a member
      const { data: memberProjects, error: memberProjectsError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user?.id);
      
      if (memberProjectsError) throw memberProjectsError;
      
      if (!memberProjects || memberProjects.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }
      
      // Extract project IDs
      const projectIds = memberProjects.map(mp => mp.project_id);
      
      // Fetch full project details
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);
      
      if (projectsError) throw projectsError;

      // Fetch task stats for each project
      const projectsWithStats = await Promise.all((projectsData || []).map(async (project) => {
        // Get tasks for the project
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('status')
          .eq('project_id', project.id);
        
        if (tasksError) {
          console.error(`Error fetching tasks for project ${project.id}:`, tasksError);
          return {
            ...project,
            task_count: 0,
            completed_tasks: 0,
            completion_percentage: 0
          };
        }
        
        const taskCount = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
        const completionPercentage = taskCount > 0 ? (completedTasks / taskCount) * 100 : 0;
        
        return {
          ...project,
          task_count: taskCount,
          completed_tasks: completedTasks,
          completion_percentage: completionPercentage
        };
      }));
      
      setProjects(projectsWithStats);
      
      // Extract unique categories for filters
      const uniqueCategories = Array.from(
        new Set(projectsData?.map(p => p.category).filter(Boolean))
      );
      setCategories(uniqueCategories as string[]);

    } catch (error) {
      console.error('Error fetching user projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = !filters.search || 
      project.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(filters.search.toLowerCase()));
    
    const matchesStatus = filters.status === 'all' || project.status === filters.status;
    const matchesCategory = filters.category === 'all' || project.category === filters.category;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleFilterChange = (key: keyof ProjectFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'inactive': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <Tabs defaultValue="grid" value={activeTab} onValueChange={(v) => setActiveTab(v as 'grid' | 'list')}>
                <TabsList>
                  <TabsTrigger value="grid">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">Cards</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <div className="flex items-center gap-2">
                      <ListFilter className="h-4 w-4" />
                      <span className="hidden sm:inline">List</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search projects..."
                      className="pl-10"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className="bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="all">Status: All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                    
                    <select 
                      className="bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                    >
                      <option value="all">Category: All</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Views */}
            <Tabs defaultValue="grid" value={activeTab} onValueChange={(v) => setActiveTab(v as 'grid' | 'list')}>

              {filteredProjects.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {projects.length === 0 ? (
                      <div>
                        <p className="text-lg font-medium">No projects found</p>
                        <p className="text-muted-foreground">You are not added to any projects</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium">No projects found</p>
                        <p className="text-muted-foreground">Try changing the filter parameters</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <TabsContent value="grid">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredProjects.map((project) => (
                        <Link key={project.id} to={`/project/${project.id}`}>
                          <Card className="h-full hover:shadow-md transition-shadow duration-200">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-xl">{project.name}</CardTitle>
                                <Badge className={getStatusColor(project.status)}>
                                  {project.status || 'unknown'}
                                </Badge>
                              </div>
                              <CardDescription className="line-clamp-2">
                                {project.description || 'No description'}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>Progress</span>
                                    <span>{project.completed_tasks}/{project.task_count} tasks</span>
                                  </div>
                                  <Progress value={project.completion_percentage} />
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                  {project.category && (
                                    <div className="flex items-center gap-1">
                                      <FolderOpen className="h-3.5 w-3.5" />
                                      <span>{project.category}</span>
                                    </div>
                                  )}
                                  {project.start_date && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>Started: {format(new Date(project.start_date), 'dd/MM/yyyy')}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Updated: {format(new Date(project.updated_at), 'dd/MM/yyyy')}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="list">
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left p-3">Project</th>
                              <th className="text-left p-3">Category</th>
                              <th className="text-left p-3">Status</th>
                              <th className="text-left p-3">Tasks</th>
                              <th className="text-left p-3">Last Updated</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {filteredProjects.map((project) => (
                              <tr key={project.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
                                <td className="p-3">
                                  <div className="font-medium">
                                    {project.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground line-clamp-1">
                                    {project.description || 'No description'}
                                  </div>
                                </td>
                                <td className="p-3">{project.category || '-'}</td>
                                <td className="p-3">
                                  <Badge className={getStatusColor(project.status)}>
                                    {project.status || 'unknown'}
                                  </Badge>
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-col">
                                    <span className="text-sm">{project.completed_tasks}/{project.task_count}</span>
                                    <Progress 
                                      value={project.completion_percentage} 
                                      className="h-1 w-20" 
                                    />
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="text-sm">
                                    {format(new Date(project.updated_at), 'dd/MM/yyyy')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
