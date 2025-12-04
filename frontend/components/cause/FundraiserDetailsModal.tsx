'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getFundraiser, getTrustReport, getUpdates } from '@/lib/api/fundraisers';
import { Cause, TrustReport, FundraiserUpdate } from '@/lib/types/fundraiser';
import { TrustScoreRing } from './TrustScoreRing';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useChatStore } from '@/lib/stores/chatStore';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { useSSEStream } from '@/lib/hooks/useSSEStream';
import Image from 'next/image';
import { ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';

interface FundraiserDetailsModalProps {
  causeId: string;
  onClose: () => void;
}

export function FundraiserDetailsModal({ causeId, onClose }: FundraiserDetailsModalProps) {
  const [fundraiser, setFundraiser] = useState<Cause | null>(null);
  const [trustReport, setTrustReport] = useState<TrustReport | null>(null);
  const [updates, setUpdates] = useState<FundraiserUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const { addMessage } = useChatStore();
  const { sessionId, userInterests, refundAddress } = useSessionStore();
  const { processStream } = useSSEStream();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fundraiserData, trustData, updatesData] = await Promise.all([
          getFundraiser(causeId),
          getTrustReport(causeId),
          getUpdates(causeId),
        ]);
        setFundraiser(fundraiserData);
        setTrustReport(trustData);
        setUpdates(updatesData);
      } catch (error) {
        console.error('Failed to fetch fundraiser details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [causeId]);

  const handleDonate = async () => {
    if (!fundraiser) return;

    const message = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: `Donate to ${fundraiser.title}`,
      timestamp: Date.now(),
    };

    addMessage(message);

    await processStream({
      session_id: sessionId,
      cause_id: fundraiser.id,
      refund_address: refundAddress || undefined,
      user_interests: userInterests,
    });

    onClose();
  };

  if (loading || !fundraiser) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="relative aspect-video w-full mb-4 rounded-lg overflow-hidden">
            <Image
              src={fundraiser.image_url || '/placeholder.png'}
              alt={fundraiser.title}
              fill
              className="object-cover"
            />
            <div className="absolute top-4 right-4">
              <TrustScoreRing score={fundraiser.trust_score} />
            </div>
          </div>
          <DialogTitle className="text-2xl">{fundraiser.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trust">Trust Report</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {fundraiser.long_description || fundraiser.short_description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Location</h4>
                <p>{fundraiser.city ? `${fundraiser.city}, ` : ''}{fundraiser.country}</p>
              </div>
              {fundraiser.website_url && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Website</h4>
                  <a
                    href={fundraiser.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Visit Website <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {fundraiser.social_links && fundraiser.social_links.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Social Links</h4>
                <div className="flex flex-wrap gap-2">
                  {fundraiser.social_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trust" className="space-y-4">
            {trustReport && (
              <>
                <div className="flex items-center gap-4">
                  <TrustScoreRing score={trustReport.trust_score} />
                  <div>
                    <h3 className="text-xl font-bold">Trust Score: {trustReport.trust_score}/100</h3>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {formatDate(trustReport.last_updated)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Flags</h4>
                  <div className="space-y-2">
                    {trustReport.report.flags.map((flag, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {flag.toLowerCase().includes('verified') || flag.toLowerCase().includes('positive') ? (
                          <CheckCircle2 className="h-4 w-4 text-secondary" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm">{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="updates" className="space-y-4">
            {updates.length === 0 ? (
              <p className="text-muted-foreground">No updates yet.</p>
            ) : (
              updates.map((update) => (
                <div key={update.id} className="border-b border-border pb-4 last:border-0">
                  <p className="text-sm text-muted-foreground mb-2">
                    {formatDate(update.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap">{update.content}</p>
                  {update.image_url && (
                    <Image
                      src={update.image_url}
                      alt="Update"
                      width={400}
                      height={300}
                      className="mt-2 rounded-lg"
                    />
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleDonate}>Donate Now</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

