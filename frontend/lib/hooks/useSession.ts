import { useEffect } from 'react';
import { useSessionStore } from '@/lib/stores/sessionStore';

export function useSession() {
  const { initializeSession, sessionId, userInterests, refundAddress, isOnboarded } = useSessionStore();

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return {
    sessionId,
    userInterests,
    refundAddress,
    isOnboarded,
  };
}

