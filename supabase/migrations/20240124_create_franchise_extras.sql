-- Create Franchise FAQs table
CREATE TABLE IF NOT EXISTS franchise_faqs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Franchise Messages table (Simple internal ticketing)
CREATE TABLE IF NOT EXISTS franchise_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchise_id UUID REFERENCES franchise_units(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    recipient_role TEXT DEFAULT 'admin', -- admin, franchisee
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    parent_id UUID REFERENCES franchise_messages(id) -- For threading
);

-- Enable RLS
ALTER TABLE franchise_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_messages ENABLE ROW LEVEL SECURITY;

-- Policies for FAQs
CREATE POLICY "Everyone can read active FAQs" ON franchise_faqs
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage FAQs" ON franchise_faqs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Policies for Messages
-- Admins can view all messages
CREATE POLICY "Admins can view all franchise messages" ON franchise_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can reply to messages" ON franchise_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Franchisees can view their own unit's messages
CREATE POLICY "Franchisees can view own messages" ON franchise_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM franchise_units 
            WHERE id = franchise_messages.franchise_id 
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Franchisees can send messages" ON franchise_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM franchise_units 
            WHERE id = franchise_messages.franchise_id 
            AND owner_id = auth.uid()
        )
    );

-- Seed FAQs
INSERT INTO franchise_faqs (question, answer, category) VALUES
('Hvordan bestiller jeg flere varer?', 'Du bestiller varer via nettbutikken i dashboardet. Husk å logge inn med din franchise-bruker for å få riktige priser.', 'Drift'),
('Når må ukesrapporten leveres?', 'Ukesrapporten skal leveres senest søndag kl 23:59 hver uke.', 'Rapportering'),
('Hva gjør jeg hvis jeg finner død bi?', 'Dette er normalt. Men hvis du ser mange døde bier utenfor kuben, ta bilde og send til oss via "Kontakt systemeier".', 'Birøkt'),
('Kan jeg bruke egne bilder på Facebook?', 'Ja, men de må følge retningslinjene i Profilmanualen. Vi anbefaler å bruke bildene fra bildebanken.', 'Markedsføring');
