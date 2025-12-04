import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';

export function useAuth() {
  const { token, user, isAuthenticated, fetchUser } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  return {
    token,
    user,
    isAuthenticated,
  };
}

