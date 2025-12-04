export interface ChatPayload {
  message?: string;
  session_id: string;
  refund_address?: string;
  user_interests: string[];
  verify_donation?: boolean;
  cause_id?: string;
  update_shielded_address?: boolean;
}

export type SSEEventType =
  | 'status'
  | 'step'
  | 'content'
  | 'verification'
  | 'cause_list_with_summary'
  | 'payment_status'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  message?: string;
  content?: string | object;
  node?: string;
  proof?: VerificationProof;
  causes?: Cause[];
  summary?: string;
  total_found?: number;
  status?: string;
  error?: {
    error_type: string;
    message?: string;
  };
  step?: string;
}

export interface VerificationProof {
  type: 'verification_proof';
  node: string;
  chat_id: string;
  request_hash: string;
  response_hash: string;
  verified: boolean;
  signing_address: string;
  recovered_address: string;
  signature: string;
  signing_algo: string;
  text_matches: boolean;
  signature_valid: boolean;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'verification' | 'error';
  content: string | object;
  timestamp: number;
  node?: string;
  verificationCount?: number;
}

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

