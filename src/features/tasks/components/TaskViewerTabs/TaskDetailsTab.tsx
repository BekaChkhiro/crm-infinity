import React, { useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Progress } from '@/shared/components/ui/progress';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Separator } from '@/shared/components/ui/separator';
import { Calendar, Clock, User, FolderOpen, MoreVertical, Trash2, CheckCircle2, AlertCircle, Timer, Target } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { Task } from '../TaskCard';
import { supabase } from '@/core/config/client';
import { useGlobalTaskEdit } from '@/contexts/GlobalTaskEditContext';
import { useToast } from '@/shared/hooks/use-toast';
import { InlineEditableField } from '../InlineEditableField';
import { useTaskAutoSave } from '../../hooks/useTaskAutoSave';

interface TaskDetailsTabProps {
  task: Task;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  projectStatuses?: Array<{ id: string; name: string; color: string }>;
  onTaskUpdate: () => void;
  onTaskDelete?: (taskId: string) => void;
  onClose?: () => void;
}

const statusConfig = {
  'todo': { 
    color: 'bg-muted/50 text-muted-foreground border-muted', 
    icon: <Timer className="h-3.5 w-3.5" />,
    label: 'დაგეგმილი'
  },
  'in-progress': { 
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800', 
    icon: <Target className="h-3.5 w-3.5" />,
    label: 'მიმდინარე'
  },
  'review': { 
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800', 
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    label: 'გადასამოწმებელი'
  },
  'done': { 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800', 
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'დასრულებული'
  },
};

const defaultStatusOptions = [
  { value: 'todo', label: 'დაგეგმილი', icon: <Timer className="h-3 w-3" />, color: 'bg-muted/50 text-muted-foreground border-muted' },
  { value: 'in-progress', label: 'მიმდინარე', icon: <Target className="h-3 w-3" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'review', label: 'გადასამოწმებელი', icon: <AlertCircle className="h-3 w-3" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'done', label: 'დასრულებული', icon: <CheckCircle2 className="h-3 w-3" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
];

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

const priorityOptions = [
  { value: 'low', label: 'დაბალი', icon: <div className="h-2 w-2 rounded-full bg-slate-400"></div>, color: 'bg-slate-50 text-slate-600 border-slate-200' },
  { value: 'medium', label: 'საშუალო', icon: <div className="h-2 w-2 rounded-full bg-blue-500"></div>, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'high', label: 'მაღალი', icon: <div className="h-2 w-2 rounded-full bg-orange-500"></div>, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'critical', label: 'კრიტიკული', icon: <div className="h-2 w-2 rounded-full bg-red-500"></div>, color: 'bg-red-50 text-red-700 border-red-200' }
];

export function TaskDetailsTab({ task, teamMembers, projectStatuses = [], onTaskUpdate, onTaskDelete, onClose }: TaskDetailsTabProps) {
  const { toast } = useToast();
  const { openTaskEdit } = useGlobalTaskEdit();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [localTask, setLocalTask] = useState(task);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Create status options from project statuses or use defaults
  const statusOptions = projectStatuses.length > 0 
    ? projectStatuses.map(status => ({
        value: status.name,
        label: status.name,
        icon: <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />,
        color: `border-2` // Will use inline styles for background color
      }))
    : defaultStatusOptions;
  
  const { saveField, validators, isSaving, lastSaved } = useTaskAutoSave({
    taskId: task.id,
    onTaskUpdate
  });

  // Custom status validator that uses projectStatuses
  const customStatusValidator = (value: string) => {
    if (projectStatuses.length > 0) {
      const validStatuses = projectStatuses.map(s => s.name);
      if (!validStatuses.includes(value)) return 'არასწორი სტატუსი';
    } else {
      // Fallback to default validation
      const validStatuses = ['todo', 'in-progress', 'review', 'done'];
      if (!validStatuses.includes(value)) return 'არასწორი სტატუსი';
    }
    return null;
  };
  
  const assignee = teamMembers.find(member => member.id === localTask.assignee_id);
  
  // Update local task when prop changes
  React.useEffect(() => {
    // Ensure notes field exists with fallback
    const updatedTask = {
      ...task,
      notes: task.notes || null
    };
    setLocalTask(updatedTask);
    console.log('TaskDetailsTab: Updated task data:', updatedTask);
  }, [task]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getDueDateStatus = () => {
    if (!localTask.due_date) return null;
    
    const dueDate = new Date(localTask.due_date);
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    if (isBefore(dueDate, today)) {
      return { status: 'overdue', color: 'text-red-600', label: 'ვადაგადაცილებული' };
    } else if (isBefore(dueDate, tomorrow)) {
      return { status: 'due-today', color: 'text-orange-600', label: 'დღეს უნდა დასრულდეს' };
    } else if (isBefore(dueDate, addDays(today, 3))) {
      return { status: 'due-soon', color: 'text-yellow-600', label: 'მალე უნდა დასრულდეს' };
    }
    return { status: 'normal', color: 'text-muted-foreground', label: '' };
  };
  
  const handleFieldUpdate = (field: string, value: any) => {
    setLocalTask(prev => ({ ...prev, [field]: value }));
  };
  
  const handleEditField = (field: string) => {
    setEditingField(field);
  };
  
  const handleCancelEdit = () => {
    setEditingField(null);
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

  const handleDeleteTask = async () => {
    console.log('handleDeleteTask called for task:', localTask.id);
    console.log('Task details:', {
      id: localTask.id,
      title: localTask.title,
      created_by: localTask.created_by,
      assignee_id: localTask.assignee_id,
      project_id: localTask.project_id
    });
    
    // First, let's check if we can read the task and see current user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);
    console.log('Can user delete this task?', {
      isCreator: localTask.created_by === user?.id,
      isAssignee: localTask.assignee_id === user?.id,
      taskCreatedBy: localTask.created_by,
      currentUser: user?.id
    });

    try {
      // Test if we can select the task first
      const { data: testSelect, error: selectError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', localTask.id)
        .single();
      
      console.log('Can select task?', { data: testSelect, error: selectError });
      
      // Now try to delete
      console.log('Attempting to delete task...');
      const { error, count } = await supabase
        .from('tasks')
        .delete({ count: 'exact' })
        .eq('id', localTask.id);
      
      console.log('Delete result:', { error, count });
      
      if (error) {
        console.error('Database deletion failed:', error);
        throw error;
      }
      
      if (count === 0) {
        console.warn('No rows were deleted - this might indicate permission issues');
        throw new Error('Task could not be deleted - no permission or task not found');
      }
      
      console.log('Direct deletion successful, rows deleted:', count);
      
      toast({
        title: "წარმატება",
        description: "დავალება წარმატებით წაიშლა"
      });
      
      setShowDeleteDialog(false);
      
      // Immediately refresh the parent's task list since we just deleted from DB
      if (onTaskDelete) {
        onTaskDelete(localTask.id);
      }
      
      // Also refresh local data for other components
      onTaskUpdate();
      
      // Close the sidebar after a brief delay to show the refresh happened
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 300);
      }
      
    } catch (error: any) {
      console.error('Delete error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      toast({
        title: "შეცდომა",
        description: `წაშლა ვერ მოხერხდა: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const statusInfo = statusConfig[localTask.status as keyof typeof statusConfig];
  const priorityInfo = priorityConfig[localTask.priority as keyof typeof priorityConfig];

  return (
    <div className="h-full">
      {/* Task Header Card */}
      <Card className="m-6 mb-4 border-0 shadow-none bg-gradient-to-br from-card to-card/50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="mb-3">
                <InlineEditableField
                  type="text"
                  value={localTask.title}
                  isEditing={editingField === 'title'}
                  onChange={(value) => handleFieldUpdate('title', value)}
                  onSave={(value) => saveField('title', value)}
                  onCancel={handleCancelEdit}
                  onEdit={() => handleEditField('title')}
                  placeholder="შეიყვანეთ დავალების სათაური"
                  validator={validators.title}
                  className="text-2xl font-bold leading-tight text-card-foreground break-words"
                  instantSave={true}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <InlineEditableField
                  type="select"
                  value={localTask.status}
                  options={statusOptions}
                  isEditing={editingField === 'status'}
                  onChange={(value) => handleFieldUpdate('status', value)}
                  onSave={(value) => saveField('status', value)}
                  onCancel={handleCancelEdit}
                  onEdit={() => handleEditField('status')}
                  validator={customStatusValidator}
                  instantSave={true}
                />
                <InlineEditableField
                  type="select"
                  value={localTask.priority}
                  options={priorityOptions}
                  isEditing={editingField === 'priority'}
                  onChange={(value) => handleFieldUpdate('priority', value)}
                  onSave={(value) => saveField('priority', value)}
                  onCancel={handleCancelEdit}
                  onEdit={() => handleEditField('priority')}
                  validator={validators.priority}
                  instantSave={true}
                />
              </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-muted/50 rounded-full">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive gap-3"
                >
                  <Trash2 className="h-4 w-4" />
                  წაშლა
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50">
            <InlineEditableField
              type="textarea"
              value={localTask.description}
              isEditing={editingField === 'description'}
              onChange={(value) => handleFieldUpdate('description', value)}
              onSave={(value) => saveField('description', value)}
              onCancel={handleCancelEdit}
              onEdit={() => handleEditField('description')}
              placeholder="შეიყვანეთ დავალების აღწერა"
              validator={validators.description}
              className="text-muted-foreground leading-relaxed"
              instantSave={true}
            />
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <span>შენიშვნები</span>
              </h4>
            </div>
            <InlineEditableField
              type="textarea"
              value={localTask.notes}
              isEditing={editingField === 'notes'}
              onChange={(value) => handleFieldUpdate('notes', value)}
              onSave={(value) => saveField('notes', value)}
              onCancel={handleCancelEdit}
              onEdit={() => handleEditField('notes')}
              placeholder="შეიყვანეთ შენიშვნები ამ დავალებაზე"
              validator={validators.notes}
              className="text-muted-foreground leading-relaxed"
              instantSave={true}
            />
          </div>
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
                  <h3 className="font-medium">პროგრესი</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{progress}%</div>
                  <div className="text-xs text-muted-foreground">დასრულებული</div>
                </div>
              </div>
              <div className="space-y-2">
                <Progress 
                  value={progress} 
                  className="h-3 bg-muted/50" 
                />
                <p className="text-sm text-muted-foreground flex items-center justify-between">
                  <span>{Math.round((progress / 100) * subtaskCount)} {subtaskCount}-დან სუბთასქიდან დასრულებული</span>
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              დავალების დეტალები
            </h3>
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ინახება...
              </div>
            )}
            {lastSaved && !isSaving && (
              <div className="text-xs text-green-600">
                შენახული {format(lastSaved, 'HH:mm')}-ზე
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Assignee */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium">პასუხისმგებელი</span>
            </div>
            <div className="flex-1 flex justify-end">
              <InlineEditableField
                type="user"
                value={localTask.assignee_id}
                teamMembers={teamMembers}
                isEditing={editingField === 'assignee_id'}
                onChange={(value) => handleFieldUpdate('assignee_id', value)}
                onSave={(value) => saveField('assignee_id', value)}
                onCancel={handleCancelEdit}
                onEdit={() => handleEditField('assignee_id')}
                className="max-w-xs"
                instantSave={true}
              />
            </div>
          </div>

          <Separator />

          {/* Due Date */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">დასრულების თარიღი</span>
            </div>
            <div className="flex-1 flex justify-end">
              <InlineEditableField
                type="date"
                value={localTask.due_date}
                isEditing={editingField === 'due_date'}
                onChange={(value) => handleFieldUpdate('due_date', value)}
                onSave={(value) => saveField('due_date', value)}
                onCancel={handleCancelEdit}
                onEdit={() => handleEditField('due_date')}
                validator={validators.due_date}
                className="max-w-xs text-right"
                instantSave={true}
              />
            </div>
          </div>

          <Separator />

          {/* Created */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-medium">შექმნის თარიღი</span>
            </div>
            <span className="font-medium text-sm">
              {format(new Date(localTask.created_at), 'MMM dd, yyyy')}
            </span>
          </div>

          <Separator />

          {/* Updated */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-medium">ბოლო განახლება</span>
            </div>
            <div className="text-right">
              <div className="font-medium text-sm">
                {format(new Date(localTask.updated_at), 'MMM dd, yyyy')}
              </div>
              {lastSaved && (
                <div className="text-xs text-green-600 mt-1">
                  შენახული {format(lastSaved, 'HH:mm')}-ზე
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>დავალების წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              ნამდვილად გსურთ დავალება "{localTask.title}"-ს წაშლა? 
              ეს მოქმედება შეუქცევადია და დავალება სამუდამოდ წაიშლება.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}