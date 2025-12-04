import apiClient from './client';
import { Cause, TrustReport, FundraiserUpdate, CreateFundraiserPayload } from '@/lib/types/fundraiser';
import { toTitleCase } from '@/lib/utils/formatters';

export async function createFundraiser(data: CreateFundraiserPayload): Promise<Cause> {
  const formData = new FormData();
  
  formData.append('title', data.title);
  formData.append('display_name', data.display_name);
  
  if (data.short_description) {
    formData.append('short_description', data.short_description);
  }
  if (data.long_description) {
    formData.append('long_description', data.long_description);
  }
  if (data.goal_amount) {
    formData.append('goal_amount', data.goal_amount.toString());
  }
  formData.append('preferred_chain', data.preferred_chain);
  formData.append('preferred_token', data.preferred_token);
  
  if (data.wallet_address) {
    formData.append('wallet_address', data.wallet_address);
  }
  if (data.country) {
    // Critical: Convert to Title Case
    formData.append('country', toTitleCase(data.country));
  }
  if (data.city) {
    formData.append('city', data.city);
  }
  if (data.website_url) {
    formData.append('website_url', data.website_url);
  }
  if (data.social_links_json) {
    formData.append('social_links_json', data.social_links_json);
  }
  if (data.tags_json) {
    formData.append('tags_json', data.tags_json);
  }
  if (data.image) {
    formData.append('image', data.image);
  }

  const response = await apiClient.post<Cause>('/api/v1/fundraisers/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
}

export async function updateFundraiser(id: string, data: Partial<CreateFundraiserPayload>): Promise<Cause> {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (key === 'country' && typeof value === 'string') {
        formData.append(key, toTitleCase(value));
      } else if (key === 'image' && value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value.toString());
      }
    }
  });

  const response = await apiClient.patch<Cause>(`/api/v1/fundraisers/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
}

export async function getFundraiser(id: string): Promise<Cause> {
  const response = await apiClient.get<Cause>(`/api/v1/fundraisers/${id}`);
  return response.data;
}

export async function getMyFundraisers(): Promise<Cause[]> {
  const response = await apiClient.get<Cause[]>('/api/v1/auth/my-fundraisers');
  return response.data;
}

export async function getTrustReport(id: string): Promise<TrustReport> {
  const response = await apiClient.get<TrustReport>(`/api/v1/fundraisers/${id}/trust-report`);
  return response.data;
}

export async function addUpdate(id: string, data: { content: string; image?: File }): Promise<FundraiserUpdate> {
  const formData = new FormData();
  formData.append('content', data.content);
  if (data.image) {
    formData.append('image', data.image);
  }

  const response = await apiClient.post<FundraiserUpdate>(`/api/v1/fundraisers/${id}/updates`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
}

export async function getUpdates(id: string): Promise<FundraiserUpdate[]> {
  const response = await apiClient.get<FundraiserUpdate[]>(`/api/v1/fundraisers/${id}/updates`);
  return response.data;
}

export async function getTopRatedFundraisers(limit: number = 10): Promise<Cause[]> {
  const response = await apiClient.get<Cause[]>(`/api/v1/fundraisers/?limit=${limit}&sort=trust_score`);
  return response.data;
}

