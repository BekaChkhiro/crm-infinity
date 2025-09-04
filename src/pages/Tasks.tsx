import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { TaskCard, Task } from '@/components/TaskCard';
import { TaskForm } from '@/components/TaskForm';
import { TaskFiltersComponent, TaskFilters } from '@/components/TaskFilters';
import { TaskViewerSidebar } from '@/components/TaskViewerSidebar';
import { KanbanBoard } from '@/components/KanbanBoard';
import { useToast } from '@/hooks/use-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  FolderOpen,
  Calendar,
  BarChart3,
  Grid3X3,
  List,
  Users,
  ListTodo
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  category: string | null;
  created_at: string;
}

interface ProjectWithTasks extends Project {
  tasks: Task[];
  taskCounts: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
}

interface TeamMember {
  id: string;
  name: string;
}

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { taskId } = useParams();
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const [projects, setProjects] = useState<ProjectWithTasks[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [lastSelectedProject, setLastSelectedProject] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grouped' | 'list' | 'kanban' | 'calendar'>('grouped');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    status: 'all',
    priority: 'all',
    assignee: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Default to current user's tasks when available
  useEffect(() => {
    if (user && filters.assignee === 'all') {
      setFilters((prev) => ({ ...prev, assignee: user.id }));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    Promise.all([
      fetchProjects(),
      fetchAllTasks(),
      fetchTeamMembers()
    ]);
  }, [user]);

  useEffect(() => {
    // Remember last selected project
    if (selectedProject !== 'all') {
      setLastSelectedProject(selectedProject);
      localStorage.setItem('lastSelectedProject', selectedProject);
    }
  }, [selectedProject]);

  useEffect(() => {
    // Load saved project preference
    const saved = localStorage.getItem('lastSelectedProject');
    if (saved) {
      setLastSelectedProject(saved);
    }
  }, []);

  // Handle sidebar for task viewing
  useEffect(() => {
    if (taskId) {
      setSelectedTaskId(taskId);
      setSidebarOpen(true);
    }
  }, [taskId]);

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
    setSelectedTaskId(null);
    if (taskId) {
      navigate('/tasks');
    }
  };

  const fetchProjects = async () => {
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (projectsError) throw projectsError;

      const projectsWithTasks: ProjectWithTasks[] = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: false });

          if (tasksError) throw tasksError;

          const tasks = (tasksData || []) as Task[];
          const parentTasks = tasks.filter(t => !t.is_subtask);
          
          return {
            ...project,
            tasks,
            taskCounts: {
              total: parentTasks.length,
              todo: parentTasks.filter(t => t.status === 'todo').length,
              inProgress: parentTasks.filter(t => t.status === 'in-progress').length,
              review: parentTasks.filter(t => t.status === 'review').length,
              done: parentTasks.filter(t => t.status === 'done').length,
            }
          };
        })
      );

      setProjects(projectsWithTasks);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    }
  };

  const fetchAllTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllTasks((data || []) as Task[]);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name');

      if (error) throw error;

      const members = (profilesData || []).map(profile => ({
        id: profile.user_id,
        name: profile.display_name || profile.full_name || 'Unknown User'
      }));

      setTeamMembers(members);
    } catch (err: any) {
      console.error('Error fetching team members:', err);
    }
  };

  const handleCreateTask = async (taskData: any) => {
    setTaskLoading(true);
    try {
      const projectId = taskData.project_id || lastSelectedProject;
      
      // Map status to kanban_column to ensure tasks appear in Kanban board
      const statusToColumnMap: { [key: string]: string } = {
        'todo': 'to-do',
        'in-progress': 'in-progress',
        'review': 'review',
        'done': 'done'
      };
      
      const kanban_column = statusToColumnMap[taskData.status] || 'to-do';
      
      const { data: taskResult, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          project_id: projectId,
          created_by: user?.id,
          assignee_id: taskData.assignee_id === 'unassigned' ? null : taskData.assignee_id,
          kanban_column: kanban_column, // Add kanban_column mapping
          kanban_position: 0 // Add default kanban position
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      if (projectId) {
        await supabase.rpc('log_project_activity', {
          p_project_id: projectId,
          p_user_id: user?.id,
          p_activity_type: 'task_created',
          p_description: `Created task "${taskData.title}"`,
          p_entity_type: 'task',
          p_entity_id: taskResult.id
        });
      }

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      setTaskFormOpen(false);
      fetchProjects();
      fetchAllTasks();
    } catch (err: any) {
      console.error('Error creating task:', err);
      toast({
        title: "Error",
        description: "Failed to create task",
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
      // Map status to kanban_column
      const statusToColumnMap: { [key: string]: string } = {
        'todo': 'to-do',
        'in-progress': 'in-progress',
        'review': 'review',
        'done': 'done'
      };
      
      const kanban_column = statusToColumnMap[taskData.status] || 'to-do';
      
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
        p_project_id: editingTask.project_id,
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
      fetchProjects();
      fetchAllTasks();
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

  const handleDeleteTask = async (taskId: string) => {
    try {
      const task = allTasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      if (task) {
        await supabase.rpc('log_project_activity', {
          p_project_id: task.project_id,
          p_user_id: user?.id,
          p_activity_type: 'task_deleted',
          p_description: `Deleted task "${task.title}"`,
          p_entity_type: 'task',
          p_entity_id: taskId
        });
      }

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });

      fetchProjects();
      fetchAllTasks();
    } catch (err: any) {
      console.error('Error deleting task:', err);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      const task = allTasks.find(t => t.id === taskId);
      
      // Map status to kanban_column
      const statusToColumnMap: { [key: string]: string } = {
        'todo': 'to-do',
        'in-progress': 'in-progress',
        'review': 'review',
        'done': 'done'
      };
      
      const kanban_column = statusToColumnMap[status] || 'to-do';
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status,
          kanban_column: kanban_column 
        })
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      if (task) {
        await supabase.rpc('log_project_activity', {
          p_project_id: task.project_id,
          p_user_id: user?.id,
          p_activity_type: 'task_updated',
          p_description: `Changed task "${task.title}" status to ${status}`,
          p_entity_type: 'task',
          p_entity_id: taskId
        });
      }

      fetchProjects();
      fetchAllTasks();
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

  const toggleProjectExpanded = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // Get filtered tasks based on selected project and filters
  const getFilteredTasks = () => {
    let tasks = selectedProject === 'all' ? allTasks : allTasks.filter(t => t.project_id === selectedProject);
    
    // Apply filters
    if (filters.search) {
      tasks = tasks.filter(task =>
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.status && filters.status !== 'all') {
      tasks = tasks.filter(task => task.status === filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      tasks = tasks.filter(task => task.priority === filters.priority);
    }

    if (filters.assignee && filters.assignee !== 'all') {
      if (filters.assignee === 'unassigned') {
        tasks = tasks.filter(task => !task.assignee_id);
      } else {
        // If filtering for the current user, include tasks assigned to them OR created by them
        if (user && filters.assignee === user.id) {
          tasks = tasks.filter(task => task.assignee_id === user.id || task.created_by === user.id);
        } else {
          tasks = tasks.filter(task => task.assignee_id === filters.assignee);
        }
      }
    }

    // Apply sorting
    tasks.sort((a, b) => {
      let aValue: any, bValue: any;

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

    return tasks;
  };

  // Calculate overall task counts
  const overallTaskCounts = React.useMemo(() => {
    const tasks = selectedProject === 'all' ? allTasks : allTasks.filter(t => t.project_id === selectedProject);
    const parentTasks = tasks.filter(t => !t.is_subtask);
    
    return {
      total: parentTasks.length,
      todo: parentTasks.filter(t => t.status === 'todo').length,
      inProgress: parentTasks.filter(t => t.status === 'in-progress').length,
      review: parentTasks.filter(t => t.status === 'review').length,
      done: parentTasks.filter(t => t.status === 'done').length,
    };
  }, [allTasks, selectedProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
              <p className="text-muted-foreground">
                Manage tasks across all projects
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Project Selector */}
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {project.name}
                        <Badge variant="secondary" className="ml-2">
                          {project.taskCounts.total}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                <TabsList>
                  <TabsTrigger value="grouped">
                    <Grid3X3 className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="kanban">
                    <BarChart3 className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button onClick={openCreateTaskForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-6">
        {/* Filters */}
        <TaskFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          teamMembers={teamMembers}
          taskCounts={overallTaskCounts}
        />

        {/* Task Views */}
        {viewMode === 'grouped' && (
          <div className="space-y-6">
            {projects.map((project) => {
              const projectTasks = getFilteredTasks().filter(t => t.project_id === project.id && !t.is_subtask);
              
              if (selectedProject !== 'all' && selectedProject !== project.id) return null;
              if (projectTasks.length === 0 && selectedProject === 'all') return null;

              return (
                <Card key={project.id}>
                  <Collapsible 
                    open={expandedProjects.has(project.id)}
                    onOpenChange={() => toggleProjectExpanded(project.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedProjects.has(project.id) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                            <FolderOpen className="h-5 w-5 text-primary" />
                            <div>
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                              {project.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {projectTasks.length} tasks
                            </Badge>
                            <Badge variant="secondary">
                              {project.taskCounts.done}/{project.taskCounts.total} completed
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {projectTasks.length > 0 ? (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {projectTasks.map((task) => (
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
                                  fetchProjects();
                                  fetchAllTasks();
                                }}
                                onTaskClick={handleTaskClick}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">No tasks in this project</p>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="space-y-4">
            {getFilteredTasks().filter(t => !t.is_subtask).map((task) => {
              const project = projects.find(p => p.id === task.project_id);
              return (
                <div key={task.id} className="relative">
                  {/* Project indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-primary" />
                  <div className="ml-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {project?.name}
                      </span>
                    </div>
                    <TaskCard
                      task={task}
                      onEdit={openEditTaskForm}
                      onDelete={handleDeleteTask}
                      onStatusChange={handleStatusChange}
                      assigneeName={teamMembers.find(m => m.id === task.assignee_id)?.name}
                      creatorName={teamMembers.find(m => m.id === task.created_by)?.name}
                      teamMembers={teamMembers}
                      onTasksChange={() => {
                        fetchProjects();
                        fetchAllTasks();
                      }}
                      onTaskClick={handleTaskClick}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'kanban' && (
          <div className="space-y-6">
            {selectedProject !== 'all' ? (
              <KanbanBoard
                projectId={selectedProject}
                tasks={getFilteredTasks()}
                teamMembers={teamMembers}
                onTaskEdit={openEditTaskForm}
                onCreateTask={openCreateTaskForm}
                onTasksChange={() => {
                  fetchProjects();
                  fetchAllTasks();
                }}
                onTaskClick={handleTaskClick}
              />
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Select a Project for Kanban View</h3>
                <p className="text-muted-foreground">
                  Please select a specific project to view tasks in Kanban format
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {getFilteredTasks().length === 0 && viewMode !== 'kanban' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <ListTodo className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Tasks Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first task to get started
            </p>
            <Button onClick={openCreateTaskForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </div>
        )}
      </div>

      {/* Task Form */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        teamMembers={teamMembers}
        loading={taskLoading}
        projects={projects}
        defaultProjectId={lastSelectedProject}
      />
      {/* Task Viewer Sidebar */}
      <TaskViewerSidebar
        taskId={selectedTaskId}
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
      />
    </div>
  );
}
