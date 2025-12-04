'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/lib/stores/chatStore';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useSSEStream } from '@/lib/hooks/useSSEStream';
import { MessageBubble } from './MessageBubble';
import { AgentStatusBar } from './AgentStatusBar';
import { StepIndicator } from './StepIndicator';
import { VerificationPanel } from './VerificationPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { ChatPayload } from '@/lib/types/chat';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AgentStep } from '@/lib/constants/agentSteps';
import { cn } from '@/lib/utils/cn';

export function ChatInterface() {
  const { messages, isStreaming, awaitingInput, setAwaitingInput, addMessage, currentStep, completedSteps } = useChatStore();
  const { sessionId, userInterests, refundAddress } = useSessionStore();
  const { processStream } = useSSEStream();
  const [input, setInput] = useState('');
  const [refundInput, setRefundInput] = useState('');
  const [isVerificationPanelOpen, setIsVerificationPanelOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [trackedSteps, setTrackedSteps] = useState<AgentStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track steps as they occur
  useEffect(() => {
    if (currentStep && !trackedSteps.includes(currentStep)) {
      setTrackedSteps((prev) => [...prev, currentStep]);
    }
  }, [currentStep, trackedSteps]);

  // Reset tracked steps when streaming starts
  useEffect(() => {
    if (isStreaming && trackedSteps.length === 0 && currentStep) {
      setTrackedSteps([currentStep]);
    } else if (!isStreaming) {
      setTimeout(() => {
        setTrackedSteps([]);
      }, 2000);
    }
  }, [isStreaming, currentStep, trackedSteps.length]);

  const handleShowVerification = (messageId: string) => {
    setSelectedMessageId(messageId);
    setIsVerificationPanelOpen(true);
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: input,
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setInput('');
    setTrackedSteps([]);

    const payload: ChatPayload = {
      message: input,
      session_id: sessionId,
      refund_address: refundAddress || undefined,
      user_interests: userInterests,
    };

    await processStream(payload, (event) => {
      if (
        event.type === 'content' &&
        typeof event.content === 'string' &&
        event.content.toLowerCase().includes('provide your shielded zec address')
      ) {
        setAwaitingInput(true);
      }
    });
  };

  const handleRefundAddressSubmit = async () => {
    if (!refundInput.trim()) return;

    const payload: ChatPayload = {
      session_id: sessionId,
      refund_address: refundInput,
      user_interests: userInterests,
      update_shielded_address: true,
    };

    setAwaitingInput(false);
    setRefundInput('');

    await processStream(payload);
  };

  return (
    <div className="flex flex-col h-full relative bg-background/50">
      {/* FIXED HEADER SECTION 
        This block sits at the top of the flex container. 
        It will NOT scroll with the messages.
      */}
      <div className="z-30 bg-surface border-b border-border/50 shadow-sm backdrop-blur-md">
        <AgentStatusBar onShowVerifications={() => setIsVerificationPanelOpen(true)} />
        
        {/* Step Indicator integrated into the header block */}
        <div className={cn(
          "transition-all duration-500 ease-in-out overflow-hidden",
          isStreaming && trackedSteps.length > 0 ? "max-h-[120px] opacity-100 border-t border-border/30" : "max-h-0 opacity-0"
        )}>
          <StepIndicator steps={trackedSteps} />
        </div>
      </div>
      
      {/* SCROLLABLE MESSAGE AREA 
        This area takes up remaining space and scrolls independently.
      */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
             <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Send className="w-8 h-8 text-primary" />
             </div>
             <div>
                <h3 className="font-semibold text-lg">Start a Conversation</h3>
                <p className="text-sm text-muted-foreground">Ask about causes, verify details, or make a donation.</p>
             </div>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message}
            onShowVerification={handleShowVerification}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="p-4 bg-surface border-t border-border">
        <div className="flex gap-3 items-center bg-background p-1.5 rounded-full border border-input focus-within:ring-2 focus-within:ring-ring ring-offset-background transition-all shadow-sm">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            disabled={isStreaming}
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-4 h-10 shadow-none"
          />
          <Button 
            onClick={handleSend} 
            disabled={isStreaming || !input.trim()}
            size="icon"
            className="h-9 w-9 rounded-full shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={awaitingInput} onOpenChange={(open) => !open && setAwaitingInput(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Your Shielded ZEC Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund-input">Zcash Shielded Address</Label>
              <Input
                id="refund-input"
                value={refundInput}
                onChange={(e) => setRefundInput(e.target.value)}
                placeholder="zs1..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAwaitingInput(false)}>
                Cancel
              </Button>
              <Button onClick={handleRefundAddressSubmit} disabled={!refundInput.trim()}>
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VerificationPanel
        isOpen={isVerificationPanelOpen}
        onClose={() => {
          setIsVerificationPanelOpen(false);
          setSelectedMessageId(null);
        }}
        selectedMessageId={selectedMessageId}
      />
    </div>
  );
}