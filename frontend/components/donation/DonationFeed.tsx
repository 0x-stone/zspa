'use client';

import { useDonationFeed } from '@/lib/hooks/useDonationFeed';
import { DonationItem } from './DonationItem';

export function DonationFeed() {
  const { donations, isLoading } = useDonationFeed();

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Live Donation Feed</h2>
        <p className="text-sm text-muted-foreground">Recent donations (privacy-first)</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading donations...</div>
        ) : donations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No donations yet</div>
        ) : (
          donations.slice(0, 10).map((donation) => (
            <DonationItem key={donation.id} donation={donation} />
          ))
        )}
      </div>
    </div>
  );
}

