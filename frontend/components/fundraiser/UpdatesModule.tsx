'use client';

import { useState } from 'react';
import { addUpdate } from '@/lib/api/fundraisers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface UpdatesModuleProps {
  fundraiserId: string;
}

export function UpdatesModule({ fundraiserId }: UpdatesModuleProps) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addUpdate(fundraiserId, {
        content,
        image: image || undefined,
      });
      
      toast({
        title: 'Success',
        description: 'Update added!',
      });
      
      setContent('');
      setImage(null);
      queryClient.invalidateQueries({ queryKey: ['updates', fundraiserId] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add update',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-b border-border pb-6">
      <div>
        <Label htmlFor="update-content">Add Update</Label>
        <Textarea
          id="update-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share progress, milestones, or news..."
          rows={4}
        />
      </div>

      <div>
        <Label htmlFor="update-image">Image (optional)</Label>
        <Input
          id="update-image"
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />
      </div>

      <Button type="submit" disabled={isSubmitting || !content.trim()}>
        {isSubmitting ? 'Posting...' : 'Post Update'}
      </Button>
    </form>
  );
}

