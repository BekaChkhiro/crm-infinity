import React from 'react';
import { TaskComments } from '../TaskComments';

interface CommentsTabProps {
  taskId: string;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
}

export function CommentsTab({ taskId, teamMembers }: CommentsTabProps) {
  // Create a mock task object since TaskComments expects a full Task object
  const mockTask = {
    id: taskId,
    title: '',
    description: null,
    status: 'todo' as const,
    priority: 'medium' as const,
    assignee_id: null,
    created_by: '',
    due_date: null,
    created_at: '',
    updated_at: '',
    project_id: '',
    kanban_position: null,
    kanban_column: null,
    parent_task_id: null,
    is_subtask: false,
    subtask_order: null
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <TaskComments
          task={mockTask}
          teamMembers={teamMembers}
          isOpen={true}
          onClose={() => {}} // This won't be used since we're embedded
        />
      </div>
    </div>
  );
}