'use client';

import { useState } from 'react';
import { useChatStore } from '@/lib/stores/chatStore';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader, Copy, Download, ChevronDown } from 'lucide-react';
import { AGENT_STEPS, AgentStep } from '@/lib/constants/agentSteps';
import { VerificationProof } from '@/lib/types/chat';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/components/ui/use-toast';

interface VerificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMessageId?: string | null;
}

export function VerificationPanel({ isOpen, onClose, selectedMessageId }: VerificationPanelProps) {
  const { verificationProofs } = useChatStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Get proofs for selected message or all proofs
  const messageProofs = selectedMessageId
    ? verificationProofs.get(selectedMessageId) || []
    : Array.from(verificationProofs.values()).flat();

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: 'Copied',
      description: `${field} copied to clipboard`,
    });
  };

  const copyProofToClipboard = async (proof: VerificationProof) => {
    const proofText = JSON.stringify(proof, null, 2);
    await navigator.clipboard.writeText(proofText);
    toast({
      title: 'Copied',
      description: 'Proof data copied to clipboard',
    });
  };

  const handleDownloadReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      total_verifications: messageProofs.length,
      proofs: messageProofs,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Downloaded',
      description: 'Verification report downloaded',
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[450px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">Verification Proofs</SheetTitle>
              <SheetDescription className="mt-1">
                Cryptographic evidence of TEE-verified execution
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {messageProofs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No verifications yet
            </div>
          ) : (
            messageProofs.map((proof, index) => {
              const stepConfig = AGENT_STEPS[proof.node as AgentStep];
              const StepIcon = stepConfig?.icon;

              return (
                <Collapsible key={`${proof.chat_id}-${index}`} className="border border-border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-surface-elevated transition-colors">
                    <div className="flex items-center gap-3">
                      {proof.verified ? (
                        <CheckCircle className="w-5 h-5 text-secondary flex-shrink-0" />
                      ) : (
                        <Loader className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                      )}
                      {StepIcon && (
                        <StepIcon className={cn("w-5 h-5", stepConfig?.color)} />
                      )}
                      <div className="text-left">
                        <span className="font-medium text-sm">
                          {stepConfig?.label || proof.node}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {proof.verified ? 'Verified' : 'Verifying...'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="p-4 pt-0 space-y-3 text-sm">
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Chat ID</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="block flex-1 p-2 bg-surface rounded font-mono text-xs break-all">
                            {proof.chat_id}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(proof.chat_id, 'Chat ID')}
                          >
                            {copiedField === 'Chat ID' ? (
                              <CheckCircle className="h-3 w-3 text-secondary" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Request Hash</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="block flex-1 p-2 bg-surface rounded font-mono text-xs break-all">
                            {proof.request_hash}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(proof.request_hash, 'Request Hash')}
                          >
                            {copiedField === 'Request Hash' ? (
                              <CheckCircle className="h-3 w-3 text-secondary" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Response Hash</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="block flex-1 p-2 bg-surface rounded font-mono text-xs break-all">
                            {proof.response_hash}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(proof.response_hash, 'Response Hash')}
                          >
                            {copiedField === 'Response Hash' ? (
                              <CheckCircle className="h-3 w-3 text-secondary" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Signature</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="block flex-1 p-2 bg-surface rounded font-mono text-xs break-all">
                            {proof.signature}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(proof.signature, 'Signature')}
                          >
                            {copiedField === 'Signature' ? (
                              <CheckCircle className="h-3 w-3 text-secondary" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Signing Address</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="block flex-1 p-2 bg-surface rounded font-mono text-xs break-all">
                            {proof.signing_address}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(proof.signing_address, 'Signing Address')}
                          >
                            {copiedField === 'Signing Address' ? (
                              <CheckCircle className="h-3 w-3 text-secondary" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyProofToClipboard(proof)}
                      className="w-full gap-2"
                    >
                      <Copy className="w-3 h-3" />
                      Copy All Data
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

