-- Add wants_to_be_beekeeper column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wants_to_be_beekeeper BOOLEAN DEFAULT FALSE;

-- Add contact_organization column to rentals table
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS contact_organization TEXT;

-- Add role column to profiles table for RBAC
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'mattilsynet', 'beekeeper', 'user', 'supplier'));
