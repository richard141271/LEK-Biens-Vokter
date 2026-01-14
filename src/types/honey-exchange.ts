export type HoneyType = 'Lynghonning' | 'Sommerhonning' | 'Raps' | 'Bringebær' | 'Skogshonning' | 'Annet';

export interface HoneyListing {
  id: string;
  seller_id: string;
  honey_type: HoneyType;
  amount_kg: number;
  remaining_kg: number; // Added to track partial sales
  price_per_kg: number;
  moisture_percentage: number;
  production_year: number;
  location: string;
  description?: string;
  status: 'active' | 'sold' | 'pending';
  created_at: string;
  seller_name?: string; // Joined from profiles
  seller_city?: string; // Joined from profiles
  keeper_id?: string; // The physical holder (if different from seller)
  currency?: 'NOK' | 'HC';
}

export interface HoneyTransaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_kg: number;
  total_price: number;
  currency?: 'NOK' | 'HC';
  status: 'pending_payment' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'resold';
  created_at: string;
  listing?: HoneyListing;
  seller?: { full_name: string; city: string; phone_number: string; private_bank_account?: string; company_bank_account?: string; };
  buyer?: { full_name: string; address: string; postal_code: string; city: string; phone_number: string; };
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal' | 'purchase' | 'sale' | 'referral_bonus';
  reference_id?: string;
  description: string;
  created_at: string;
}
