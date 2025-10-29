-- Add budget field to tasks table
ALTER TABLE public.tasks ADD COLUMN budget NUMERIC(10, 2) DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.tasks.budget IS 'Task budget/cost in the project currency';

-- Create index for better performance on budget field for aggregations
CREATE INDEX idx_tasks_budget ON public.tasks(budget) WHERE budget IS NOT NULL;
