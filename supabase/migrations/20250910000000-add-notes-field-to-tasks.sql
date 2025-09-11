-- Add notes field to tasks table
ALTER TABLE public.tasks ADD COLUMN notes TEXT;

-- Create index for better performance on notes field if needed for search
CREATE INDEX idx_tasks_notes ON public.tasks USING gin(to_tsvector('english', notes)) WHERE notes IS NOT NULL;