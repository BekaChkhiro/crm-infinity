-- Create project_statuses table for custom status management per project
-- This allows each project to have its own set of statuses that drive kanban columns

-- Create the project_statuses table
CREATE TABLE IF NOT EXISTS project_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(7) NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique status names per project
  UNIQUE(project_id, name),
  -- Ensure unique positions per project  
  UNIQUE(project_id, position)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_statuses_project_id ON project_statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_statuses_position ON project_statuses(project_id, position);

-- Add RLS policies
ALTER TABLE project_statuses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view statuses for projects they are members of
CREATE POLICY "Users can view project statuses for their projects" ON project_statuses
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p 
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.created_by = auth.uid() OR pm.user_id = auth.uid()
    )
  );

-- Policy: Project owners and members can insert statuses
CREATE POLICY "Users can insert project statuses for their projects" ON project_statuses
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p 
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.created_by = auth.uid() OR pm.user_id = auth.uid()
    )
  );

-- Policy: Project owners and members can update statuses  
CREATE POLICY "Users can update project statuses for their projects" ON project_statuses
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p 
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.created_by = auth.uid() OR pm.user_id = auth.uid()
    )
  );

-- Policy: Project owners and members can delete statuses
CREATE POLICY "Users can delete project statuses for their projects" ON project_statuses
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p 
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.created_by = auth.uid() OR pm.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_project_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_statuses_updated_at
    BEFORE UPDATE ON project_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_project_statuses_updated_at();

-- Comment on table
COMMENT ON TABLE project_statuses IS 'Custom statuses per project that drive kanban column generation';