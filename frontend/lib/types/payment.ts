import { Cause } from './fundraiser';
import { VerificationProof } from './chat';

export interface QuoteResponse {
  depositAddress: string;
  depositMemo?: string;
  amount: string;
  amountInUsd: string;
  timeEstimate: number;
  deadline: string;
  amountInFormatted:string
}

export interface PaymentData {
  quote: QuoteResponse;
  deposit_addr: string;
  cause: Cause;
  amount: number;
  refund_address: string;
  qr_code_data: string;
}

export type PaymentStatus =
  | 'idle'
  | 'PENDING_DEPOSIT'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'INCOMPLETE_DEPOSIT'
  | 'FAILED'
  | 'REFUNDED';

export interface DonationCertificateProps {
  cause: Cause;
  amount: number;
  amountUsd: string;
  timestamp: string;
  verificationProof?: VerificationProof;
}

