export interface Donation {
  id: string;
  fundraiser_id: string;
  amount: number;
  amount_zec: number;
  created_at: string;
}

export interface DonationFeedItem {
  id: string;
  amount_zec: number;
  amount_usd?: number;
  fundraiser_title: string;
  created_at: string;
}

