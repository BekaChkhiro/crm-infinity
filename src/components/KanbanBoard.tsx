import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AdvancedTaskFilters, TaskFilters } from './AdvancedTaskFilters';
import { KanbanColumn } from './KanbanColumn';
import { Task } from './TaskCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color: string;
  project_id: string;
}

interface KanbanBoardProps {
  projectId: string;
  tasks: Task[];
  teamMembers: Array<{ id: string; name: string }>;
  onTaskEdit: (task: Task) => void;
  onCreateTask: () => void;
  onTasksChange: () => void;
  onTaskClick?: (taskId: string) => void;
}

export function KanbanBoard({ 
  projectId, 
  tasks, 
  teamMembers, 
  onTaskEdit, 
  onCreateTask, 
  onTasksChange,
  onTaskClick 
}: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    assignees: [],
    priorities: [],
    statuses: [],
    dateRange: { from: null, to: null },
    tags: [],
    hasFiles: null,
    hasComments: null,
    overdue: null,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchColumns();
  }, [projectId]);

  const fetchColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (error) throw error;
      setColumns(data || []);
    } catch (err: any) {
      console.error('Error fetching columns:', err);
      toast({
        title: "Error",
        description: "Failed to load kanban columns",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskMove = async (taskId: string, columnId: string) => {
    try {
      // Find the target column
      const targetColumn = columns.find(col => col.id === columnId);
      if (!targetColumn) return;

      // Map column ID to status
      const statusMap: { [key: string]: Task['status'] } = {
        'To Do': 'todo',
        'In Progress': 'in-progress',
        'Review': 'review',
        'Done': 'done'
      };

      const newStatus = statusMap[targetColumn.name] || 'todo';

      // Update the task in the database
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          kanban_column: targetColumn.name.toLowerCase().replace(' ', '-'),
          kanban_position: 0
        })
        .eq('id', taskId);

      if (error) throw error;

      // Refresh tasks
      onTasksChange();
      
      toast({
        title: "Success",
        description: "Task moved successfully",
      });
    } catch (err: any) {
      console.error('Error moving task:', err);
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive"
      });
    }
  };

  // Filter tasks based on advanced filters, excluding sub-tasks
  const filteredTasks = tasks.filter(task => {
    // Exclude sub-tasks from the Kanban view
    if (task.is_subtask || task.parent_task_id) {
      return false;
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    // Assignee filter
    if (filters.assignees.length > 0) {
      const matchesAssignee = filters.assignees.some(assigneeId => 
        assigneeId === 'unassigned' ? !task.assignee_id : task.assignee_id === assigneeId
      );
      if (!matchesAssignee) return false;
    }
    
    // Priority filter
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(task.priority)) return false;
    }
    
    // Status filter
    if (filters.statuses.length > 0) {
      if (!filters.statuses.includes(task.status)) return false;
    }
    
    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      if (filters.dateRange.from && taskDate < filters.dateRange.from) return false;
      if (filters.dateRange.to && taskDate > filters.dateRange.to) return false;
    }
    
    // Overdue filter
    if (filters.overdue === true) {
      if (!task.due_date) return false;
      const now = new Date();
      const dueDate = new Date(task.due_date);
      if (dueDate >= now) return false;
    }
    
    return true;
  });

  // Group tasks by column
  const getTasksForColumn = (columnName: string) => {
    const statusMap: { [key: string]: Task['status'] } = {
      'To Do': 'todo',
      'In Progress': 'in-progress',
      'Review': 'review',
      'Done': 'done'
    };
    
    const status = statusMap[columnName];
    return filteredTasks
      .filter(task => task.status === status)
      .sort((a, b) => (a.kanban_position || 0) - (b.kanban_position || 0));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading kanban board...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1">
          <AdvancedTaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            teamMembers={teamMembers}
          />
        </div>
        
        <Button onClick={onCreateTask}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex space-x-6 pb-6 min-h-[600px]">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={getTasksForColumn(column.name)}
              teamMembers={teamMembers}
              onTaskEdit={onTaskEdit}
              onTaskMove={handleTaskMove}
              onCreateTask={onCreateTask}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}