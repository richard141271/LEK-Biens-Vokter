-- Policy to allow admins to update any profile (e.g., to change roles)
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (
    auth.uid() IN (
        SELECT id FROM profiles WHERE role = 'admin'
    )
);
