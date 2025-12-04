'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getTEEStatus, TEEStatus } from '@/lib/api/tee';
import { useUIStore } from '@/lib/stores/uiStore';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, CheckCircle2, EyeOff } from 'lucide-react';
import { Copy, Check } from 'lucide-react';

export function TEEDetailsModal() {
  const { isTEEDetailsModalOpen, closeModal, openModal } = useUIStore();
  const [status, setStatus] = useState<TEEStatus | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isTEEDetailsModalOpen) {
      fetchStatus();
    }
  }, [isTEEDetailsModalOpen]);

  const fetchStatus = async () => {
    try {
      const data = await getTEEStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch TEE status:', error);
    }
  };

  const copyAddress = async () => {
    if (status?.signing_address) {
      await navigator.clipboard.writeText(status.signing_address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!status) return null;

  const guaranteeIcons = {
    private_inference: EyeOff,
    verifiable: CheckCircle2,
    hardware_isolation: Lock,
    tamper_proof: Shield,
  };

  return (
    <Dialog open={isTEEDetailsModalOpen} onOpenChange={() => closeModal('TEEDetails')}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Privacy Guarantee</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Model:</span>
              <p className="font-semibold">{status.model}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Last Verified:</span>
              <p className="font-semibold">
                {formatRelativeTime(status.verified_at)} ({status.verification_age_hours.toFixed(1)} hours ago)
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Signing Address:</span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-surface px-2 py-1 rounded flex-1">
                  {status.signing_address}
                </code>
                <Button variant="ghost" size="icon" onClick={copyAddress}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Privacy Guarantees</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(status.guarantees).map(([key, description]) => {
                const Icon = guaranteeIcons[key as keyof typeof guaranteeIcons] || Shield;
                return (
                  <Card key={key}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-sm capitalize">
                          {key.replace(/_/g, ' ')}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs">{description}</CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchStatus}>
              Refresh Verification
            </Button>
            <Button variant="outline" onClick={() => { closeModal('TEEDetails'); openModal('PrivacyExplainer'); }}>
              How This Works
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

