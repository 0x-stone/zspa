import { create } from 'zustand';
import { ChatMessage, VerificationProof } from '@/lib/types/chat';
import { AgentStep } from '@/lib/constants/agentSteps';

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentStep: AgentStep | null;
  awaitingInput: boolean;
  verificationProofs: Map<string, VerificationProof[]>;
  completedSteps: AgentStep[];
  
  addMessage: (message: ChatMessage) => void;
  setStreaming: (isStreaming: boolean) => void;
  setCurrentStep: (step: AgentStep | null) => void;
  clearMessages: () => void;
  setAwaitingInput: (awaiting: boolean) => void;
  addVerificationProof: (messageId: string, proof: VerificationProof) => void;
  completeStep: (step: AgentStep) => void;
  resetSteps: () => void;
  getLastMessageId: () => string | null;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentStep: null,
  awaitingInput: false,
  verificationProofs: new Map(),
  completedSteps: [],
  
  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },
  
  setStreaming: (isStreaming: boolean) => {
    set({ isStreaming });
  },
  
  setCurrentStep: (step: AgentStep | null) => {
    set({ currentStep: step });
  },
  
  clearMessages: () => {
    set({ messages: [], verificationProofs: new Map(), completedSteps: [] });
  },
  
  setAwaitingInput: (awaiting: boolean) => {
    set({ awaitingInput: awaiting });
  },
  
  addVerificationProof: (messageId: string, proof: VerificationProof) => {
    set((state) => {
      const newProofs = new Map(state.verificationProofs);
      const existing = newProofs.get(messageId) || [];
      newProofs.set(messageId, [...existing, proof]);
      
      // Update message verification count
      const updatedMessages = state.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, verificationCount: existing.length + 1 }
          : msg
      );
      
      return {
        verificationProofs: newProofs,
        messages: updatedMessages,
      };
    });
  },
  
  completeStep: (step: AgentStep) => {
    set((state) => {
      if (!state.completedSteps.includes(step)) {
        return {
          completedSteps: [...state.completedSteps, step],
        };
      }
      return state;
    });
  },
  
  resetSteps: () => {
    set({ currentStep: null, completedSteps: [] });
  },
  
  getLastMessageId: () => {
    const messages = get().messages;
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((msg) => msg.type === 'assistant');
    return lastAssistantMessage?.id || null;
  },
}));
