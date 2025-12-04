'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { updateFundraiser, getFundraiser } from '@/lib/api/fundraisers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import { Token } from '@/lib/types/fundraiser';
import { toTitleCase } from '@/lib/utils/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  display_name: z.string().min(1, 'Display name is required'),
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  goal_amount: z.number().optional(),
  preferred_chain: z.string().min(1, 'Chain is required'),
  preferred_token: z.string().min(1, 'Token is required'),
  wallet_address: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  social_links: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  image: z.instanceof(File).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditFundraiserFormProps {
  fundraiserId: string;
  onSuccess?: () => void;
}

export function EditFundraiserForm({ fundraiserId, onSuccess }: EditFundraiserFormProps) {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [chains, setChains] = useState<string[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [socialLinks, setSocialLinks] = useState<string[]>(['']);
  const [tags, setTags] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    fetch('/tokens.json')
      .then((res) => res.json())
      .then((data: Token[]) => {
        setTokens(data);
        const uniqueChains = Array.from(new Set(data.map((t) => t.blockchain)));
        setChains(uniqueChains);
      });
  }, []);

  useEffect(() => {
    const loadFundraiser = async () => {
      try {
        const fundraiser = await getFundraiser(fundraiserId);
        reset({
          title: fundraiser.title,
          display_name: fundraiser.display_name,
          short_description: fundraiser.short_description || '',
          long_description: fundraiser.long_description || '',
          goal_amount: fundraiser.goal_amount || undefined,
          preferred_chain: fundraiser.preferred_chain,
          preferred_token: fundraiser.preferred_token,
          wallet_address: fundraiser.wallet_address || '',
          country: fundraiser.country || '',
          city: fundraiser.city || '',
          website_url: fundraiser.website_url || '',
        });
        setSelectedChain(fundraiser.preferred_chain);
        if (fundraiser.social_links && fundraiser.social_links.length > 0) {
          setSocialLinks(fundraiser.social_links);
        }
        if (fundraiser.tags && fundraiser.tags.length > 0) {
          setTags(fundraiser.tags);
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load fundraiser data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFundraiser();
  }, [fundraiserId, reset]);

  useEffect(() => {
    if (selectedChain) {
      const filtered = tokens.filter((t) => t.blockchain === selectedChain);
      setAvailableTokens(filtered);
    }
  }, [selectedChain, tokens]);

  const onSubmit = async (data: FormData) => {
    try {
      const formData = new FormData();
      
      // Required fields
      formData.append('title', data.title || '');
      formData.append('display_name', data.display_name || '');
      formData.append('preferred_chain', data.preferred_chain || '');
      formData.append('preferred_token', data.preferred_token || '');
      
      // Optional fields
      if (data.short_description && data.short_description.trim()) {
        formData.append('short_description', data.short_description);
      }
      if (data.long_description && data.long_description.trim()) {
        formData.append('long_description', data.long_description);
      }
      if (data.goal_amount && data.goal_amount > 0) {
        formData.append('goal_amount', data.goal_amount.toString());
      }
      if (data.wallet_address && data.wallet_address.trim()) {
        formData.append('wallet_address', data.wallet_address);
      }
      if (data.country && data.country.trim()) {
        formData.append('country', toTitleCase(data.country));
      }
      if (data.city && data.city.trim()) {
        formData.append('city', data.city);
      }
      if (data.website_url && data.website_url.trim()) {
        formData.append('website_url', data.website_url);
      }
      
      const validSocialLinks = socialLinks.filter((link) => link.trim());
      if (validSocialLinks.length > 0) {
        formData.append('social_links_json', JSON.stringify(validSocialLinks));
      }
      
      const validTags = tags.filter((tag) => tag.trim());
      if (validTags.length > 0) {
        formData.append('tags_json', JSON.stringify(validTags));
      }

      const imageInput = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (imageInput?.files?.[0]) {
        formData.append('image', imageInput.files[0]);
      }

      await updateFundraiser(fundraiserId, formData as any);
      
      toast({
        title: 'Success',
        description: 'Fundraiser updated successfully!',
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/fundraisers/${fundraiserId}`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update fundraiser',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Your Trust Score will be recalculated based on your updated information.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_name">Display Name *</Label>
        <Input id="display_name" {...register('display_name')} />
        {errors.display_name && <p className="text-sm text-destructive">{errors.display_name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="short_description">Short Description</Label>
        <Textarea id="short_description" {...register('short_description')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="long_description">Long Description</Label>
        <Textarea id="long_description" {...register('long_description')} rows={6} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preferred_chain">Preferred Chain *</Label>
          <Select
            value={selectedChain}
            onValueChange={(value) => {
              setSelectedChain(value);
              setValue('preferred_chain', value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select chain" />
            </SelectTrigger>
            <SelectContent>
              {chains.map((chain) => (
                <SelectItem key={chain} value={chain}>
                  {chain.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferred_token">Preferred Token *</Label>
          <Select
            onValueChange={(value) => setValue('preferred_token', value)}
            disabled={!selectedChain}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent>
              {availableTokens.map((token) => (
                <SelectItem key={token.assetId} value={token.symbol}>
                  {token.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal_amount">Goal Amount (USD)</Label>
        <Input
          id="goal_amount"
          type="number"
          step="0.01"
          {...register('goal_amount', { valueAsNumber: true })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Input id="country" {...register('country')} placeholder="e.g., Nigeria" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" {...register('city')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="website_url">Website URL</Label>
        <Input id="website_url" type="url" {...register('website_url')} />
      </div>

      <div className="space-y-2">
        <Label>Social Links</Label>
        {socialLinks.map((link, idx) => (
          <Input
            key={idx}
            value={link}
            onChange={(e) => {
              const newLinks = [...socialLinks];
              newLinks[idx] = e.target.value;
              setSocialLinks(newLinks);
            }}
            placeholder="https://..."
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSocialLinks([...socialLinks, ''])}
        >
          Add Link
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        {tags.map((tag, idx) => (
          <Input
            key={idx}
            value={tag}
            onChange={(e) => {
              const newTags = [...tags];
              newTags[idx] = e.target.value;
              setTags(newTags);
            }}
            placeholder="Tag name"
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTags([...tags, ''])}
        >
          Add Tag
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Image</Label>
        <Input id="image" type="file" accept="image/*" />
        <p className="text-xs text-muted-foreground">Leave empty to keep current image</p>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Updating...' : 'Update Fundraiser'}
      </Button>
    </form>
  );
}

