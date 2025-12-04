import { create } from 'zustand';
import { PaymentData, PaymentStatus } from '@/lib/types/payment';

interface UIState {
  isOnboardingModalOpen: boolean;
  isAuthModalOpen: boolean;
  isFundraiserDetailsModalOpen: boolean;
  selectedFundraiserId: string | null;
  isTEEDetailsModalOpen: boolean;
  isPrivacyExplainerModalOpen: boolean;
  isPaymentModalOpen: boolean;
  paymentData: PaymentData | null;
  paymentVerificationStatus: PaymentStatus;
  
  openModal: (modalName: string) => void;
  closeModal: (modalName: string) => void;
  setSelectedFundraiser: (id: string | null) => void;
  openPaymentModal: (data: PaymentData) => void;
  closePaymentModal: () => void;
  setVerificationStatus: (status: PaymentStatus) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnboardingModalOpen: false,
  isAuthModalOpen: false,
  isFundraiserDetailsModalOpen: false,
  selectedFundraiserId: null,
  isTEEDetailsModalOpen: false,
  isPrivacyExplainerModalOpen: false,
  isPaymentModalOpen: false,
  paymentData: null,
  paymentVerificationStatus: 'idle',
  
  openModal: (modalName: string) => {
    set({ [`is${modalName}ModalOpen`]: true } as any);
  },
  
  closeModal: (modalName: string) => {
    set({ [`is${modalName}ModalOpen`]: false } as any);
  },
  
  setSelectedFundraiser: (id: string | null) => {
    set({ selectedFundraiserId: id });
  },
  
  openPaymentModal: (data: PaymentData) => {
    set({
      isPaymentModalOpen: true,
      paymentData: data,
      paymentVerificationStatus: 'idle',
    });
  },
  
  closePaymentModal: () => {
    set({
      isPaymentModalOpen: false,
      paymentData: null,
      paymentVerificationStatus: 'idle',
    });
  },
  
  setVerificationStatus: (status: PaymentStatus) => {
    set({ paymentVerificationStatus: status });
  },
}));

