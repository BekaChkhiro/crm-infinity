import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { MoreVertical, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { KanbanCard } from './KanbanCard';
import { Task } from './TaskCard';

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color: string;
}

interface KanbanColumnProps {
  column: KanbanColumnData;
  tasks: Task[];
  teamMembers: Array<{ id: string; name: string }>;
  onTaskEdit: (task: Task) => void;
  onTaskMove: (taskId: string, columnId: string) => void;
  onCreateTask: (columnId: string) => void;
  onTaskClick?: (taskId: string) => void;
}

export function KanbanColumn({ 
  column, 
  tasks, 
  teamMembers, 
  onTaskEdit, 
  onTaskMove, 
  onCreateTask,
  onTaskClick 
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskMove(taskId, column.id);
    }
  };

  return (
    <div className="flex flex-col h-full min-w-[300px] w-80">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: column.color }}
              />
              <CardTitle className="text-sm font-medium">{column.name}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {tasks.length}
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => onCreateTask(column.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit Column</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Delete Column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent 
          className={`flex-1 space-y-3 p-3 transition-colors ${
            isDragOver ? 'bg-accent/20' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              assigneeName={teamMembers.find(m => m.id === task.assignee_id)?.name}
              onEdit={onTaskEdit}
              onTaskClick={onTaskClick}
            />
          ))}
          
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="text-sm text-center">
                <p>No tasks in this column</p>
                <p className="text-xs mt-1">Drag tasks here or create new ones</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}