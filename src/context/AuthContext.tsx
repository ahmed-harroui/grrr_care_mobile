import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../lib/auth';
import { setDemoMode } from '../lib/grrrr-care-api';

interface User {
  id: string;
  email?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  demoMode: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for testing
const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@grrr.care',
  name: 'Demo User',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    authService
      .getCurrentUser()
      .then(currentUser => {
        if (currentUser) {
          setUser({
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.user_metadata?.name,
          });
        }
      })
      .catch(() => {
        // No session - this is normal on first load
      })
      .finally(() => setLoading(false));

    // Listen for auth state changes
    const { data } = authService.onAuthStateChange(authUser => {
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name,
        });
        setIsDemo(false);
      } else {
        setUser(null);
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authService.loginWithEmail(email, password);
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name,
        });
        setIsDemo(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const data = await authService.register(email, password, name);
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name,
        });
        setIsDemo(false);
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const demoMode = () => {
    setUser(DEMO_USER);
    setIsDemo(true);
    setDemoMode(true);
  };

  const logout = async () => {
    try {
      if (!isDemo) {
        await authService.logout();
      }
      setUser(null);
      setIsDemo(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isDemo, login, register, demoMode, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
