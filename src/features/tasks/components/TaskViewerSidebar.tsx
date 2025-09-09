import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { TaskDetailsTab } from './TaskViewerTabs/TaskDetailsTab';
import { SubtasksTab } from './TaskViewerTabs/SubtasksTab';
import { CommentsTab } from './TaskViewerTabs/CommentsTab';
import { TaskAttachmentsTab } from './TaskViewerTabs/TaskAttachmentsTab';
import { supabase } from '@/core/config/client';
import { Task } from './TaskCard';

interface TaskViewerSidebarProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface TaskViewerState {
  activeTab: 'details' | 'subtasks' | 'comments' | 'attachments';
  isLoading: boolean;
  task: Task | null;
  subtasks: Task[];
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  error: string | null;
}

export function TaskViewerSidebar({ taskId, isOpen, onClose }: TaskViewerSidebarProps) {
  const [state, setState] = useState<TaskViewerState>({
    activeTab: 'details',
    isLoading: false,
    task: null,
    subtasks: [],
    teamMembers: [],
    error: null
  });

  // Track comment count for the comments tab badge
  const [commentCount, setCommentCount] = useState(0);
  
  // Track attachment count for the attachments tab badge
  const [attachmentCount, setAttachmentCount] = useState(0);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (isOpen && taskId) {
      fetchTaskData();
      fetchCommentCount();
      fetchAttachmentCount();
      cleanup = setupRealtimeSubscription();
      // Don't navigate to different URL - just open sidebar on current page
    }

    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [isOpen, taskId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Helper function to fetch only subtasks
  const fetchSubtasks = async () => {
    if (!taskId) return;
    
    try {
      // Fetch subtasks
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', taskId)
        .order('subtask_order', { ascending: true });

      if (subtasksError) throw subtasksError;

      // Cast the subtasks to proper types
      const typedSubtasks: Task[] = (subtasksData || []).map(subtask => ({
        ...subtask,
        status: subtask.status as 'todo' | 'in-progress' | 'review' | 'done',
        priority: subtask.priority as 'low' | 'medium' | 'high' | 'critical'
      }));

      setState(prev => ({
        ...prev,
        subtasks: typedSubtasks,
      }));
    } catch (error: any) {
      console.error('Error fetching subtasks data:', error);
    }
  };

  const fetchTaskData = async () => {
    if (!taskId) return;

    console.log('fetchTaskData called for taskId:', taskId);

    setState(prev => ({ ...prev, isLoading: !prev.task, error: null }));
    
    try {
      // Fetch main task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      // Fetch subtasks
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', taskId)
        .order('subtask_order', { ascending: true });

      if (subtasksError) throw subtasksError;

      console.log('Fetched subtasks from database:', subtasksData);

      // Fetch team members for the project - use a simpler approach
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', taskData.project_id);

      if (membersError) throw membersError;

      // Get profiles for the members
      const userIds = membersData?.map(m => m.user_id) || [];
      let teamMembers: Array<{ id: string; name: string; email?: string }> = [];
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, full_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        teamMembers = profilesData?.map(profile => ({
          id: profile.user_id,
          name: profile.display_name || profile.full_name || 'Unknown User',
          email: ''
        })) || [];
      }

      // Cast the task data to proper types
      const typedTask: Task = {
        ...taskData,
        status: taskData.status as 'todo' | 'in-progress' | 'review' | 'done',
        priority: taskData.priority as 'low' | 'medium' | 'high' | 'critical'
      };

      const typedSubtasks: Task[] = (subtasksData || []).map(subtask => ({
        ...subtask,
        status: subtask.status as 'todo' | 'in-progress' | 'review' | 'done',
        priority: subtask.priority as 'low' | 'medium' | 'high' | 'critical'
      }));

      console.log('Setting React state with subtasks:', typedSubtasks);

      setState(prev => ({
        ...prev,
        task: typedTask,
        subtasks: typedSubtasks,
        teamMembers,
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Error fetching task data:', error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  };

  // Function to fetch comment count for the task
  const fetchCommentCount = async () => {
    if (!taskId) return;
    
    try {
      // First get all comments for the task
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId);

      if (commentsError) throw commentsError;

      // Set the comment count
      setCommentCount(commentsData?.length || 0);
    } catch (err: any) {
      console.error('Error fetching comment count:', err);
    }
  };

  // Function to fetch attachment count for the task
  const fetchAttachmentCount = async () => {
    if (!taskId) return;
    
    try {
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId);

      if (attachmentsError) throw attachmentsError;

      // Set the attachment count
      setAttachmentCount(attachmentsData?.length || 0);
    } catch (err: any) {
      console.error('Error fetching attachment count:', err);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!taskId) return undefined;

    const channel = supabase
      .channel(`task_viewer_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`
        },
        (payload) => {
          console.log('Main task updated:', payload);
          fetchTaskData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `parent_task_id=eq.${taskId}`
        },
        (payload) => {
          console.log('Subtask updated:', payload);
          fetchTaskData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        (payload) => {
          console.log('Task comment updated:', payload);
          fetchCommentCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_attachments',
          filter: `task_id=eq.${taskId}`
        },
        (payload) => {
          console.log('Task attachment updated:', payload);
          fetchAttachmentCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleTabChange = (value: string) => {
    setState(prev => ({ 
      ...prev, 
      activeTab: value as 'details' | 'subtasks' | 'comments' | 'attachments'
    }));
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div 
        className={`fixed right-0 top-0 h-full bg-card border-l border-border shadow-2xl transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } w-full sm:w-[420px] lg:w-[520px] xl:w-[580px]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-primary rounded-full"></div>
            <div>
              <h2 className="text-xl font-semibold text-card-foreground">Task Details</h2>
              {state.task && (
                <p className="text-sm text-muted-foreground mt-0.5">#{state.task.id.slice(-8)}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0 hover:bg-muted rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {state.isLoading ? (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/20 to-background">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin h-10 w-10 border-2 border-primary/20 border-t-primary rounded-full mx-auto mb-4"></div>
                  <div className="absolute inset-0 animate-ping h-10 w-10 border border-primary/10 rounded-full mx-auto"></div>
                </div>
                <p className="text-muted-foreground font-medium">Loading task...</p>
              </div>
            </div>
          ) : state.error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <X className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-destructive font-medium mb-2">Error loading task</p>
                <p className="text-sm text-muted-foreground mb-4">{state.error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTaskData}
                  className="border-destructive/20 hover:bg-destructive/5"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : state.task ? (
            <Tabs 
              value={state.activeTab} 
              onValueChange={handleTabChange}
              className="h-full flex flex-col"
            >
              <div className="px-6 pt-4 pb-2">
                <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 h-11 rounded-lg">
                  <TabsTrigger 
                    value="details" 
                    className="text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="subtasks"
                    className="text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    Subtasks ({state.subtasks.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="comments"
                    className="text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    Comments ({commentCount})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="attachments"
                    className="text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm"
                  >
                    Files ({attachmentCount})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1" style={{ height: '80vh', overflow: 'hidden' }}>
                <TabsContent value="details" className="h-full m-0">
                  <div style={{ height: '80vh', overflowY: 'auto' }} className="px-4">
                    <TaskDetailsTab 
                      task={state.task}
                      teamMembers={state.teamMembers}
                      onTaskUpdate={fetchTaskData}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="subtasks" className="h-full m-0">
                  <div style={{ height: '80vh', overflowY: 'auto' }} className="px-4">
                    <SubtasksTab
                      parentTask={state.task}
                      subtasks={state.subtasks}
                      teamMembers={state.teamMembers}
                      onSubtasksUpdate={fetchTaskData}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="h-full m-0">
                  <div style={{ height: '80vh', overflowY: 'auto' }} className="px-4">
                    <CommentsTab
                      taskId={state.task.id}
                      teamMembers={state.teamMembers}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="h-full m-0">
                  <div style={{ height: '80vh', overflowY: 'auto' }} className="px-4">
                    <TaskAttachmentsTab
                      taskId={state.task.id}
                      teamMembers={state.teamMembers}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Task not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}