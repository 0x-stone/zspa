import apiClient from './client';

export interface TEEStatus {
  status: 'verified' | 'unverified';
  tee_verified: boolean;
  model: string;
  signing_address: string;
  verified_at: string;
  verification_age_hours: number;
  guarantees: {
    private_inference: string;
    verifiable: string;
    hardware_isolation: string;
    tamper_proof: string;
  };
  user_message: string;
}

export async function getTEEStatus(): Promise<TEEStatus> {
  const response = await apiClient.get<TEEStatus>('/tee/privacy-status');
  return response.data;
}

