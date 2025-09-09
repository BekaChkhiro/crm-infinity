-- Create task_attachments table for file attachments
CREATE TABLE public.task_attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for task_attachments
CREATE POLICY "Users can view task attachments from their projects" 
ON public.task_attachments 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.tasks 
        JOIN public.project_members ON tasks.project_id = project_members.project_id
        WHERE tasks.id = task_attachments.task_id 
        AND project_members.user_id = auth.uid()
    ) OR is_admin(auth.uid())
);

CREATE POLICY "Users can upload attachments to tasks in their projects" 
ON public.task_attachments 
FOR INSERT 
WITH CHECK (
    (EXISTS (
        SELECT 1 FROM public.tasks 
        JOIN public.project_members ON tasks.project_id = project_members.project_id
        WHERE tasks.id = task_attachments.task_id 
        AND project_members.user_id = auth.uid()
    ) OR is_admin(auth.uid()))
    AND auth.uid() = uploaded_by
);

CREATE POLICY "Users can delete their own task attachments" 
ON public.task_attachments 
FOR DELETE 
USING (
    auth.uid() = uploaded_by OR is_admin(auth.uid())
);

-- Add indexes for better performance
CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by);

-- Enable realtime for task_attachments
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_attachments;