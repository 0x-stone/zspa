'use client';

import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores/uiStore';
import { PaymentVerificationStatus } from './PaymentVerificationStatus';
import { DonationCertificate } from './DonationCertificate';
import { usePaymentVerification } from '@/lib/hooks/usePaymentVerification';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { formatCurrency } from '@/lib/utils/formatters';
import { Copy, Check } from 'lucide-react';
import { PaymentData } from '@/lib/types/payment';
import QRCode from 'qrcode';

export function CryptoPaymentModal() {
  const { isPaymentModalOpen, paymentData: rawPaymentData, paymentVerificationStatus, closePaymentModal } = useUIStore();
  const { sessionId } = useSessionStore();
  const { status, isPolling, startVerification, cancelVerification } = usePaymentVerification(sessionId);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Safe parsing of paymentData
  const paymentData = useMemo(() => {
    if (!rawPaymentData) return null;
    let data = rawPaymentData;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { return null; }
    }
    const processedData = { ...data } as any;
    if (typeof processedData.quote === 'string') {
      try { processedData.quote = JSON.parse(processedData.quote); } catch (e) {}
    }
    if (typeof processedData.cause === 'string') {
      try { processedData.cause = JSON.parse(processedData.cause); } catch (e) {}
    }
    return processedData as PaymentData;
  }, [rawPaymentData]);

  // Generate QR Code
  useEffect(() => {
    if (paymentData?.qr_code_data) {
      QRCode.toDataURL(paymentData.qr_code_data, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setQrCodeUrl).catch(console.error);
    } else {
      setQrCodeUrl(null);
    }
  }, [paymentData]);

  // Reset verification state when modal opens
  useEffect(() => {
    if (isPaymentModalOpen) {
      cancelVerification();
    }
  }, [isPaymentModalOpen]);

  if (!paymentData) return null;

  const copyAddress = async () => {
    await navigator.clipboard.writeText(paymentData.deposit_addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStatus = paymentVerificationStatus !== 'idle' ? paymentVerificationStatus : status;

  return (
    <Dialog open={isPaymentModalOpen} onOpenChange={closePaymentModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Donation</DialogTitle>
        </DialogHeader>

        {currentStatus === 'SUCCESS' ? (
          <DonationCertificate
            cause={paymentData.cause}
            amount={paymentData.amount}
            amountUsd={paymentData.quote.amountInUsd}
            timestamp={new Date().toISOString()}
          />
        ) : currentStatus !== 'idle' && currentStatus !== 'FAILED' ? (
          // Showing Verification Status
          <PaymentVerificationStatus
            status={currentStatus}
            onRetry={startVerification}
          />
        ) : (
          // Default Payment View
          <div className="space-y-6">
            <div className="text-center">
              {/* Fixed Amount Display: Large ZEC, Small USD in brackets */}
              <p className="text-4xl font-bold text-primary mb-1">
                {paymentData.quote.amountInFormatted} ZEC
              </p>
              <p className="text-sm font-normal text-muted-foreground">
                ({formatCurrency(parseFloat(paymentData.quote.amountInUsd))})
              </p>
            </div>

            {qrCodeUrl && (
              <div className="flex justify-center">
                <img
                  src={qrCodeUrl}
                  alt="Payment QR Code"
                  width={200}
                  height={200}
                  className="border rounded-lg shadow-sm bg-white p-2"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold">Deposit Address:</label>
              <div className="flex items-center gap-2 p-2 bg-surface rounded border border-border">
                <code className="text-xs font-mono flex-1 truncate select-all">
                  {paymentData.deposit_addr}
                </code>
                <Button variant="ghost" size="icon" onClick={copyAddress} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {paymentData.quote.depositMemo && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Memo:</label>
                <div className="p-2 bg-surface rounded border border-border">
                  <code className="text-xs font-mono select-all">{paymentData.quote.depositMemo}</code>
                </div>
              </div>
            )}

            <Button 
              className="w-full text-lg py-6" 
              size="lg" 
              onClick={startVerification} 
              disabled={isPolling}
            >
              {isPolling ? 'Verifying...' : "I've Sent the Funds"}
            </Button>
            
            {status === 'FAILED' && (
              <p className="text-sm text-destructive text-center">
                Payment not detected. Please ensure you sent the exact amount and try again.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}