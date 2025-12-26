-- Add MLM fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_commercial_beekeeper BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mlm_agreement_signed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'active'; -- active, inactive (mocking payment status)

-- Function to generate random referral code
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign referral code on profile creation
CREATE OR REPLACE FUNCTION set_referral_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_referral_code ON profiles;
CREATE TRIGGER trigger_set_referral_code
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_referral_code();

-- Commission/Earnings Tracking
CREATE TABLE IF NOT EXISTS commissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    beneficiary_id UUID REFERENCES profiles(id), -- Who gets the money
    source_user_id UUID REFERENCES profiles(id), -- Who generated the money (downline)
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'NOK',
    type TEXT NOT NULL, -- 'membership_bonus' or 'sales_commission'
    level INTEGER NOT NULL, -- 1, 2, or 3
    description TEXT,
    status TEXT DEFAULT 'pending', -- pending, paid
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View to calculate monthly projected earnings
CREATE OR REPLACE VIEW view_mlm_monthly_projection AS
WITH RECURSIVE downline AS (
    -- Level 1
    SELECT 
        id as user_id, 
        referrer_id as upline_id, 
        1 as level
    FROM profiles
    WHERE referrer_id IS NOT NULL
    
    UNION ALL
    
    -- Level 2 and 3
    SELECT 
        p.id, 
        d.upline_id, 
        d.level + 1
    FROM profiles p
    JOIN downline d ON p.referrer_id = d.user_id
    WHERE d.level < 3
)
SELECT 
    upline_id as user_id,
    COUNT(CASE WHEN level = 1 THEN 1 END) as level_1_count,
    COUNT(CASE WHEN level = 2 THEN 1 END) as level_2_count,
    COUNT(CASE WHEN level = 3 THEN 1 END) as level_3_count,
    (COUNT(CASE WHEN level = 1 THEN 1 END) * 50) +
    (COUNT(CASE WHEN level = 2 THEN 1 END) * 30) +
    (COUNT(CASE WHEN level = 3 THEN 1 END) * 10) as estimated_monthly_earnings
FROM downline
GROUP BY upline_id;

-- Enable RLS
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own commissions" ON commissions
    FOR SELECT USING (auth.uid() = beneficiary_id);

-- Sales Commission Trigger
CREATE OR REPLACE FUNCTION process_mlm_sales_commission() RETURNS TRIGGER AS $$
DECLARE
    seller_upline_1 UUID;
    seller_upline_2 UUID;
    seller_upline_3 UUID;
    commission_amount NUMERIC;
BEGIN
    -- Only process if status changed to paid/completed
    IF NEW.status IN ('paid', 'completed') AND OLD.status NOT IN ('paid', 'completed') THEN
        
        -- 1% of total price
        commission_amount := NEW.total_price * 0.01;

        -- Find Upline 1
        SELECT referrer_id INTO seller_upline_1 FROM profiles WHERE id = NEW.seller_id;
        
        IF seller_upline_1 IS NOT NULL THEN
            INSERT INTO commissions (beneficiary_id, source_user_id, amount, type, level, description, status)
            VALUES (seller_upline_1, NEW.seller_id, commission_amount, 'sales_commission', 1, '1% provisjon fra nivå 1 salg', 'pending');

            -- Find Upline 2
            SELECT referrer_id INTO seller_upline_2 FROM profiles WHERE id = seller_upline_1;
            
            IF seller_upline_2 IS NOT NULL THEN
                INSERT INTO commissions (beneficiary_id, source_user_id, amount, type, level, description, status)
                VALUES (seller_upline_2, NEW.seller_id, commission_amount, 'sales_commission', 2, '1% provisjon fra nivå 2 salg', 'pending');

                -- Find Upline 3
                SELECT referrer_id INTO seller_upline_3 FROM profiles WHERE id = seller_upline_2;
                
                IF seller_upline_3 IS NOT NULL THEN
                    INSERT INTO commissions (beneficiary_id, source_user_id, amount, type, level, description, status)
                    VALUES (seller_upline_3, NEW.seller_id, commission_amount, 'sales_commission', 3, '1% provisjon fra nivå 3 salg', 'pending');
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mlm_sales_commission ON honey_transactions;
CREATE TRIGGER trigger_mlm_sales_commission
    AFTER UPDATE ON honey_transactions
    FOR EACH ROW
    EXECUTE FUNCTION process_mlm_sales_commission();
