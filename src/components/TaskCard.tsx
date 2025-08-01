import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MoreVertical, Edit, Trash2, MessageSquare, Calendar, ChevronDown, ChevronRight, Users, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { SubtaskList } from './SubtaskList';
import { TaskComments } from './TaskComments';
import { useGlobalTaskEdit } from '@/contexts/GlobalTaskEditContext';
import { supabase } from '@/integrations/supabase/client';

// Add props for task viewer integration
interface TaskCardClickHandler {
  onTaskClick?: (taskId: string) => void;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee_id: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project_id: string;
  kanban_position?: number | null;
  kanban_column?: string | null;
  parent_task_id?: string | null;
  is_subtask?: boolean;
  subtask_order?: number | null;
}

interface TaskCardProps extends TaskCardClickHandler {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  assigneeName?: string;
  creatorName?: string;
  teamMembers?: Array<{ id: string; name: string }>;
  onTasksChange?: () => void;
  showSubtasks?: boolean;
}

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

const statusLabels = {
  'todo': 'საკეთებელი',
  'in-progress': 'მიმდინარეობაში',
  'review': 'მიმოხილვაში',
  'done': 'დასრულებული',
};

export function TaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  assigneeName, 
  creatorName, 
  teamMembers = [], 
  onTasksChange,
  showSubtasks = true,
  onTaskClick
}: TaskCardProps) {
  const { openTaskEdit } = useGlobalTaskEdit();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [subtaskCount, setSubtaskCount] = useState(0);
  const [hasSubtasks, setHasSubtasks] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    checkForSubtasks();
    checkCommentCount();
  }, [task.id]);

  const checkForSubtasks = async () => {
    try {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('parent_task_id', task.id);

      if (error) throw error;
      
      const subtaskCount = count || 0;
      setSubtaskCount(subtaskCount);
      setHasSubtasks(subtaskCount > 0);
    } catch (err) {
      console.error('Error checking for subtasks:', err);
    }
  };

  const checkCommentCount = async () => {
    try {
      const { count, error } = await supabase
        .from('task_comments')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', task.id);

      if (error) throw error;
      setCommentCount(count || 0);
    } catch (err) {
      console.error('Error checking comment count:', err);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-3">
      <Card 
        className="w-full hover:shadow-md transition-shadow cursor-pointer" 
        onClick={() => onTaskClick?.(task.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{task.title}</h3>
                {task.is_subtask && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    ქვედავალება
                  </Badge>
                )}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  დავალების რედაქტირება
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  დავალების წაშლა
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className={statusColors[task.status]} variant="secondary">
              {statusLabels[task.status]}
            </Badge>
            <Badge className={priorityColors[task.priority]} variant="secondary">
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>
          </div>

          {task.due_date && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              ვადა {format(new Date(task.due_date), 'MMM dd, yyyy')}
            </div>
          )}

          <div className="flex items-center justify-between">
            {assigneeName && (
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(assigneeName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{assigneeName}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setShowComments(true)}
              >
                <MessageSquare className="h-3 w-3" />
                {commentCount > 0 && (
                  <span className="ml-1 text-xs">{commentCount}</span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => openTaskEdit(task.id, 'edit')}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                <option value="todo">საკეთებელი</option>
                <option value="in-progress">მიმდინარეობაში</option>
                <option value="review">მიმოხილვაში</option>
                <option value="done">დასრულებული</option>
              </select>
            </div>
          </div>
        </CardContent>

      </Card>

      {/* Comments Dialog */}
      {showComments && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <TaskComments
            task={task}
            teamMembers={teamMembers}
            isOpen={showComments}
            onClose={() => {
              setShowComments(false);
              checkCommentCount(); // Refresh comment count when closing
            }}
          />
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? 
              {hasSubtasks && ` This will also delete ${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''}.`} 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete(task.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}