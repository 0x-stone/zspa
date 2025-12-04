'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { InterestsStep } from './InterestsStep';
import { RefundAddressStep } from './RefundAddressStep';

export function OnboardingModal() {
  const [step, setStep] = useState<'interests' | 'refund'>('interests');

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" hideClose>
        {step === 'interests' ? (
          <InterestsStep onNext={() => setStep('refund')} />
        ) : (
          <RefundAddressStep onBack={() => setStep('interests')} />
        )}
      </DialogContent>
    </Dialog>
  );
}

