import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Plus, Settings, GripVertical, Cog } from 'lucide-react';
import { AdvancedTaskFilters, TaskFilters } from '@/features/tasks/components/AdvancedTaskFilters';
import { KanbanColumn } from './KanbanColumn';
import { KanbanColumnForm } from './KanbanColumnForm';
import { ColumnSettingsDialog } from './ColumnSettingsDialog';
import { StatusManagement } from '@/features/project/components/StatusManagement';
import { Task } from '@/features/tasks/components/TaskCard';
import { supabase } from '@/core/config/client';
import { useToast } from '@/shared/hooks/use-toast';
import { createStatusMapping, getStatusFromColumnName, getTasksForColumn } from '../utils/statusMapping';

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color: string;
  project_id: string;
  status_value?: string;
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
  const [columnFormOpen, setColumnFormOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnData | null>(null);
  const [isDraggingColumn, setIsDraggingColumn] = useState(false);
  const [dragOverColumnIndex, setDragOverColumnIndex] = useState<number | null>(null);
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
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [statusManagementOpen, setStatusManagementOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchColumns();
  }, [projectId]); // fetchColumns is stable since it only depends on projectId

  const fetchColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // If no columns exist, generate them from project statuses
        await generateColumnsFromStatuses();
      } else {
        setColumns(data || []);
      }
    } catch (err: unknown) {
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

  const generateColumnsFromStatuses = async () => {
    try {
      // First, try to get project statuses
      const { data: statusData, error: statusError } = await supabase
        .from('project_statuses')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      let statusesToUse = statusData || [];

      // If no custom statuses exist, use defaults
      if (!statusData || statusData.length === 0) {
        statusesToUse = [
          { name: 'To Do', color: '#6b7280', position: 0 },
          { name: 'In Progress', color: '#0ea5e9', position: 1 },
          { name: 'Review', color: '#f59e0b', position: 2 },
          { name: 'Done', color: '#22c55e', position: 3 }
        ];
      }

      // Delete existing columns for this project
      await supabase
        .from('kanban_columns')
        .delete()
        .eq('project_id', projectId);

      // Create new columns based on statuses
      const columnsToCreate = statusesToUse.map((status, index) => ({
        project_id: projectId,
        name: status.name,
        position: status.position || index,
        color: status.color || '#6b7280',
        status_value: status.name // Status value matches the status name
      }));

      const { data: newColumns, error: insertError } = await supabase
        .from('kanban_columns')
        .insert(columnsToCreate)
        .select('*');

      if (insertError) throw insertError;

      setColumns(newColumns || []);
      
      toast({
        title: "წარმატება",
        description: "კოლუმნები ავტომატურად შეიქმნა სტატუსების მიხედვით"
      });
    } catch (err: unknown) {
      console.error('Error generating columns from statuses:', err);
      toast({
        title: "შეცდომა",
        description: "კოლუმნების შექმნა ვერ მოხერხდა",
        variant: "destructive"
      });
    }
  };

  const handleTaskMove = async (taskId: string, columnId: string) => {
    try {
      // Find the target column
      const targetColumn = columns.find(col => col.id === columnId);
      if (!targetColumn) return;

      // Use the column's status_value if available, otherwise column name
      const newStatus = targetColumn.status_value || targetColumn.name;

      // Update the task in the database
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
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
    } catch (err: unknown) {
      console.error('Error moving task:', err);
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive"
      });
    }
  };

  const handleEditColumn = (column: KanbanColumnData) => {
    setEditingColumn(column);
    setColumnFormOpen(true);
  };

  const handleDeleteColumn = async (columnId: string) => {
    // Check if column has tasks
    const targetColumn = columns.find(col => col.id === columnId);
    if (!targetColumn) return;

    const tasksInColumn = getTasksForColumn(tasks, targetColumn.name, columns);

    if (tasksInColumn.length > 0) {
      toast({
        title: "Cannot delete column",
        description: `This column contains ${tasksInColumn.length} task(s). Move them to another column first.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Column deleted successfully"
      });

      fetchColumns();
    } catch (err: unknown) {
      console.error('Error deleting column:', err);
      toast({
        title: "Error",
        description: "Failed to delete column",
        variant: "destructive"
      });
    }
  };

  const openCreateColumnForm = () => {
    setEditingColumn(null);
    setColumnFormOpen(true);
  };

  const handleColumnFormSuccess = () => {
    fetchColumns();
  };

  const handleColumnDragStart = (e: React.DragEvent, column: KanbanColumnData) => {
    setIsDraggingColumn(true);
    e.dataTransfer.setData('column/id', column.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragEnd = () => {
    setIsDraggingColumn(false);
    setDragOverColumnIndex(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnIndex(index);
  };

  const handleColumnDragLeave = () => {
    setDragOverColumnIndex(null);
  };

  const handleColumnDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverColumnIndex(null);
    setIsDraggingColumn(false);

    const draggedColumnId = e.dataTransfer.getData('column/id');
    const draggedColumnIndex = columns.findIndex(col => col.id === draggedColumnId);
    
    if (draggedColumnIndex === -1 || draggedColumnIndex === targetIndex) return;

    // Create new column order
    const newColumns = [...columns];
    const [draggedColumn] = newColumns.splice(draggedColumnIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn);

    // Update positions based on new order
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      position: index
    }));

    // Optimistically update UI
    setColumns(updatedColumns);

    // Update database
    try {
      const updates = updatedColumns.map(col => ({
        id: col.id,
        position: col.position
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('kanban_columns')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Column order updated successfully"
      });
    } catch (err: unknown) {
      console.error('Error updating column positions:', err);
      toast({
        title: "Error",
        description: "Failed to update column order",
        variant: "destructive"
      });
      // Revert on error
      fetchColumns();
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

  // Group tasks by column using utility function
  const getFilteredTasksForColumn = (columnName: string) => {
    return getTasksForColumn(filteredTasks, columnName, columns);
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
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStatusManagementOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            სტატუსების მართვა
          </Button>
          <Button variant="outline" onClick={() => setColumnSettingsOpen(true)}>
            <Cog className="h-4 w-4 mr-2" />
            Column Settings
          </Button>
          <Button variant="outline" onClick={openCreateColumnForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Column
          </Button>
          <Button onClick={onCreateTask}>
            <Plus className="h-4 w-4 mr-2" />
            ახალი დავალება
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex space-x-6 pb-6 min-h-[600px]">
          {columns.map((column, index) => (
            <div
              key={column.id}
              className={`relative transition-all duration-200 ${
                dragOverColumnIndex === index ? 'scale-105 opacity-80' : ''
              }`}
              onDragOver={(e) => handleColumnDragOver(e, index)}
              onDragLeave={handleColumnDragLeave}
              onDrop={(e) => handleColumnDrop(e, index)}
            >
              <KanbanColumn
                column={column}
                tasks={getFilteredTasksForColumn(column.name)}
                teamMembers={teamMembers}
                onTaskEdit={onTaskEdit}
                onTaskMove={handleTaskMove}
                onCreateTask={onCreateTask}
                onTaskClick={onTaskClick}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                isDragging={isDraggingColumn}
                onColumnDragStart={handleColumnDragStart}
                onColumnDragEnd={handleColumnDragEnd}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Column Form Modal */}
      <KanbanColumnForm
        open={columnFormOpen}
        onOpenChange={setColumnFormOpen}
        column={editingColumn}
        projectId={projectId}
        onSuccess={handleColumnFormSuccess}
        maxPosition={Math.max(0, ...columns.map(c => c.position))}
      />

      {/* Column Settings Dialog */}
      <ColumnSettingsDialog
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        projectId={projectId}
        onSuccess={() => {
          fetchColumns();
          onTasksChange();
        }}
      />

      {/* Status Management Dialog */}
      <StatusManagement
        open={statusManagementOpen}
        onOpenChange={setStatusManagementOpen}
        projectId={projectId}
        onSuccess={() => {
          generateColumnsFromStatuses();
          onTasksChange();
        }}
      />
    </div>
  );
}