-- Add status mapping field to kanban_columns table
-- This allows manual control over which status each column maps to

-- Add status_value column to store the actual status that tasks in this column will have
-- Only add if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kanban_columns' 
        AND column_name = 'status_value'
    ) THEN
        ALTER TABLE kanban_columns 
        ADD COLUMN status_value VARCHAR(100) DEFAULT NULL;
    END IF;
END $$;

-- Update existing columns with default status mappings
-- This preserves current behavior while enabling customization
UPDATE kanban_columns 
SET status_value = CASE 
  WHEN name = 'To Do' THEN 'To Do'
  WHEN name = 'In Progress' THEN 'In Progress'  
  WHEN name = 'Review' THEN 'Review'
  WHEN name = 'Done' THEN 'Done'
  ELSE name -- For custom columns, default to column name
END;

-- Make status_value NOT NULL after setting defaults (only if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kanban_columns' 
        AND column_name = 'status_value'
    ) THEN
        ALTER TABLE kanban_columns 
        ALTER COLUMN status_value SET NOT NULL;
    END IF;
END $$;

-- Add constraint to ensure status_value is not empty (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'kanban_columns_status_value_not_empty' 
        AND conrelid = 'kanban_columns'::regclass
    ) THEN
        ALTER TABLE kanban_columns 
        ADD CONSTRAINT kanban_columns_status_value_not_empty 
        CHECK (LENGTH(trim(status_value)) > 0);
    END IF;
END $$;

-- Comment explaining the field
COMMENT ON COLUMN kanban_columns.status_value IS 'The status value that tasks in this column will have - allows manual mapping control';