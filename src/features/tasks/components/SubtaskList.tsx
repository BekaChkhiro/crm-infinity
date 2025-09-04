import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { TaskCard, Task } from '@/features/tasks/components/TaskCard';
import { supabase } from '@/core/config/client';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AddSubtaskDialog } from './AddSubtaskDialog';

interface SubtaskListProps {
  parentTask: Task;
  teamMembers: Array<{ id: string; name: string }>;
  onTaskEdit: (task: Task) => void;
  onTasksChange: () => void;
}

export function SubtaskList({ parentTask, teamMembers, onTaskEdit, onTasksChange }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchSubtasks();
  }, [parentTask.id]);

  useEffect(() => {
    calculateProgress();
  }, [subtasks]);

  const fetchSubtasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', parentTask.id)
        .order('subtask_order', { ascending: true });

      if (error) throw error;
      setSubtasks((data || []) as Task[]);
    } catch (err: any) {
      console.error('Error fetching subtasks:', err);
      toast({
        title: "Error",
        description: "Failed to load subtasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (subtasks.length === 0) {
      setProgress(0);
      return;
    }

    const completedSubtasks = subtasks.filter(task => task.status === 'done').length;
    const progressPercentage = Math.round((completedSubtasks / subtasks.length) * 100);
    setProgress(progressPercentage);
  };

  const handleSubtaskStatusChange = async (taskId: string, status: Task['status']) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      const task = subtasks.find(t => t.id === taskId);
      if (task) {
        await supabase.rpc('log_project_activity', {
          p_project_id: parentTask.project_id,
          p_user_id: user?.id,
          p_activity_type: 'subtask_updated',
          p_description: `Changed subtask "${task.title}" status to ${status}`,
          p_entity_type: 'task',
          p_entity_id: taskId
        });
      }

      fetchSubtasks();
      onTasksChange();

      toast({
        title: "Success",
        description: "Subtask status updated",
      });
    } catch (err: any) {
      console.error('Error updating subtask status:', err);
      toast({
        title: "Error",
        description: "Failed to update subtask status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSubtask = async (taskId: string) => {
    try {
      const task = subtasks.find(t => t.id === taskId);
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      if (task) {
        await supabase.rpc('log_project_activity', {
          p_project_id: parentTask.project_id,
          p_user_id: user?.id,
          p_activity_type: 'subtask_deleted',
          p_description: `Deleted subtask "${task.title}"`,
          p_entity_type: 'task',
          p_entity_id: taskId
        });
      }

      fetchSubtasks();
      onTasksChange();

      toast({
        title: "Success",
        description: "Subtask deleted",
      });
    } catch (err: any) {
      console.error('Error deleting subtask:', err);
      toast({
        title: "Error",
        description: "Failed to delete subtask",
        variant: "destructive"
      });
    }
  };

  if (subtasks.length === 0) {
    return (
      <div className="mt-4 p-4 border border-dashed border-muted rounded-lg">
        <div className="text-center text-muted-foreground">
          <p className="text-sm mb-3">No subtasks yet</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Subtask
          </Button>
        </div>
        
        <AddSubtaskDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          parentTask={parentTask}
          teamMembers={teamMembers}
          onSubtaskCreated={() => {
            fetchSubtasks();
            onTasksChange();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Subtasks Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium p-0 h-auto"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Subtasks ({subtasks.length})
        </Button>
        
        <div className="flex items-center gap-3">
          {progress > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-16 h-2" />
              <Badge variant="secondary" className="text-xs">
                {progress}%
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Subtasks List */}
      {isExpanded && (
        <div className="space-y-2 pl-4 border-l-2 border-muted">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading subtasks...</div>
          ) : (
            subtasks.map((subtask, index) => (
              <div key={subtask.id} className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-3">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <TaskCard
                    task={subtask}
                    onEdit={onTaskEdit}
                    onDelete={handleDeleteSubtask}
                    onStatusChange={handleSubtaskStatusChange}
                    assigneeName={teamMembers.find(m => m.id === subtask.assignee_id)?.name}
                    creatorName={teamMembers.find(m => m.id === subtask.created_by)?.name}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AddSubtaskDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        parentTask={parentTask}
        teamMembers={teamMembers}
        onSubtaskCreated={() => {
          fetchSubtasks();
          onTasksChange();
        }}
      />
    </div>
  );
}