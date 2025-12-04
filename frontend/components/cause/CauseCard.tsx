'use client';

import { Cause } from '@/lib/types/fundraiser';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrustScoreRing } from './TrustScoreRing';
import { formatCurrency, truncateText } from '@/lib/utils/formatters';
import { useChatStore } from '@/lib/stores/chatStore';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useSSEStream } from '@/lib/hooks/useSSEStream';
import { useUIStore } from '@/lib/stores/uiStore';
import Image from 'next/image';

interface CauseCardProps {
  cause: Cause;
}

export function CauseCard({ cause }: CauseCardProps) {
  const { addMessage } = useChatStore();
  const { sessionId, userInterests, refundAddress } = useSessionStore();
  const { processStream } = useSSEStream();
  const { setSelectedFundraiser } = useUIStore();

  const handleDonate = async () => {
    const message = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: `Donate to ${cause.title}`,
      timestamp: Date.now(),
    };

    addMessage(message);

    await processStream({
      session_id: sessionId,
      cause_id: cause.id,
      refund_address: refundAddress || undefined,
      user_interests: userInterests,
    });
  };

  const handleCardClick = () => {
    setSelectedFundraiser(cause.id);
  };

  const progress = cause.goal_amount > 0 
    ? (cause.amount_raised / cause.goal_amount) * 100 
    : 0;

  return (
    <Card 
      className="cursor-pointer hover:scale-[1.02] transition-transform hover:shadow-lg"
      onClick={handleCardClick}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
        <Image
          src={cause.image_url || '/placeholder.png'}
          alt={cause.title}
          fill
          className="object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 right-2">
          <TrustScoreRing score={cause.trust_score} />
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-2 truncate">{cause.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {truncateText(cause.short_description, 100)}
        </p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(cause.amount_raised)} raised
            </span>
            <span className="text-muted-foreground">
              of {formatCurrency(cause.goal_amount)}
            </span>
          </div>
          <Progress value={progress} />
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" onClick={(e) => { e.stopPropagation(); handleDonate(); }}>
          Donate Now
        </Button>
      </CardFooter>
    </Card>
  );
}

