import apiClient from './client';
import { DonationFeedItem } from '@/lib/types/donation';

export async function getDonations(): Promise<DonationFeedItem[]> {
  const response = await apiClient.get<DonationFeedItem[]>('/api/v1/donations/');
  return response.data;
}

