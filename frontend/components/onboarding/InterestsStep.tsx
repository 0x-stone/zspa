'use client';

import { useState } from 'react';
import { useSessionStore } from '@/lib/stores/sessionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';
import { Plus, X } from 'lucide-react';

const POPULAR_TAGS = [
  'Privacy',
  'Education',
  'Health',
  'Tech',
  'Environment',
  'Children',
  'Water',
  'Shelter',
];

const MAX_TAGS = 5;

interface InterestsStepProps {
  onNext: () => void;
}

export function InterestsStep({ onNext }: InterestsStepProps) {
  const { userInterests, setUserInterests } = useSessionStore();
  const [selectedTags, setSelectedTags] = useState<string[]>(userInterests);
  const [customTag, setCustomTag] = useState('');

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((t) => t !== tag);
      } else {
        if (prev.length >= MAX_TAGS) return prev;
        return [...prev, tag];
      }
    });
  };

  const addCustomTag = () => {
    const trimmedTag = customTag.trim();
    if (!trimmedTag) return;

    // Capitalize first letter for consistency
    const formattedTag = trimmedTag.charAt(0).toUpperCase() + trimmedTag.slice(1);

    // Don't add if already selected or if it's one of the popular tags (handle via toggle logic)
    if (selectedTags.some(t => t.toLowerCase() === formattedTag.toLowerCase())) {
      setCustomTag('');
      return;
    }

    if (selectedTags.length >= MAX_TAGS) return;

    setSelectedTags((prev) => [...prev, formattedTag]);
    setCustomTag('');
  };

  const handleNext = () => {
    setUserInterests(selectedTags);
    onNext();
  };

  const isLimitReached = selectedTags.length >= MAX_TAGS;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-primary">
            What causes do you care about?
          </h2>
          <span className={cn(
            "text-sm font-medium",
            isLimitReached ? "text-destructive" : "text-muted-foreground"
          )}>
            {selectedTags.length}/{MAX_TAGS} Selected
          </span>
        </div>
        <p className="text-muted-foreground">
          Select up to 5 causes. This helps us find relevant fundraisers.
        </p>
      </div>

      {/* Popular Tags */}
      <div className="flex flex-wrap gap-3">
        {POPULAR_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              disabled={!isSelected && isLimitReached}
              className={cn(
                'px-4 py-2 rounded-full border transition-all duration-200',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface border-border hover:border-primary/50',
                (!isSelected && isLimitReached) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Custom Tag Input */}
      <div className="space-y-3 pt-4 border-t border-border">
        <label className="text-sm font-medium text-muted-foreground">
          Or add your own topic:
        </label>
        <div className="flex gap-2">
          <Input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
            placeholder="e.g. Animal Welfare"
            disabled={isLimitReached}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={addCustomTag}
            disabled={!customTag.trim() || isLimitReached}
            variant="secondary"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {isLimitReached && (
          <p className="text-xs text-destructive">
            Maximum of {MAX_TAGS} tags reached. Deselect a tag to add a new one.
          </p>
        )}
      </div>

      {/* Display Custom Tags (those not in popular list) */}
      {selectedTags.some(t => !POPULAR_TAGS.includes(t)) && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.filter(t => !POPULAR_TAGS.includes(t)).map(tag => (
            <div 
              key={tag} 
              className="bg-secondary/20 text-secondary-foreground border border-secondary/30 pl-3 pr-2 py-1 rounded-full flex items-center gap-2 text-sm animate-in fade-in zoom-in-95"
            >
              <span>{tag}</span>
              <button 
                onClick={() => toggleTag(tag)} 
                className="hover:text-destructive transition-colors p-0.5 rounded-full hover:bg-black/10"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={selectedTags.length === 0}
          className="px-8"
        >
          Next
        </Button>
      </div>
    </div>
  );
}