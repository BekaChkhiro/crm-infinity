import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { 
  X, 
  Edit, 
  Eye, 
  MoreVertical, 
  Copy, 
  Trash2, 
  GitBranch, 
  Move,
  Calendar,
  MessageSquare,
  Users,
  Paperclip,
  Activity,
  Settings
} from 'lucide-react';
import { useGlobalTaskEdit } from '@/contexts/GlobalTaskEditContext';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Task } from '@/features/tasks/components/TaskCard';
import { TaskForm } from '@/features/tasks/components/TaskForm';
import { SubtaskList } from '@/features/tasks/components/SubtaskList';
import { TaskComments } from '@/features/tasks/components/TaskComments';
import { ActivityFeed } from '@/shared/components/common/ActivityFeed';
import { FileAttachments } from '@/shared/components/forms/FileAttachments';
import { TimeTracker } from '@/features/tasks/components/TimeTracker';
import { format } from 'date-fns';

const statusColors = {
  'todo': 'bg-muted text-muted-foreground',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  'done': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
};

const priorityColors = {
  'low': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  'critical': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

export function GlobalTaskEditPanel() {
  const { state, closeTaskEdit, setActiveTab, setMode } = useGlobalTaskEdit();
  const { user } = useAuth();
  const { toast } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (state.isOpen && state.taskId) {
      fetchTask();
      fetchTeamMembers();
    }
  }, [state.isOpen, state.taskId]);

  const fetchTask = async () => {
    if (!state.taskId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', state.taskId)
        .single();

      if (error) throw error;
      setTask(data as Task);
    } catch (err: any) {
      console.error('Error fetching task:', err);
      toast({
        title: "Error",
        description: "Failed to load task details",
        variant: "destructive"
      });
      closeTaskEdit();
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (!task?.project_id) return;
    
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', task.project_id);

      if (membersError) throw membersError;

      if (membersData && membersData.length > 0) {
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
      }
    } catch (err: any) {
      console.error('Error fetching team members:', err);
    }
  };

  const handleTaskUpdate = async (updatedData: any) => {
    if (!task) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update(updatedData)
        .eq('id', task.id);

      if (error) throw error;

      setTask(prev => prev ? { ...prev, ...updatedData } : null);
      setMode('view');
      
      toast({
        title: "Success",
        description: "Task updated successfully"
      });
    } catch (err: any) {
      console.error('Error updating task:', err);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateTask = async () => {
    if (!task) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: `${task.title} (Copy)`,
          description: task.description,
          priority: task.priority,
          project_id: task.project_id,
          created_by: user?.id,
          status: 'todo'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task duplicated successfully"
      });
    } catch (err: any) {
      console.error('Error duplicating task:', err);
      toast({
        title: "Error",
        description: "Failed to duplicate task",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted successfully"
      });
      
      closeTaskEdit();
    } catch (err: any) {
      console.error('Error deleting task:', err);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      });
    }
  };

  if (!state.isOpen || !task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="flex-1 bg-black/20 backdrop-blur-sm" 
        onClick={closeTaskEdit}
      />
      
      {/* Slide-out Panel */}
      <div className="w-full max-w-2xl bg-background border-l shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={statusColors[task.status]} variant="secondary">
                {task.status.replace('-', ' ').toUpperCase()}
              </Badge>
              <Badge className={priorityColors[task.priority]} variant="secondary">
                {task.priority.toUpperCase()}
              </Badge>
            </div>
            <h2 className="font-semibold truncate">{task.title}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode(state.mode === 'view' ? 'edit' : 'view')}
            >
              {state.mode === 'view' ? (
                <>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                <DropdownMenuItem onClick={handleDuplicateTask}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Task
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Convert to Subtask
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Move className="h-4 w-4 mr-2" />
                  Move to Project
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDeleteTask}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="sm" onClick={closeTaskEdit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={state.selectedTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-6 mx-4 mt-4">
              <TabsTrigger value="details" className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                Details
              </TabsTrigger>
              <TabsTrigger value="subtasks" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Subtasks
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                Files
              </TabsTrigger>
              <TabsTrigger value="time" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Time
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Activity
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto p-4">
              <TabsContent value="details" className="mt-0">
                {state.mode === 'edit' ? (
                  <TaskForm
                    open="embedded"
                    onOpenChange={() => {}}
                    onSubmit={handleTaskUpdate}
                    task={task}
                    teamMembers={teamMembers}
                    loading={loading}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
                        <div className="mb-3">
                          <label className="text-sm font-medium text-muted-foreground">Description</label>
                          {task.description ? (
                            <p className="text-sm mt-1 whitespace-pre-wrap">{task.description}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic mt-1">No description provided</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Status</label>
                          <p className="text-sm">{task.status.replace('-', ' ').toUpperCase()}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Priority</label>
                          <p className="text-sm">{task.priority.toUpperCase()}</p>
                        </div>
                        {task.due_date && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                            <p className="text-sm">{format(new Date(task.due_date), 'PPP')}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Created</label>
                          <p className="text-sm">{format(new Date(task.created_at), 'PPP')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="subtasks" className="mt-0">
                <SubtaskList
                  parentTask={task}
                  teamMembers={teamMembers}
                  onTaskEdit={() => {}}
                  onTasksChange={fetchTask}
                />
              </TabsContent>

              <TabsContent value="comments" className="mt-0">
                <TaskComments
                  task={task}
                  teamMembers={teamMembers}
                  isOpen={true}
                  onClose={() => {}}
                />
              </TabsContent>

              <TabsContent value="files" className="mt-0">
                <FileAttachments
                  taskId={task.id}
                  teamMembers={teamMembers}
                />
              </TabsContent>

              <TabsContent value="time" className="mt-0">
                <TimeTracker
                  taskId={task.id}
                  teamMembers={teamMembers}
                />
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <ActivityFeed
                  projectId={task.project_id}
                  teamMembers={teamMembers}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}