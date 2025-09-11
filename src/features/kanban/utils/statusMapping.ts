import { Task } from '@/features/tasks/components/TaskCard';

interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  color: string;
  status_value?: string;
}

// Default status mapping for backward compatibility
const DEFAULT_STATUS_MAP: { [key: string]: string } = {
  'To Do': 'todo',
  'In Progress': 'in-progress',
  'Review': 'review',
  'Done': 'done'
};

const DEFAULT_COLUMN_MAP: { [key: string]: string } = {
  'todo': 'To Do',
  'in-progress': 'In Progress', 
  'review': 'Review',
  'done': 'Done'
};

export function getStatusFromColumnName(columnName: string, columns: KanbanColumn[]): string {
  // Find the column and use its status_value if available
  const column = columns.find(col => col.name === columnName);
  return column?.status_value || columnName;
}

export function getColumnNameFromStatus(status: string, columns: KanbanColumn[]): string {
  // Find column that maps to this status
  const column = columns.find(col => (col.status_value || col.name) === status);
  return column?.name || status;
}

export function createStatusMapping(columns: KanbanColumn[]): {
  statusToColumn: { [key: string]: string };
  columnToStatus: { [key: string]: string };
} {
  const statusToColumn: { [key: string]: string } = {};
  const columnToStatus: { [key: string]: string } = {};
  
  columns.forEach(column => {
    // Use status_value if available, otherwise fall back to column name
    const statusValue = column.status_value || column.name;
    columnToStatus[column.name] = statusValue;
    statusToColumn[statusValue] = column.name;
  });
  
  return { statusToColumn, columnToStatus };
}

export function getTasksForColumn(
  tasks: Task[], 
  columnName: string, 
  columns: KanbanColumn[]
): Task[] {
  const { columnToStatus } = createStatusMapping(columns);
  const status = columnToStatus[columnName] || getStatusFromColumnName(columnName, columns);
  
  const filteredTasks = tasks.filter(task => task.status === status);
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.debug(`Column "${columnName}" -> status "${status}" -> ${filteredTasks.length} tasks:`, 
      filteredTasks.map(t => `${t.title} (${t.status})`));
  }
  
  return filteredTasks.sort((a, b) => (a.kanban_position || 0) - (b.kanban_position || 0));
}