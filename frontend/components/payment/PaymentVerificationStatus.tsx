'use client';

import { PaymentStatus } from '@/lib/types/payment';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface PaymentVerificationStatusProps {
  status: PaymentStatus;
  retryCount?: number;
  maxRetries?: number;
  onRetry?: () => void;
}

export function PaymentVerificationStatus({
  status,
  retryCount = 0,
  maxRetries = 15,
  onRetry,
}: PaymentVerificationStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'PENDING_DEPOSIT':
        return {
          icon: Clock,
          text: 'Waiting for deposit...',
          color: 'text-primary',
        };
      case 'PROCESSING':
        return {
          icon: Loader2,
          text: 'Processing payment...',
          color: 'text-primary',
        };
      case 'SUCCESS':
        return {
          icon: CheckCircle2,
          text: 'Payment verified successfully!',
          color: 'text-secondary',
        };
      case 'INCOMPLETE_DEPOSIT':
        return {
          icon: AlertCircle,
          text: 'Incomplete deposit detected',
          color: 'text-destructive',
        };
      case 'FAILED':
        return {
          icon: XCircle,
          text: 'Payment verification failed',
          color: 'text-destructive',
        };
      case 'REFUNDED':
        return {
          icon: AlertCircle,
          text: 'Payment refunded',
          color: 'text-muted-foreground',
        };
      default:
        return {
          icon: Clock,
          text: 'Verifying...',
          color: 'text-muted-foreground',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const progress = maxRetries > 0 ? (retryCount / maxRetries) * 100 : 0;

  return (
    <div className="space-y-4 text-center">
      <Icon className={`h-12 w-12 mx-auto ${config.color} ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
      <div>
        <h3 className="text-lg font-semibold mb-1">{config.text}</h3>
        {status === 'PROCESSING' && retryCount > 0 && (
          <p className="text-sm text-muted-foreground">
            Verification attempt {retryCount} of {maxRetries}...
          </p>
        )}
      </div>
      {status === 'PROCESSING' && (
        <div className="space-y-2">
          <Progress value={progress} />
        </div>
      )}
      {(status === 'FAILED' || status === 'INCOMPLETE_DEPOSIT') && onRetry && (
        <Button onClick={onRetry}>Retry Verification</Button>
      )}
    </div>
  );
}

