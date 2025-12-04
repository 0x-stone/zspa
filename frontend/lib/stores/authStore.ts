import { create } from 'zustand';
import { User } from '@/lib/types/api';
import apiClient from '@/lib/api/client';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
  fetchUser: () => Promise<void>;
}

const AUTH_TOKEN_KEY = 'auth_token';

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null,
  user: null,
  isAuthenticated: false,
  
  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    const token = data.access_token;
    
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    set({ token, isAuthenticated: true });
    
    await get().fetchUser();
  },
  
  signup: async (email: string, password: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Signup failed');
    }
    
    // After signup, automatically log in
    await get().login(email, password);
  },
  
  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },
  
  setToken: (token: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    set({ token, isAuthenticated: true });
  },
  
  fetchUser: async () => {
    const { token } = get();
    if (!token) return;
    
    try {
      const response = await apiClient.get('/api/v1/auth/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      console.error('Failed to fetch user:', error);
      get().logout();
    }
  },
}));

// Auto-hydrate user on mount if token exists
if (typeof window !== 'undefined') {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    useAuthStore.getState().setToken(token);
    useAuthStore.getState().fetchUser();
  }
}

