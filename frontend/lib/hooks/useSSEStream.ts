import { useEffect, useRef } from 'react';
import { streamChatResponse } from '@/lib/api/chat';
import { ChatPayload, SSEEvent } from '@/lib/types/chat';
import { useChatStore } from '@/lib/stores/chatStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { AgentStep, AGENT_STEPS } from '@/lib/constants/agentSteps';

// Helper function to extract step name from status message
function extractStepFromMessage(message: string | undefined): AgentStep | null {
  if (!message) return null;
  
  const lowerMessage = message.toLowerCase();
  for (const stepName of Object.keys(AGENT_STEPS) as AgentStep[]) {
    const stepConfig = AGENT_STEPS[stepName];
    if (lowerMessage.includes(stepConfig.label.toLowerCase()) || 
        lowerMessage.includes(stepName)) {
      return stepName;
    }
  }
  return null;
}

// Helper to robustly extract JSON from a string (handles Markdown, text, etc.)
function tryParseJSON(text: string): any {
  try {
    // 1. Try direct parsing
    return JSON.parse(text);
  } catch {
    // 2. Try extracting from Markdown or text wrapper
    // Find the first '{' and the last '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const potentialJson = text.substring(firstBrace, lastBrace + 1);
        return JSON.parse(potentialJson);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function useSSEStream() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const processStream = async (
    payload: ChatPayload,
    onEvent?: (event: SSEEvent) => void
  ) => {
    const { 
      addMessage, 
      setStreaming, 
      setCurrentStep,
      completeStep,
      addVerificationProof,
      getLastMessageId,
      resetSteps,
    } = useChatStore.getState();
    
    setStreaming(true);
    resetSteps();
    abortControllerRef.current = new AbortController();

    try {
      for await (const event of streamChatResponse(payload)) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        switch (event.type) {
          case 'status':
            // Extract step from status message
            const step = extractStepFromMessage(event.message);
            if (step) {
              setCurrentStep(step);
            }
            
            // addMessage({
            //   id: Date.now().toString(),
            //   type: 'system',
            //   content: event.message || '',
            //   timestamp: Date.now(),
            // });
            break;

          case 'step':
            if (event.step) {
              const stepName = event.step as AgentStep;
              setCurrentStep(stepName);
              completeStep(stepName);
            }
            break;

          case 'content':
            let isPayment = false;
            let paymentData = null;

            // Strategy 1: Check if content is already an object
            if (typeof event.content === 'object' && event.content !== null) {
              const contentObj = event.content as any;
              // Broadened check to include 'quote' and camelCase 'depositAddress'
              if (
                'qr_code_data' in contentObj || 
                'deposit_addr' in contentObj || 
                'depositAddress' in contentObj ||
                'quote' in contentObj
              ) {
                isPayment = true;
                paymentData = contentObj;
              }
            } 
            // Strategy 2: Check if content is a string and try to parse it
            else if (typeof event.content === 'string') {
              const parsed = tryParseJSON(event.content);
              if (parsed && typeof parsed === 'object') {
                // Broadened check to include 'quote' and camelCase 'depositAddress'
                if (
                  'qr_code_data' in parsed || 
                  'deposit_addr' in parsed || 
                  'depositAddress' in parsed || 
                  'quote' in parsed
                ) {
                  isPayment = true;
                  paymentData = parsed;
                }
              }
            }

            if (isPayment && paymentData) {
              console.log("Payment data detected, opening modal:", paymentData);
              // Handle payment modal opening
              // We use setTimeout to break out of the render loop/stream processing briefly to ensure UI updates cleanly
              setTimeout(() => {
                  useUIStore.getState().openPaymentModal(paymentData as any);
              }, 0);
              continue; // Skip adding this as a chat message
            }

            // Regular message handling
            addMessage({
              id: Date.now().toString(),
              type: 'assistant',
              content: event.content || '',
              timestamp: Date.now(),
              node: event.node,
            });
            break;

          case 'verification':
            if (event.proof) {
              const lastMessageId = getLastMessageId();
              if (lastMessageId) {
                addVerificationProof(lastMessageId, event.proof);
              } 
            }
            break;

          case 'cause_list_with_summary':
            addMessage({
              id: Date.now().toString(),
              type: 'assistant',
              content: {
                type: 'cause_list',
                causes: event.causes || [],
                summary: event.summary,
                total_found: event.total_found,
              },
              timestamp: Date.now(),
            });
            break;

          case 'payment_status':
            useUIStore.getState().setVerificationStatus(event.status as any);
            break;

          case 'error':
            addMessage({
              id: Date.now().toString(),
              type: 'error',
              content: event.error?.message || 'An error occurred',
              timestamp: Date.now(),
            });
            break;
        }

        if (onEvent) {
          onEvent(event);
        }
      }
    } catch (error) {
      console.error('SSE stream error:', error);
      addMessage({
        id: Date.now().toString(),
        type: 'error',
        content: 'Connection error. Please try again.',
        timestamp: Date.now(),
      });
    } finally {
      setStreaming(false);
      resetSteps();
    }
  };

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  useEffect(() => {
    return () => {
      cancel();
    };
  }, []);

  return { processStream, cancel };
}