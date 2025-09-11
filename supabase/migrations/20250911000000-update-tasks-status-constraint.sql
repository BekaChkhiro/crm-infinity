-- Remove restrictive status constraint to allow custom statuses
-- Status values will now be the same as kanban column names (1:1 mapping)

-- Drop existing constraints that limit status values
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_not_empty;

-- Add a simple non-empty constraint
ALTER TABLE tasks ADD CONSTRAINT tasks_status_not_empty 
CHECK (status IS NOT NULL AND LENGTH(trim(status)) > 0);

-- Update existing tasks to use column names as status values
-- Map old status values to proper column names
UPDATE tasks 
SET status = CASE 
  WHEN status = 'todo' THEN 'To Do'
  WHEN status = 'in-progress' THEN 'In Progress'
  WHEN status = 'review' THEN 'Review'
  WHEN status = 'done' THEN 'Done'
  ELSE status -- Keep any existing custom values
END;

-- Comment explaining the change
COMMENT ON COLUMN tasks.status IS 'Task status - matches kanban column names exactly for 1:1 mapping';