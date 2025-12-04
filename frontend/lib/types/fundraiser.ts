export interface Cause {
  id: string;
  user_id: string;
  created_at: string;
  trust_score: number;
  title: string;
  display_name: string;
  short_description: string;
  long_description: string;
  image_url: string;
  website_url: string;
  social_links: string[];
  tags: string[];
  wallet_address: string;
  preferred_chain: string;
  preferred_token: string;
  amount_raised: number;
  goal_amount: number;
  country: string;
  city: string;
  match_score?: number;
  activated: boolean;
}

export interface TrustReport {
  fundraiser_id: string;
  trust_score: number;
  last_updated: string;
  report: {
    score: number;
    flags: string[];
  };
}

export interface FundraiserUpdate {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export interface CreateFundraiserPayload {
  title: string;
  display_name: string;
  short_description?: string;
  long_description?: string;
  goal_amount?: number;
  preferred_chain: string;
  preferred_token: string;
  wallet_address?: string;
  country?: string;
  city?: string;
  website_url?: string;
  social_links_json?: string;
  tags_json?: string;
  image?: File;
}

export interface Token {
  assetId: string;
  blockchain: string;
  symbol: string;
  contractAddress: string | null;
}

