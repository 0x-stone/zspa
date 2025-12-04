'use client';

import { useEffect, useState } from 'react';
import { getTEEStatus, TEEStatus } from '@/lib/api/tee';
import { useUIStore } from '@/lib/stores/uiStore';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function TEEStatusBanner() {
  const [status, setStatus] = useState<TEEStatus | null>(null);
  const { openModal } = useUIStore();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getTEEStatus();
        setStatus(data);
      } catch (error) {
        console.error('Failed to fetch TEE status:', error);
      }
    };

    fetchStatus();
  }, []);

  if (!status) return null;

  const isVerified = status.tee_verified;

  return (
    <button
      onClick={() => openModal('TEEDetails')}
      className={cn(
        'w-full p-3 rounded-lg border transition-colors text-left',
        isVerified
          ? 'bg-secondary/20 border-secondary/50 hover:bg-secondary/30'
          : 'bg-destructive/20 border-destructive/50 hover:bg-destructive/30'
      )}
    >
      <div className="flex items-center gap-2">
        {isVerified ? (
          <ShieldCheck className="h-5 w-5 text-secondary" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        )}
        <span className="text-sm font-medium">
          {isVerified ? '🔒 Private & Verified TEE' : '⚠️ TEE Not Verified'}
        </span>
      </div>
    </button>
  );
}

