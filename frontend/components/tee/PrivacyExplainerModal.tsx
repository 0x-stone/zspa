'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/stores/uiStore';
import { Shield, Cpu, Lock } from 'lucide-react';

export function PrivacyExplainerModal() {
  const { isPrivacyExplainerModalOpen, closeModal } = useUIStore();

  return (
    <Dialog open={isPrivacyExplainerModalOpen} onOpenChange={() => closeModal('PrivacyExplainer')}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How TEE Privacy Works</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Trusted Execution Environment (TEE)
            </h3>
            <p className="text-muted-foreground text-sm">
              Our AI agent runs inside a Trusted Execution Environment (TEE), which provides hardware-level isolation
              and cryptographic verification. This ensures that your conversations and donation data remain private and
              cannot be accessed by anyone, including the service providers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              NVIDIA GPU TEE
            </h3>
            <p className="text-muted-foreground text-sm">
              We use NVIDIA's GPU-based TEE technology, which provides secure enclaves for AI inference. This means
              your data is processed in an isolated environment that even the cloud provider cannot access.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Intel TDX Technology
            </h3>
            <p className="text-muted-foreground text-sm">
              Intel Trust Domain Extensions (TDX) provide additional hardware-level security guarantees, ensuring that
              the TEE cannot be tampered with or compromised, even by privileged system software.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Cryptographic Verification</h3>
            <p className="text-muted-foreground text-sm">
              Every response from the AI agent is cryptographically signed by the TEE. You can verify these signatures
              to ensure that the response was generated in a secure environment and hasn't been tampered with.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => closeModal('PrivacyExplainer')}>Got It</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

