'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createFundraiser } from '@/lib/api/fundraisers';
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
import { Token, CreateFundraiserPayload } from '@/lib/types/fundraiser';
import { toTitleCase } from '@/lib/utils/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, AlertTriangle } from 'lucide-react';

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  display_name: z.string().min(1, 'Display name is required'),
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  goal_amount: z.number().optional(),
  preferred_chain: z.string().min(1, 'Chain is required'),
  preferred_token: z.string().min(1, 'Token is required'),
  wallet_address: z.string().min(1, 'Wallet address is required'),
  country: z.string().optional(),
  city: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  social_links: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  image: z.instanceof(File).optional(),
});

type FormData = z.infer<typeof formSchema>;

export function CreateFundraiserForm() {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [chains, setChains] = useState<string[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [socialLinks, setSocialLinks] = useState<string[]>(['']);
  const [tags, setTags] = useState<string[]>(['']);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
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
    if (selectedChain) {
      const filtered = tokens.filter((t) => t.blockchain === selectedChain);
      setAvailableTokens(filtered);
      setValue('preferred_token', '');
    }
  }, [selectedChain, tokens, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      const imageInput = document.querySelector<HTMLInputElement>('input[type="file"]');
      const imageFile = imageInput?.files?.[0];

      const payload: CreateFundraiserPayload = {
        title: data.title,
        display_name: data.display_name,
        preferred_chain: data.preferred_chain,
        preferred_token: data.preferred_token,
        short_description: data.short_description,
        long_description: data.long_description,
        goal_amount: data.goal_amount,
        wallet_address: data.wallet_address,
        country: data.country,
        city: data.city,
        website_url: data.website_url,
        social_links_json: socialLinks.filter(l => l.trim()).length > 0 
          ? JSON.stringify(socialLinks.filter(l => l.trim())) 
          : undefined,
        tags_json: tags.filter(t => t.trim()).length > 0 
          ? JSON.stringify(tags.filter(t => t.trim())) 
          : undefined,
        image: imageFile
      };

      await createFundraiser(payload);
      
      toast({
        title: 'Success',
        description: 'Fundraiser created! Trust score is being calculated.',
      });
      
      router.push('/fundraisers/my-fundraisers');
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create fundraiser',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Your Trust Score will be calculated based on your social links, website verification, and audit history.
              You can check the status in the 'My Fundraisers' tab.
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

      <div className="space-y-2">
        <Label htmlFor="wallet_address">Wallet Address *</Label>
        <Input 
          id="wallet_address" 
          placeholder="Enter your wallet address"
          {...register('wallet_address')} 
        />
        <div className="flex items-start gap-2 text-yellow-600 mt-1">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="text-xs">
            Important: Ensure this address is correct. Changing it later will significantly reduce your Trust Score and may require re-verification.
          </p>
        </div>
        {errors.wallet_address && <p className="text-sm text-destructive">{errors.wallet_address.message}</p>}
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
        <Select onValueChange={(value) => setValue('country', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {COUNTRIES.map((country) => (
              <SelectItem key={country} value={country}>
                {country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            className="mb-2"
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
            className="mb-2"
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
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating...' : 'Create Fundraiser'}
      </Button>
    </form>
  );
}