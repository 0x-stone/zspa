import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSessionId, getUserInterests, getRefundAddress, setUserInterests, setRefundAddress, isOnboarded } from '@/lib/utils/session';

interface SessionState {
  sessionId: string;
  userInterests: string[];
  refundAddress: string | null;
  isOnboarded: boolean;
  
  initializeSession: () => void;
  setUserInterests: (interests: string[]) => void;
  setRefundAddress: (address: string) => void;
  completeOnboarding: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: '',
      userInterests: [],
      refundAddress: null,
      isOnboarded: false,
      
      initializeSession: () => {
        const sessionId = getSessionId();
        const interests = getUserInterests();
        const address = getRefundAddress();
        const onboarded = isOnboarded();
        
        set({
          sessionId,
          userInterests: interests,
          refundAddress: address,
          isOnboarded: onboarded,
        });
      },
      
      setUserInterests: (interests: string[]) => {
        setUserInterests(interests);
        set({ userInterests: interests });
      },
      
      setRefundAddress: (address: string) => {
        setRefundAddress(address);
        set({ refundAddress: address });
      },
      
      completeOnboarding: () => {
        set({ isOnboarded: true });
      },
    }),
    {
      name: 'zec-philanthropy-session',
      partialize: (state) => ({
        sessionId: state.sessionId,
        userInterests: state.userInterests,
        refundAddress: state.refundAddress,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);

