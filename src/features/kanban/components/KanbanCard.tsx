import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Calendar, AlertTriangle, DollarSign } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { Task } from './TaskCard';

interface KanbanCardProps {
  task: Task;
  assigneeName?: string;
  onEdit: (task: Task) => void;
  onTaskClick?: (taskId: string) => void;
}

const priorityColors = {
  'low': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  'critical': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

const priorityBorderColors = {
  'low': 'border-l-gray-400',
  'medium': 'border-l-blue-400',
  'high': 'border-l-orange-400',
  'critical': 'border-l-red-400',
};

export function KanbanCard({ task, assigneeName, onEdit, onTaskClick }: KanbanCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getDueDateStatus = () => {
    if (!task.due_date) return null;
    
    const dueDate = new Date(task.due_date);
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    if (isBefore(dueDate, today)) {
      return { status: 'overdue', color: 'text-red-600' };
    } else if (isBefore(dueDate, tomorrow)) {
      return { status: 'due-today', color: 'text-orange-600' };
    } else if (isBefore(dueDate, addDays(today, 3))) {
      return { status: 'due-soon', color: 'text-yellow-600' };
    }
    return { status: 'normal', color: 'text-muted-foreground' };
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <Card 
      className={`w-full cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 ${priorityBorderColors[task.priority]} bg-card hover:bg-accent/5`}
      onClick={() => onTaskClick ? onTaskClick(task.id) : onEdit(task)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <CardContent className="p-4 space-y-3">
        <div>
          <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className={`text-xs ${priorityColors[task.priority]}`}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Badge>
          
          {assigneeName && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(assigneeName)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {task.due_date && (
            <div className={`flex items-center text-xs ${dueDateStatus?.color || 'text-muted-foreground'}`}>
              {dueDateStatus?.status === 'overdue' && (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              <Calendar className="h-3 w-3 mr-1" />
              <span>
                {dueDateStatus?.status === 'overdue' && 'Overdue: '}
                {dueDateStatus?.status === 'due-today' && 'Due today: '}
                {format(new Date(task.due_date), 'MMM dd')}
              </span>
            </div>
          )}

          <div className="flex items-center text-xs ml-auto">
            <DollarSign className={`h-3 w-3 mr-1 ${task.budget && task.budget > 0 ? 'text-green-600' : 'text-muted-foreground'}`} />
            <span className={`font-mono font-semibold ${task.budget && task.budget > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
              ₾{task.budget ? task.budget.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}