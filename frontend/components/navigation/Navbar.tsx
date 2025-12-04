'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { Button } from '@/components/ui/button';
import { ProfileDropdown } from './ProfileDropdown';

export function Navbar() {
  const { isAuthenticated } = useAuthStore();
  const { openModal } = useUIStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          Zcash Philanthropy
        </Link>

        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <>
              <Button
                variant="outline"
                onClick={() => openModal('Auth')}
              >
                Create Fundraiser
              </Button>
            </>
          ) : (
            <>
              <Link href="/fundraisers/create">
                <Button variant="outline">Create Fundraiser</Button>
              </Link>
              <Link href="/fundraisers/my-fundraisers">
                <Button variant="ghost">My Fundraisers</Button>
              </Link>
              <ProfileDropdown />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

