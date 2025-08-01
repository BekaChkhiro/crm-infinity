import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, Clock, User, FolderOpen, MoreVertical, Edit, Copy, Trash2, Move, CheckCircle2, AlertCircle, Timer, Target } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { Task } from '../TaskCard';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalTaskEdit } from '@/contexts/GlobalTaskEditContext';
import { useToast } from '@/hooks/use-toast';

interface TaskDetailsTabProps {
  task: Task;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  onTaskUpdate: () => void;
}

const statusConfig = {
  'todo': { 
    color: 'bg-muted/50 text-muted-foreground border-muted', 
    icon: Timer,
    label: 'To Do'
  },
  'in-progress': { 
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800', 
    icon: Target,
    label: 'In Progress'
  },
  'review': { 
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800', 
    icon: AlertCircle,
    label: 'Review'
  },
  'done': { 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800', 
    icon: CheckCircle2,
    label: 'Done'
  },
};

const priorityConfig = {
  'low': { 
    color: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-800',
    indicator: 'bg-slate-400'
  },
  'medium': { 
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
    indicator: 'bg-blue-500'
  },
  'high': { 
    color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800',
    indicator: 'bg-orange-500'
  },
  'critical': { 
    color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800',
    indicator: 'bg-red-500'
  },
};

export function TaskDetailsTab({ task, teamMembers, onTaskUpdate }: TaskDetailsTabProps) {
  const { toast } = useToast();
  const { openTaskEdit } = useGlobalTaskEdit();
  const assignee = teamMembers.find(member => member.id === task.assignee_id);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getDueDateStatus = () => {
    if (!task.due_date) return null;
    
    const dueDate = new Date(task.due_date);
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    if (isBefore(dueDate, today)) {
      return { status: 'overdue', color: 'text-red-600', label: 'Overdue' };
    } else if (isBefore(dueDate, tomorrow)) {
      return { status: 'due-today', color: 'text-orange-600', label: 'Due Today' };
    } else if (isBefore(dueDate, addDays(today, 3))) {
      return { status: 'due-soon', color: 'text-yellow-600', label: 'Due Soon' };
    }
    return { status: 'normal', color: 'text-muted-foreground', label: '' };
  };

  const calculateProgress = async () => {
    try {
      const { data, error } = await supabase.rpc('calculate_task_progress', {
        task_id: task.id
      });
      
      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error calculating progress:', error);
      return 0;
    }
  };

  const [progress, setProgress] = React.useState(0);
  const [subtaskCount, setSubtaskCount] = React.useState(0);

  React.useEffect(() => {
    const fetchProgress = async () => {
      const progressValue = await calculateProgress();
      setProgress(progressValue);
      
      // Get subtask count
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('parent_task_id', task.id);
      
      setSubtaskCount(count || 0);
    };
    
    fetchProgress();
  }, [task.id]);

  const dueDateStatus = getDueDateStatus();

  const handleQuickAction = async (action: string) => {
    try {
      switch (action) {
        case 'edit':
          // Open the global task edit panel
          openTaskEdit(task.id);
          break;
        case 'duplicate':
          // Handle duplicate
          toast({
            title: "Duplicate Task",
            description: "Duplicate functionality would be implemented here"
          });
          break;
        case 'delete':
          // Handle delete with confirmation
          if (confirm('Are you sure you want to delete this task?')) {
            const { error } = await supabase
              .from('tasks')
              .delete()
              .eq('id', task.id);
            
            if (error) throw error;
            
            toast({
              title: "Success",
              description: "Task deleted successfully"
            });
            onTaskUpdate();
          }
          break;
        case 'move':
          // Handle move to project
          toast({
            title: "Move Task",
            description: "Move to project functionality would be implemented here"
          });
          break;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const statusInfo = statusConfig[task.status as keyof typeof statusConfig];
  const priorityInfo = priorityConfig[task.priority as keyof typeof priorityConfig];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="h-full">
      {/* Task Header Card */}
      <Card className="m-6 mb-4 border-0 shadow-none bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-card-foreground mb-3 break-words">
                {task.title}
              </h1>
              <div className="flex flex-wrap gap-3">
                <Badge 
                  className={`${statusInfo.color} border text-sm font-medium px-3 py-1.5 inline-flex items-center gap-2`}
                  variant="outline"
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusInfo.label}
                </Badge>
                <Badge 
                  className={`${priorityInfo.color} border text-sm font-medium px-3 py-1.5 inline-flex items-center gap-2`}
                  variant="outline"
                >
                  <div className={`h-2 w-2 rounded-full ${priorityInfo.indicator}`}></div>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-muted/50 rounded-full">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleQuickAction('edit')} className="gap-3">
                  <Edit className="h-4 w-4" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('duplicate')} className="gap-3">
                  <Copy className="h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('move')} className="gap-3">
                  <Move className="h-4 w-4" />
                  Move to Project
                </DropdownMenuItem>
                <Separator className="my-1" />
                <DropdownMenuItem 
                  onClick={() => handleQuickAction('delete')}
                  className="text-destructive focus:text-destructive gap-3"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {task.description && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Progress Card */}
      {subtaskCount > 0 && (
        <Card className="mx-6 mb-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="font-medium">Progress</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{progress}%</div>
                  <div className="text-xs text-muted-foreground">complete</div>
                </div>
              </div>
              <div className="space-y-2">
                <Progress 
                  value={progress} 
                  className="h-3 bg-muted/50" 
                />
                <p className="text-sm text-muted-foreground flex items-center justify-between">
                  <span>{Math.round((progress / 100) * subtaskCount)} of {subtaskCount} subtasks completed</span>
                  <CheckCircle2 className="h-4 w-4" />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Card */}
      <Card className="mx-6 mb-6">
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            Task Details
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assignee */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium">Assignee</span>
            </div>
            <div className="flex items-center gap-2">
              {assignee ? (
                <>
                  <Avatar className="h-7 w-7 ring-2 ring-primary/10">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {getInitials(assignee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{assignee.name}</span>
                </>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Unassigned
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Due Date */}
          {task.due_date && (
            <>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Due Date</span>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${dueDateStatus?.color || 'text-foreground'}`}>
                    {format(new Date(task.due_date), 'MMM dd, yyyy')}
                  </div>
                  {dueDateStatus?.label && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs mt-1 ${dueDateStatus.color.replace('text-', 'border-').replace('-600', '-200')} ${dueDateStatus.color.replace('text-', 'bg-').replace('-600', '-50')}`}
                    >
                      {dueDateStatus.label}
                    </Badge>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Created */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Created</span>
            </div>
            <span className="font-medium text-sm">
              {format(new Date(task.created_at), 'MMM dd, yyyy')}
            </span>
          </div>

          <Separator />

          {/* Updated */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Last Updated</span>
            </div>
            <span className="font-medium text-sm">
              {format(new Date(task.updated_at), 'MMM dd, yyyy')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}