import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDonations } from '@/lib/api/donations';
import { DonationFeedItem } from '@/lib/types/donation';

export function useDonationFeed() {
  const { data, isLoading, error } = useQuery<DonationFeedItem[]>({
    queryKey: ['donations'],
    queryFn: getDonations,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  return {
    donations: data || [],
    isLoading,
    error,
  };
}

