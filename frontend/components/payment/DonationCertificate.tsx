'use client';

import { DonationCertificateProps } from '@/lib/types/payment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { CheckCircle2 } from 'lucide-react';

export function DonationCertificate({
  cause,
  amount,
  amountUsd,
  timestamp,
}: DonationCertificateProps) {
  return (
    <Card className="border-2 border-secondary">
      <CardHeader className="text-center">
        <CheckCircle2 className="h-16 w-16 mx-auto text-secondary mb-4" />
        <CardTitle className="text-2xl">Donation Successful!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary mb-2">
            {formatCurrency(amountUsd)}
          </p>
          <p className="text-muted-foreground">donated to</p>
          <p className="text-xl font-semibold mt-2">{cause.title}</p>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date:</span>
            <span>{formatDate(timestamp)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cause:</span>
            <span className="text-right max-w-[60%] truncate">{cause.display_name}</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded text-xs text-center text-muted-foreground">
          Thank you for your generous contribution! Your donation helps make a difference.
        </div>
      </CardContent>
    </Card>
  );
}

