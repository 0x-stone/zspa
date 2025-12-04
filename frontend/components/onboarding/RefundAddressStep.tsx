'use client';

import { useState } from 'react';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateZcashAddress } from '@/lib/utils/validators';
import { useUIStore } from '@/lib/stores/uiStore';

interface RefundAddressStepProps {
  onBack: () => void;
}

export function RefundAddressStep({ onBack }: RefundAddressStepProps) {
  const { setRefundAddress, completeOnboarding } = useSessionStore();
  const { closeModal } = useUIStore();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleComplete = () => {
    setRefundAddress(address);
    completeOnboarding();
    closeModal('Onboarding');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary mb-2">
          Provide Your Shielded Refund Address
        </h2>
        <p className="text-muted-foreground">
          This z-address will receive refunds if a donation fails. Your privacy is guaranteed.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="refund-address">Zcash Shielded Address (z-address)</Label>
        <Input
          id="refund-address"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError('');
          }}
          placeholder="zs1..."
          className={error ? 'border-destructive' : ''}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleComplete} disabled={!address}>
          Complete Setup
        </Button>
      </div>
    </div>
  );
}

