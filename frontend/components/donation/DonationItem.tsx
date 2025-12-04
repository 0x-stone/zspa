'use client';

import { DonationFeedItem } from '@/lib/types/donation';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/formatters';
import { Coins } from 'lucide-react';

interface DonationItemProps {
  donation: DonationFeedItem;
}

export function DonationItem({ donation }: DonationItemProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface-elevated transition-colors animate-in slide-in-from-top-2">
      <Coins className="h-5 w-5 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold text-primary">
            {donation.amount_zec.toFixed(4)} ZEC
          </span>
          {donation.amount_usd && (
            <span className="text-muted-foreground ml-1">
              ({formatCurrency(donation.amount_usd)})
            </span>
          )}
          {' '}donated to{' '}
          <span className="font-medium">{donation.fundraiser_title}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(donation.created_at)}
        </p>
      </div>
    </div>
  );
}

