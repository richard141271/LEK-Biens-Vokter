-- Create Franchise Units table
CREATE TABLE IF NOT EXISTS franchise_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    org_number TEXT,
    address TEXT,
    owner_id UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'active', -- active, inactive, pending
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Franchise Documents table
CREATE TABLE IF NOT EXISTS franchise_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- manual, agreement, recipe, resource
    category TEXT, -- driftsmanual, salgsopplæring, profilmanual, etc.
    content_url TEXT, -- PDF or video URL
    version TEXT DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Signatures/Acknowledgments table
CREATE TABLE IF NOT EXISTS franchise_signatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES franchise_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    signature_data TEXT, -- digital signature string or IP
    status TEXT DEFAULT 'signed',
    UNIQUE(document_id, user_id)
);

-- Create Weekly Reports table
CREATE TABLE IF NOT EXISTS franchise_weekly_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchise_units(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    year INTEGER NOT NULL,
    data JSONB DEFAULT '{}'::jsonb, -- Store form answers here
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_by UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'submitted'
);

-- Enable RLS
ALTER TABLE franchise_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Franchise Units
-- Admins can see all units
CREATE POLICY "Admins can view all franchise units" ON franchise_units
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Owners can see their own unit
CREATE POLICY "Owners can view their own franchise unit" ON franchise_units
    FOR SELECT USING (
        owner_id = auth.uid()
    );

-- Admins can insert/update units
CREATE POLICY "Admins can manage franchise units" ON franchise_units
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Franchise Documents
-- Everyone can read active documents (refined later based on role if needed)
CREATE POLICY "Authenticated users can view active documents" ON franchise_documents
    FOR SELECT USING (
        is_active = true
    );

-- Admins can manage documents
CREATE POLICY "Admins can manage documents" ON franchise_documents
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Signatures
-- Users can see their own signatures
CREATE POLICY "Users can view own signatures" ON franchise_signatures
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Users can insert their own signatures
CREATE POLICY "Users can sign documents" ON franchise_signatures
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- Admins can view all signatures
CREATE POLICY "Admins can view all signatures" ON franchise_signatures
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Weekly Reports
-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON franchise_weekly_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Franchisees can view/insert their own reports (linked via franchise_id owner)
CREATE POLICY "Franchisees can view their unit reports" ON franchise_weekly_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM franchise_units 
            WHERE id = franchise_weekly_reports.franchise_id 
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Franchisees can insert reports" ON franchise_weekly_reports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM franchise_units 
            WHERE id = franchise_weekly_reports.franchise_id 
            AND owner_id = auth.uid()
        )
    );
