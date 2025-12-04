'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFundraiser, getTrustReport, getUpdates } from '@/lib/api/fundraisers';
import { Cause, TrustReport, FundraiserUpdate } from '@/lib/types/fundraiser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrustScoreRing } from '@/components/cause/TrustScoreRing';
import { UpdatesModule } from './UpdatesModule';
import { EditFundraiserForm } from './EditFundraiserForm';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { CheckCircle2, AlertTriangle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FundraiserDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isEditing, setIsEditing] = useState(false);

  const { data: fundraiser, isLoading: loadingFundraiser } = useQuery<Cause>({
    queryKey: ['fundraiser', id],
    queryFn: () => getFundraiser(id),
  });

  const { data: trustReport, isLoading: loadingTrust } = useQuery<TrustReport>({
    queryKey: ['trust-report', id],
    queryFn: () => getTrustReport(id),
    refetchInterval: fundraiser && !fundraiser.activated ? 30000 : false,
  });

  const { data: updates = [] } = useQuery<FundraiserUpdate[]>({
    queryKey: ['updates', id],
    queryFn: () => getUpdates(id),
  });

  if (loadingFundraiser || !fundraiser) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Edit Fundraiser</h2>
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
        <EditFundraiserForm
          fundraiserId={id}
          onSuccess={() => {
            setIsEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative aspect-video w-full rounded-lg overflow-hidden">
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

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{fundraiser.title}</h1>
          <p className="text-muted-foreground">{fundraiser.short_description}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="ml-4"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="overview">
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
              <span className="text-sm text-muted-foreground">Amount Raised</span>
              <p className="text-2xl font-bold">{formatCurrency(fundraiser.amount_raised)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Goal</span>
              <p className="text-2xl font-bold">{formatCurrency(fundraiser.goal_amount)}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trust" className="space-y-4">
          {loadingTrust ? (
            <div>Loading trust report...</div>
          ) : trustReport ? (
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
          ) : (
            <div>No trust report available</div>
          )}
        </TabsContent>

        <TabsContent value="updates" className="space-y-4">
          <UpdatesModule fundraiserId={id} />
          <div className="space-y-4 mt-6">
            {updates.map((update) => (
              <div key={update.id} className="border-b border-border pb-4">
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
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

