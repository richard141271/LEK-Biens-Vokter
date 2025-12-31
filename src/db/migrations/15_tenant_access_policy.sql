-- Allow tenants to view apiaries they are renting
CREATE POLICY "Tenants can view linked apiaries"
ON apiaries FOR SELECT
USING (
    id IN (
        SELECT apiary_id 
        FROM rentals 
        WHERE user_id = auth.uid() 
        AND apiary_id IS NOT NULL
    )
);

-- Allow tenants to view hives in apiaries they are renting
CREATE POLICY "Tenants can view linked hives"
ON hives FOR SELECT
USING (
    apiary_id IN (
        SELECT apiary_id 
        FROM rentals 
        WHERE user_id = auth.uid() 
        AND apiary_id IS NOT NULL
    )
);
