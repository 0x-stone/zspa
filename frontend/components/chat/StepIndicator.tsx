'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/lib/stores/chatStore';
import { AGENT_STEPS, AgentStep } from '@/lib/constants/agentSteps';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StepIndicatorProps {
  steps: AgentStep[];
}

export function StepIndicator({ steps }: StepIndicatorProps) {
  const { currentStep, isStreaming, completedSteps } = useChatStore();

  const validSteps = steps.filter(step => AGENT_STEPS[step]);
  const currentStepIndex = validSteps.findIndex((s) => s === currentStep);

  return (
    <AnimatePresence>
      {isStreaming && validSteps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="w-full bg-surface/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar mask-gradient-x">
            {validSteps.map((stepName, index) => {
              const stepConfig = AGENT_STEPS[stepName];
              if (!stepConfig) return null;

              const StepIcon = stepConfig.icon;
              const isActive = index === currentStepIndex;
              const isComplete = completedSteps.includes(stepName) || index < currentStepIndex;

              return (
                <React.Fragment key={stepName}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all whitespace-nowrap",
                      isActive 
                        ? "bg-primary/10 border-primary/50 text-foreground shadow-sm" 
                        : isComplete
                        ? "bg-secondary/10 border-secondary/20 text-muted-foreground"
                        : "bg-surface border-transparent text-muted-foreground/50"
                    )}
                  >
                    <div className="relative">
                      <StepIcon
                        className={cn(
                          'w-4 h-4',
                          isActive && "text-primary animate-pulse",
                          isComplete && !isActive && "text-secondary",
                          !isActive && !isComplete && "text-muted-foreground"
                        )}
                      />
                       {isComplete && !isActive && (
                        <div className="absolute -bottom-1 -right-1 bg-surface rounded-full">
                           <Check className="w-2 h-2 text-secondary" />
                        </div>
                       )}
                    </div>
                    
                    <span className="text-xs font-medium">
                      {stepConfig.label}
                    </span>
                  </motion.div>

                  {/* Connector Arrow */}
                  {index < validSteps.length - 1 && (
                    <ArrowRight className={cn(
                      "w-3 h-3 flex-shrink-0",
                      index < currentStepIndex ? "text-secondary/50" : "text-border"
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}