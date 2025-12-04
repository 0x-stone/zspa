import { useState, useRef } from 'react';
import { PaymentStatus } from '@/lib/types/payment';
import { streamChatResponse } from '@/lib/api/chat';
import { ChatPayload } from '@/lib/types/chat';

export function usePaymentVerification(sessionId: string) {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [isPolling, setIsPolling] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startVerification = async () => {
    if (isPolling) return; // Prevent double clicks
    
    setIsPolling(true);
    setStatus('PROCESSING'); // Set to processing immediately upon user click
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    const payload: ChatPayload = {
      session_id: sessionId,
      verify_donation: true,
    };

    try {
      for await (const event of streamChatResponse(payload)) {
        // Stop if aborted
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        if (event.type === 'payment_status') {
          const newStatus = event.status as PaymentStatus;
          setStatus(newStatus);
          
          // If we reach a terminal state, stop the loop
          if (newStatus === 'SUCCESS' || newStatus === 'FAILED' || newStatus === 'REFUNDED') {
            setIsPolling(false);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('FAILED');
      setIsPolling(false);
    } finally {
      setIsPolling(false);
    }
  };

  const cancelVerification = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsPolling(false);
    setStatus('idle');
  };

  return {
    status,
    isPolling,
    startVerification,
    cancelVerification,
  };
}