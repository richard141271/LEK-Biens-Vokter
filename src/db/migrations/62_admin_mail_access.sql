-- Grant Admin full access to mail_messages and mail_folders

-- Policy for mail_messages
DROP POLICY IF EXISTS "Users can view their own messages" ON mail_messages;
CREATE POLICY "Users can view their own messages" ON mail_messages
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
        )
    );

-- Policy for mail_folders (update existing ones or create new)
-- We already created some in 61, let's just ensure admin access

DROP POLICY IF EXISTS "Users can view their own folders" ON mail_folders;
CREATE POLICY "Users can view their own folders" ON mail_folders
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
        )
    );

DROP POLICY IF EXISTS "Users can insert their own folders" ON mail_folders;
CREATE POLICY "Users can insert their own folders" ON mail_folders
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
        )
    );

DROP POLICY IF EXISTS "Users can update their own folders" ON mail_folders;
CREATE POLICY "Users can update their own folders" ON mail_folders
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
        )
    );

DROP POLICY IF EXISTS "Users can delete their own folders" ON mail_folders;
CREATE POLICY "Users can delete their own folders" ON mail_folders
    FOR DELETE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
        )
    );
