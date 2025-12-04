'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/stores/chatStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { getTEEStatus, TEEStatus } from '@/lib/api/tee';
import { AGENT_STEPS, AgentStep } from '@/lib/constants/agentSteps';
import { ShieldCheck, Shield } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Progress } from '@/components/ui/progress';

interface AgentStatusBarProps {
  onShowVerifications: () => void;
}

export function AgentStatusBar({ onShowVerifications }: AgentStatusBarProps) {
  const { currentStep, isStreaming, verificationProofs, completedSteps } = useChatStore();
  const { openModal } = useUIStore();
  const [teeStatus, setTeeStatus] = useState<TEEStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getTEEStatus();
        setTeeStatus(data);
      } catch (error) {
        console.error('Failed to fetch TEE status:', error);
      }
    };

    fetchStatus();
  }, []);

  const stepConfig = currentStep ? AGENT_STEPS[currentStep] : null;
  const StepIcon = stepConfig?.icon;

  // Calculate verification counts
  const totalVerifications = Array.from(verificationProofs.values()).flat().length;
  const verifiedCount = Array.from(verificationProofs.values())
    .flat()
    .filter((p) => p.verified).length;
  const totalNodes = Math.max(totalVerifications, completedSteps.length, 1);

  const isTEEVerified = teeStatus?.tee_verified ?? false;

  return (
    <div className="sticky top-0 z-40 bg-surface border-b border-border">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: TEE Status */}
        <button
          onClick={() => openModal('TEEDetails')}
          className="flex items-center gap-2 hover:bg-surface-elevated transition-colors rounded-md px-2 py-1"
        >
          {isTEEVerified ? (
            <ShieldCheck className="w-4 h-4 text-secondary animate-pulse" />
          ) : (
            <Shield className="w-4 h-4 text-muted-foreground" />
          )}
          <span className={cn(
            "text-xs font-medium",
            isTEEVerified ? "text-secondary" : "text-muted-foreground"
          )}>
            TEE-Verified
          </span>
        </button>

        {/* Center: Current Step (Animated) */}
        {isStreaming && stepConfig && (
          <div className="flex items-center gap-3">
            {StepIcon && (
              <StepIcon className={cn(
                "w-5 h-5 animate-pulse",
                stepConfig.color
              )} />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {stepConfig.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {stepConfig.description}
              </span>
            </div>
          </div>
        )}

        {/* Right: Verification Counter */}
        <button
          onClick={onShowVerifications}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-surface-elevated transition-colors"
        >
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {verifiedCount}/{totalNodes} Verified
          </span>
        </button>
      </div>

      {/* Progress Bar */}
      {totalNodes > 0 && (
        <div className="h-1 bg-surface-elevated">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
            style={{ width: `${(verifiedCount / totalNodes) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

