import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { LoadingSpinner } from '@/shared/components/common/LoadingSpinner';
import { useToast } from '@/shared/hooks/use-toast';
import { Calendar, Users, BarChart3, Plus, Settings, ListTodo } from 'lucide-react';
import { format } from 'date-fns';
import { TaskCard, Task } from '@/features/tasks/components/TaskCard';
import { TaskForm } from '@/features/tasks/components/TaskForm';
import { TaskFiltersComponent, TaskFilters } from '@/features/tasks/components/TaskFilters';
import { TeamManagement } from '@/features/projects/components/EnhancedTeamManagement';
import { KanbanBoard } from '@/features/kanban/components/KanbanBoard';
import { TasksCalendarView } from '@/features/tasks/components/TasksCalendarView';
import { FileManager } from '@/shared/components/forms/FileManager';
import { ActivityFeed } from '@/shared/components/common/ActivityFeed';
import { TaskViewerSidebar } from '@/features/tasks/components/TaskViewerSidebar';
import { FileUploadService } from '@/services/fileUploadService';
import { FileUploadItem } from '@/components/ui/file-upload';

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
  created_by: string;
}

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  teamMembers: number;
  completionPercentage: number;
}

interface TeamMember {
  id: string;
  name: string;
  email?: string;
}

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Task Viewer Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats>({
    totalTasks: 0,
    completedTasks: 0,
    teamMembers: 0,
    completionPercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [projectStatuses, setProjectStatuses] = useState<Array<{ id: string; name: string; color: string }>>([]);
  
  // Debug: log projectStatuses changes
  useEffect(() => {
    console.log('ProjectDetails projectStatuses updated:', projectStatuses);
  }, [projectStatuses]);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setSelectedTaskId(null);
  };

  useEffect(() => {
    if (!id || !user) return;
    
    fetchProject();
    fetchProjectStats();
    fetchTasks();
    fetchTeamMembers();
    fetchKanbanColumns();
    fetchProjectStatuses();
  }, [id, user]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load project details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectStats = async () => {
    try {
      // Get team members count
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', id);

      if (membersError) throw membersError;

      // Get tasks statistics
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('status')
        .eq('project_id', id);

      if (tasksError) throw tasksError;

      const teamMembersCount = members?.length || 0;
      const totalTasks = tasksData?.length || 0;
      const completedTasks = tasksData?.filter(task => task.status === 'done').length || 0;
      const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      setStats({
        totalTasks,
        completedTasks,
        teamMembers: teamMembersCount,
        completionPercentage
      });
    } catch (err: any) {
      console.error('Error fetching project stats:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data || []) as Task[]);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive"
      });
    }
  };

  const fetchTeamMembers = async () => {
    try {
      // First get project members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', id);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setTeamMembers([]);
        return;
      }

      // Then get profile info for each member
      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const members = membersData.map(member => {
        const profile = profilesData?.find(p => p.user_id === member.user_id);
        return {
          id: member.user_id,
          name: profile?.display_name || profile?.full_name || 'Unknown User'
        };
      });

      setTeamMembers(members);
    } catch (err: any) {
      console.error('Error fetching team members:', err);
    }
  };

  const handleCreateTask = async (taskData: any & { files?: FileUploadItem[] }) => {
    setTaskLoading(true);
    try {
      // Status is the column name itself - no mapping needed
      const kanban_column = taskData.status.toLowerCase().replace(/\s+/g, '-');
      
      const { data: taskResult, error } = await supabase
        .from('tasks')
        .insert({
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          assignee_id: taskData.assignee_id === 'unassigned' ? null : taskData.assignee_id,
          due_date: taskData.due_date,
          project_id: id,
          created_by: user?.id,
          kanban_column: kanban_column, // Add kanban_column mapping
          kanban_position: 0 // Add default kanban position
        })
        .select()
        .single();

      if (error) throw error;

      // Upload files if any
      if (taskData.files && taskData.files.length > 0) {
        try {
          const { results, allSucceeded } = await FileUploadService.uploadTaskAttachments(
            taskResult.id,
            taskData.files
          );

          if (!allSucceeded) {
            const failedUploads = results.filter(r => !r.success);
            console.warn('Some files failed to upload:', failedUploads);
            toast({
              title: 'გაფრთხილება',
              description: `დავალება შეიქმნა, მაგრამ ${failedUploads.length} ფაილის ატვირთვა ვერ მოხერხდა`,
              variant: 'default',
            });
          }
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
          toast({
            title: 'გაფრთხილება',
            description: 'დავალება შეიქმნა, მაგრამ ფაილების ატვირთვა ვერ მოხერხდა',
            variant: 'default',
          });
        }
      }

      // Log activity
      await supabase.rpc('log_project_activity', {
        p_project_id: id,
        p_user_id: user?.id,
        p_activity_type: 'task_created',
        p_description: `Created task "${taskData.title}"`,
        p_entity_type: 'task',
        p_entity_id: taskResult.id
      });

      toast({
        title: "წარმატება",
        description: "დავალება წარმატებით შეიქმნა",
      });

      setTaskFormOpen(false);
      fetchTasks();
      fetchProjectStats();
      fetchProjectStatuses();
    } catch (err: any) {
      console.error('Error creating task:', err);
      toast({
        title: "შეცდომა",
        description: "დავალების შექმნა ვერ მოხერხდა",
        variant: "destructive"
      });
    } finally {
      setTaskLoading(false);
    }
  };

  const handleUpdateTask = async (taskData: any) => {
    if (!editingTask) return;
    
    setTaskLoading(true);
    try {
      // Status is the column name itself
      const kanban_column = taskData.status.toLowerCase().replace(/\s+/g, '-');
      
      const { error } = await supabase
        .from('tasks')
        .update({
          ...taskData,
          assignee_id: taskData.assignee_id === 'unassigned' ? null : taskData.assignee_id,
          kanban_column: kanban_column // Update kanban_column when editing
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_project_activity', {
        p_project_id: id,
        p_user_id: user?.id,
        p_activity_type: 'task_updated',
        p_description: `Updated task "${taskData.title}"`,
        p_entity_type: 'task',
        p_entity_id: editingTask.id
      });

      toast({
        title: "Success",
        description: "Task updated successfully",
      });

      setTaskFormOpen(false);
      setEditingTask(null);
      fetchTasks();
      fetchProjectStats();
      fetchProjectStatuses();
    } catch (err: any) {
      console.error('Error updating task:', err);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    } finally {
      setTaskLoading(false);
    }
  };

  const fetchKanbanColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('id, name, color')
        .eq('project_id', id)
        .order('position');

      if (error) throw error;
      setKanbanColumns(data || []);
    } catch (err: any) {
      console.error('Error fetching kanban columns:', err);
    }
  };

  const fetchProjectStatuses = async () => {
    try {
      console.log('fetchProjectStatuses called for projectId:', id);
      const { data, error } = await supabase
        .from('project_statuses')
        .select('id, name, color')
        .eq('project_id', id)
        .order('position');
      
      console.log('fetchProjectStatuses result:', { data, error });

      if (error) {
        // If project_statuses table doesn't exist or no data, use default statuses
        console.log('No project statuses found, using defaults', error);
        const defaultStatuses = [
          { id: '1', name: 'To Do', color: '#6b7280' },
          { id: '2', name: 'In Progress', color: '#0ea5e9' },
          { id: '3', name: 'Review', color: '#f59e0b' },
          { id: '4', name: 'Done', color: '#22c55e' }
        ];
        console.log('Setting default projectStatuses:', defaultStatuses);
        setProjectStatuses(defaultStatuses);
        return;
      }

      if (!data || data.length === 0) {
        // Use default statuses if no custom ones are defined
        console.log('No custom statuses found, using defaults');
        const defaultStatuses = [
          { id: '1', name: 'To Do', color: '#6b7280' },
          { id: '2', name: 'In Progress', color: '#0ea5e9' },
          { id: '3', name: 'Review', color: '#f59e0b' },
          { id: '4', name: 'Done', color: '#22c55e' }
        ];
        console.log('Setting default projectStatuses:', defaultStatuses);
        setProjectStatuses(defaultStatuses);
      } else {
        console.log('Found custom project statuses:', data);
        setProjectStatuses(data);
      }
    } catch (err: any) {
      console.error('Error fetching project statuses:', err);
      // Fallback to default statuses
      setProjectStatuses([
        { id: '1', name: 'To Do', color: '#6b7280' },
        { id: '2', name: 'In Progress', color: '#0ea5e9' },
        { id: '3', name: 'Review', color: '#f59e0b' },
        { id: '4', name: 'Done', color: '#22c55e' }
      ]);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Task was already deleted from modal, just refresh the UI
    try {
      // Force UI refresh by clearing state and refetching
      setTasks([]);
      await Promise.all([fetchTasks(), fetchProjectStats()]);
    } catch (err: any) {
      console.error('Error refreshing project data:', err);
      // Still try to refresh even if there's an error
      await fetchTasks();
      await fetchProjectStats();
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      // Get task title for activity log
      const { data: taskData } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', taskId)
        .single();

      // Status is the column name itself
      const kanban_column = status.toLowerCase().replace(/\s+/g, '-');

      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          kanban_column: kanban_column 
        })
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_project_activity', {
        p_project_id: id,
        p_user_id: user?.id,
        p_activity_type: 'task_updated',
        p_description: `Changed task "${taskData?.title || 'Unknown'}" status to ${status}`,
        p_entity_type: 'task',
        p_entity_id: taskId
      });

      fetchTasks();
      fetchProjectStats();
    } catch (err: any) {
      console.error('Error updating task status:', err);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };

  const openCreateTaskForm = () => {
    setEditingTask(null);
    setTaskFormOpen(true);
  };

  const openEditTaskForm = (task: Task) => {
    setEditingTask(task);
    setTaskFormOpen(true);
  };

  // Filter and sort tasks (exclude subtasks from main task list)
  const filteredTasks = React.useMemo(() => {
    let filtered = [...tasks].filter(task => !task.is_subtask); // Only show parent tasks

    // Apply filters
    if (filters.search) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    if (filters.assignee && filters.assignee !== 'all') {
      if (filters.assignee === 'unassigned') {
        filtered = filtered.filter(task => !task.assignee_id);
      } else {
        filtered = filtered.filter(task => task.assignee_id === filters.assignee);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (filters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tasks, filters]);

  // Calculate task counts for filters (exclude subtasks)
  const taskCounts = React.useMemo(() => {
    const parentTasks = tasks.filter(t => !t.is_subtask);
    return {
      total: parentTasks.length,
      todo: parentTasks.filter(t => t.status === 'todo').length,
      inProgress: parentTasks.filter(t => t.status === 'in-progress').length,
      review: parentTasks.filter(t => t.status === 'review').length,
      done: parentTasks.filter(t => t.status === 'done').length,
    };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !project) {
    return <Navigate to="/dashboard" replace />;
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'on-hold': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="bg-background">
      {/* Project Header */}
      <div className="border-b bg-card">
        <div className="px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
                <Badge className={getStatusColor(project.status)}>
                  {project.status || 'Unknown'}
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground max-w-2xl">{project.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Created {format(new Date(project.created_at), 'MMM dd, yyyy')}</span>
                {project.category && (
                  <span className="capitalize">{project.category}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate(`/project/${project.id}/settings`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button size="sm" onClick={openCreateTaskForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 lg:w-fit lg:grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 py-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall Completion</span>
                  <span className="text-sm font-medium">{Math.round(stats.completionPercentage)}%</span>
                </div>
                <Progress value={stats.completionPercentage} className="h-2" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.totalTasks}</div>
                    <div className="text-sm text-muted-foreground">Total Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalTasks - stats.completedTasks}</div>
                    <div className="text-sm text-muted-foreground">Remaining</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.teamMembers}</div>
                    <div className="text-sm text-muted-foreground">Team Members</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.teamMembers}</div>
                  <p className="text-xs text-muted-foreground">Active Contributors</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Project Timeline</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {project.start_date ? format(new Date(project.start_date), 'MMM dd') : 'Not Set'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {project.end_date ? `Ends ${format(new Date(project.end_date), 'MMM dd, yyyy')}` : 'No End Date Set'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Activity Score</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-muted-foreground">Team Engagement</p>
                </CardContent>
              </Card>
            </div>

            {/* Project Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Project Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Project Name</label>
                    <p className="text-sm">{project.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-sm capitalize">{project.status || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="text-sm capitalize">{project.category || 'General'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                    <p className="text-sm">{format(new Date(project.created_at), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>
                {project.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm mt-1">{project.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ListTodo className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Project Tasks</h2>
              </div>
              <Button onClick={openCreateTaskForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>

            <TaskFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              teamMembers={teamMembers}
              taskCounts={taskCounts}
              kanbanColumns={kanbanColumns}
            />

            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center text-muted-foreground">
                    <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    {tasks.length === 0 ? (
                      <div>
                        <p className="text-lg font-medium">No tasks yet</p>
                        <p className="text-sm">Create your first task to get started</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-medium">No tasks match the current filters</p>
                        <p className="text-sm">Try adjusting your search or filter criteria</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={openEditTaskForm}
                    onDelete={handleDeleteTask}
                    onStatusChange={handleStatusChange}
                    assigneeName={teamMembers.find(m => m.id === task.assignee_id)?.name}
                    creatorName={teamMembers.find(m => m.id === task.created_by)?.name}
                    teamMembers={teamMembers}
                    onTasksChange={() => {
                      fetchTasks();
                      fetchProjectStats();
                    }}
                    showSubtasks={true}
                    onTaskClick={handleTaskClick}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Placeholder tabs for future implementation */}

          <TabsContent value="kanban" className="py-6">
            <KanbanBoard
              projectId={id!}
              tasks={tasks}
              teamMembers={teamMembers}
              onTaskEdit={openEditTaskForm}
              onCreateTask={openCreateTaskForm}
              onTasksChange={() => {
                fetchTasks();
                fetchProjectStatuses();
              }}
              onTaskClick={handleTaskClick}
            />
          </TabsContent>

          <TabsContent value="calendar" className="py-6">
            <TasksCalendarView
              tasks={tasks}
              teamMembers={teamMembers}
              onTaskEdit={openEditTaskForm}
              onTaskClick={handleTaskClick}
            />
          </TabsContent>

          <TabsContent value="files" className="py-6">
            <FileManager
              projectId={id!}
              teamMembers={teamMembers}
            />
          </TabsContent>

          <TabsContent value="team" className="py-6">
            <TeamManagement 
              projectId={id!} 
              onTeamMembersChange={fetchTeamMembers}
            />
          </TabsContent>

          <TabsContent value="activity" className="py-6">
            <ActivityFeed
              projectId={id!}
              teamMembers={teamMembers}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Form Modal */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        teamMembers={teamMembers}
        loading={taskLoading}
        kanbanColumns={kanbanColumns}
        projectStatuses={projectStatuses}
        />

      {/* Task Viewer Sidebar */}
      <TaskViewerSidebar
        taskId={selectedTaskId}
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
        onTaskDelete={handleDeleteTask}
      />
    </div>
  );
}