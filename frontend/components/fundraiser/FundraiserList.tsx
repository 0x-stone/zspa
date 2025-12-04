'use client';

import { useEffect, useState } from 'react';
import { getMyFundraisers } from '@/lib/api/fundraisers';
import { Cause } from '@/lib/types/fundraiser';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/formatters';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

export function FundraiserList() {
  const [fundraisers, setFundraisers] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFundraisers = async () => {
      try {
        const data = await getMyFundraisers();
        setFundraisers(data);
      } catch (error) {
        console.error('Failed to fetch fundraisers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFundraisers();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (fundraisers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">You haven't created any fundraisers yet.</p>
        <Link href="/fundraisers/create">
          <Button>Create Your First Fundraiser</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {fundraisers.map((fundraiser) => (
        <Card key={fundraiser.id} className="hover:shadow-lg transition-shadow">
          <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
            <Image
              src={fundraiser.image_url || '/placeholder.png'}
              alt={fundraiser.title}
              fill
              className="object-cover"
            />
            <div className="absolute top-2 right-2">
              <Badge variant={fundraiser.activated ? 'default' : 'secondary'}>
                {fundraiser.activated ? 'Activated' : 'Pending'}
              </Badge>
            </div>
          </div>
          <CardContent className="p-4">
            <h3 className="font-bold text-lg mb-2">{fundraiser.title}</h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {fundraiser.short_description}
            </p>
            <div className="text-sm">
              <span className="text-muted-foreground">
                {formatCurrency(fundraiser.amount_raised)} raised
              </span>
              {' / '}
              <span className="text-muted-foreground">
                {formatCurrency(fundraiser.goal_amount)}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Link href={`/fundraisers/${fundraiser.id}`} className="w-full">
              <Button className="w-full">View Details</Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

