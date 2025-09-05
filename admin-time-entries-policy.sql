-- Allow admins to view all time entries
CREATE POLICY "Admins can view all time entries" ON time_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );