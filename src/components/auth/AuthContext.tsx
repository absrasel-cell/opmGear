'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@/lib/supabase-ssr';

interface User {
  id: string;
  email: string;
  name: string | null;
  accessRole: 'CUSTOMER' | 'STAFF' | 'SUPER_ADMIN' | 'MASTER_ADMIN';
  customerRole: 'RETAIL' | 'WHOLESALE' | 'SUPPLIER';
  phone?: string;
  company?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Create Supabase client instance
  const supabase = createClientComponentClient();

  console.log('🏗️ AuthProvider: Rendering - isHydrated:', isHydrated, 'loading:', loading);
  // HYDRATION FIX - React 18 + Modern Supabase SSR

  const checkAuth = useCallback(async () => {
    if (!isHydrated) {
      console.log('⏳ AuthContext: Skipping checkAuth - not hydrated yet');
      return;
    }

    try {
      console.log('AuthContext: Checking session...');
      const response = await fetch('/api/auth/session');
      console.log('AuthContext: Session response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('AuthContext: Session response:', data);
        if (data.user) {
          console.log('AuthContext: Setting user from session:', data.user);
          setUser(data.user);
        } else {
          console.log('AuthContext: No user in session response');
          setUser(null);
        }
      } else {
        console.log('AuthContext: Session check failed with status:', response.status);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [isHydrated]);

  // Hydration effect - CRITICAL for client-side functionality
  useEffect(() => {
    console.log('🚀 AuthProvider: HYDRATION SUCCESSFUL - Client-side mount confirmed!');
    setIsHydrated(true);
  }, []);

  // Auth initialization effect - runs after hydration
  useEffect(() => {
    if (!isHydrated) {
      console.log('⏳ AuthProvider: Waiting for hydration before initializing auth');
      return;
    }

    console.log('🔧 AuthProvider: Starting auth initialization after hydration');
    
    // Initialize auth state immediately
    checkAuth();

    // Listen for auth state changes
    console.log('📡 AuthProvider: Setting up Supabase auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthContext: Auth state changed:', { event, hasSession: !!session });
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('✅ AuthContext: User signed in, refreshing auth state');
        await checkAuth();
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 AuthContext: User signed out, clearing state');
        setUser(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        console.log('🎯 AuthContext: Initial session loaded');
        await checkAuth();
      }
    });

    return () => {
      console.log('🧹 AuthContext: Cleaning up auth state listener');
      subscription.unsubscribe();
    };
  }, [isHydrated, checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Attempting login for:', email);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        const textResponse = await response.text();
        console.log('Raw server response:', textResponse);
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('Failed to parse server response:', parseError);
        throw new Error('Invalid server response');
      }
      
      if (!response.ok) {
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        
        // Show specific error messages based on the response
        if (response.status === 401) {
          throw new Error(data.error || 'Invalid email or password');
        } else if (response.status === 400) {
          throw new Error(data.error || 'Please check your input');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(data.error || data.details || 'Login failed');
        }
      }
      console.log('AuthContext: Login successful, setting user:', data.user);
      setUser(data.user);
      setLoading(false); // Ensure loading is false after successful login
      console.log('AuthContext: User state updated, isAuthenticated should now be true');
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Starting logout...');
      setLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      console.log('AuthContext: Logout successful, clearing user state');
      setUser(null);
      setLoading(false);
      console.log('AuthContext: Logout complete, loading set to false');
    } catch (error) {
      console.error('Logout failed:', error);
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      console.log('AuthContext: Refreshing session...');
      await checkAuth();
    } catch (error) {
      console.error('AuthContext: Session refresh error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: loading || !isHydrated, // Keep loading until hydrated
        login,
        register,
        logout,
        isAuthenticated: !!user && isHydrated,
        checkAuth,
        refreshSession,
      }}
    >
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