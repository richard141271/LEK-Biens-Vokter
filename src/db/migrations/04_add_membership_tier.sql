-- Add membership_tier to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'free';
-- Valid values: 'free', 'bronze', 'gold'

-- Function to check tier eligibility for commissions
-- (This logic will be handled in the UI for now to show 'missed earnings', 
-- but eventually we can enforce it in the payout trigger)
