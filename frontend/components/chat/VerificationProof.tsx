'use client';

import { useState } from 'react';
import { VerificationProof as VerificationProofType } from '@/lib/types/chat';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface VerificationProofProps {
  proof: VerificationProofType;
}

export function VerificationProof({ proof }: VerificationProofProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field, label }: { text: string; field: string; label: string }) => (
    <div className="flex items-center justify-between p-2 bg-surface rounded">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono bg-background px-2 py-1 rounded">
          {text.slice(0, 20)}...
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => copyToClipboard(text, field)}
        >
          {copiedField === field ? (
            <Check className="h-3 w-3 text-secondary" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="border-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Message Verification Proof</CardTitle>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-semibold',
                    proof.verified
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-destructive text-destructive-foreground'
                  )}
                >
                  {proof.verified ? '✅ Verified' : '❌ Failed'}
                </span>
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            <CopyButton text={proof.chat_id} field="chat_id" label="Chat ID" />
            <CopyButton text={proof.request_hash} field="request_hash" label="Request Hash" />
            <CopyButton text={proof.response_hash} field="response_hash" label="Response Hash" />
            <CopyButton text={proof.signature} field="signature" label="Signature" />
            <CopyButton text={proof.signing_address} field="signing_address" label="Signing Address" />

            <div className="mt-4 p-3 bg-muted rounded text-sm text-muted-foreground">
              These cryptographic hashes prove this response was generated in a secure TEE. No one can fake this signature.
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

