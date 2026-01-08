"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { apiClient, User } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, otp: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('smartclips_token') : null;
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const result = await apiClient.getMe();
      setUser(result.data || null);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smartclips_token');
        localStorage.removeItem('smartclips_user');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUser();
  }, []); // Empty dependency array to run only once on mount

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await apiClient.signIn(email, password);
    setUser(result.data.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, otp: string) => {
    const result = await apiClient.signUp(name, email, password, otp);
    setUser(result.data.user);
  }, []);

  const signOut = useCallback(() => {
    apiClient.signOut();
    setUser(null);
  }, []);

  const contextValue = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut
  }), [user, loading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}