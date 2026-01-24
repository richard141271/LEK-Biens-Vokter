-- Training Progress Tracking
CREATE TABLE IF NOT EXISTS franchise_training_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    video_id UUID REFERENCES franchise_documents(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'started', -- started, completed
    progress_percent INTEGER DEFAULT 0,
    last_watched_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE franchise_training_progress ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own training progress" ON franchise_training_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own training progress" ON franchise_training_progress
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all training progress" ON franchise_training_progress
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Seed some training videos
INSERT INTO franchise_documents (title, description, type, category, version, content_url, is_active)
VALUES 
(
    'Introduksjon til Salg',
    'Grunnleggende salgsteknikker for LEK-produkter.',
    'video',
    'training',
    '1.0',
    'https://www.youtube.com/embed/dQw4w9WgXcQ', -- Placeholder
    true
),
(
    'Mersalg i Butikk',
    'Hvordan øke snittsalget per kunde.',
    'video',
    'training',
    '1.0',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    true
),
(
    'Produktdemonstrasjon',
    'Lær å demonstrere honning og bivoks for kunder.',
    'video',
    'training',
    '1.0',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    true
);
