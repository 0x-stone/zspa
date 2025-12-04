'use client';

import { ChatMessage } from '@/lib/types/chat';
import { CauseCarousel } from '@/components/cause/CauseCarousel';
import { Cause } from '@/lib/types/fundraiser';
import { cn } from '@/lib/utils/cn';
import { Shield, Check, SearchX } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface MessageBubbleProps {
  message: ChatMessage;
  onShowVerification?: (messageId: string) => void;
}

export function MessageBubble({ message, onShowVerification }: MessageBubbleProps) {
  // Handle cause lists
    const getParsedContent = () => {
    // If it's already an object, return it
    if (typeof message.content === 'object' && message.content !== null) {
      return message.content;
    }
    // If it's a string that looks like JSON, try to parse it
    if (typeof message.content === 'string' && message.content.trim().startsWith('{')) {
      try {
        return JSON.parse(message.content);
      } catch (e) {
        return null; // Not valid JSON
      }
    }
    return null;
  };

  const contentObj = getParsedContent();

  if (message.node === 'discover_causes' && contentObj) {
    const content = contentObj as any;
    
    if (content.type === 'cause_list_with_summary') {
      return (
        <CauseCarousel
          causes={content.causes as Cause[]}
          summary={content.summary}
        />
      );
    }

    if (content.type === 'no_results') {
      return (
        <div className="flex w-full mb-3 justify-center animate-in fade-in slide-in-from-bottom-2">
          <div className="max-w-[85%] rounded-2xl p-6 shadow-lg bg-surface-elevated border border-border text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center ring-1 ring-border">
              <SearchX className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">No Matches Found</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.message || "I couldn't find any fundraisers matching your criteria. Try different keywords or a broader location."}
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  const isError = message.type === 'error';
  const hasVerification = message.type === 'assistant' && (message.verificationCount ?? 0) > 0;

  const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

  return (
    <div
      className={cn(
        'flex w-full mb-3',
        isUser && 'justify-end',
        isSystem && 'justify-center',
        isError && 'justify-center'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl p-4 shadow-lg',
          isUser && 'bg-primary text-black ml-auto',
          !isUser && !isSystem && !isError && 'bg-surface-elevated text-foreground',
          isSystem && 'bg-muted text-muted-foreground text-sm',
          isError && 'bg-destructive/20 text-destructive border border-destructive'
        )}
      >
        {/* Message Content */}
        <div className="prose prose-invert max-w-none">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>

        {/* Footer with timestamp and verification */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>

          {hasVerification && onShowVerification && (
            <button
              onClick={() => onShowVerification(message.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface transition-colors group"
            >
              <Shield className="w-3 h-3 text-secondary group-hover:text-primary transition-colors" />
              <span className="text-xs font-medium text-secondary group-hover:text-primary transition-colors">
                Verified
              </span>
              <Check className="w-3 h-3 text-secondary group-hover:text-primary transition-colors" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}