export type HoneyType = 'Lynghonning' | 'Sommerhonning' | 'Raps' | 'Bringebær' | 'Skogshonning' | 'Annet';

export interface HoneyListing {
  id: string;
  seller_id: string;
  honey_type: HoneyType;
  amount_kg: number;
  price_per_kg: number;
  moisture_percentage: number;
  production_year: number;
  location: string;
  description?: string;
  status: 'active' | 'sold' | 'pending';
  created_at: string;
  seller_name?: string; // Joined from profiles
  seller_city?: string; // Joined from profiles
}

export interface HoneyBid {
  id: string;
  listing_id: string;
  bidder_id: string;
  amount: number;
  created_at: string;
  bidder_name?: string;
}
