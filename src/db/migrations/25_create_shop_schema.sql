-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    category TEXT NOT NULL,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies for products
CREATE POLICY "Public can view active products" ON products
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage products" ON products
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view product images" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'product-images' 
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update product images" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'product-images' 
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete product images" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'product-images' 
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
