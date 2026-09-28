import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../lib/auth';
import { grrrCareApi, setDemoMode } from '../lib/grrrr-care-api';

interface User {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  demoMode: () => void;
  logout: () => Promise<void>;
  // photo is a base64 image picked by the owner; it replaces the current avatar
  updateProfile: (fields: { name: string; photo?: { base64: string; mimeType: string } | null }) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for testing
const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@grrr.care',
  name: 'Demo User',
};

const fromAuthUser = (authUser: any): User => ({
  id: authUser.id,
  email: authUser.email,
  name: authUser.user_metadata?.name,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // The profiles row wins over the session metadata: it is what the other GRRRR apps show
  const loadProfile = (userId: string) => {
    authService
      .getProfile(userId)
      .then(profile => {
        if (!profile) return;
        setUser(current =>
          current?.id === userId
            ? { ...current, name: profile.display_name || current.name, avatarUrl: profile.avatar_url }
            : current
        );
      })
      .catch(error => console.warn('Profile load error:', error));
  };

  useEffect(() => {
    // Check if user is already logged in
    authService
      .getCurrentUser()
      .then(currentUser => {
        if (currentUser) {
          setUser(fromAuthUser(currentUser));
          loadProfile(currentUser.id);
        }
      })
      .catch(() => {
        // No session - this is normal on first load
      })
      .finally(() => setLoading(false));

    // Listen for auth state changes
    const { data } = authService.onAuthStateChange(authUser => {
      if (authUser) {
        // Keeps the loaded avatar and profile name when the session refreshes
        setUser(current =>
          current && current.id === authUser.id ? { ...current, email: authUser.email } : fromAuthUser(authUser)
        );
        setIsDemo(false);
      } else {
        setUser(current => (current?.id === DEMO_USER.id ? current : null));
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
        setUser(fromAuthUser(data.user));
        setIsDemo(false);
        setDemoMode(false);
        loadProfile(data.user.id);
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
        setDemoMode(false);
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
      setDemoMode(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateProfile: AuthContextType['updateProfile'] = async ({ name, photo }) => {
    if (!user) return;
    // In demo mode uploadPetPhoto returns a data URI and nothing is saved
    const avatarUrl = photo ? await grrrCareApi.uploadPetPhoto(user.id, photo.base64, photo.mimeType) : undefined;
    if (!isDemo) {
      await authService.updateProfile(user.id, { name, avatarUrl });
    }
    setUser(current => current && { ...current, name, ...(avatarUrl !== undefined ? { avatarUrl } : {}) });
  };

  const updateEmail = (email: string) => authService.updateEmail(email);
  const updatePassword = (password: string) => authService.updatePassword(password);

  return (
    <AuthContext.Provider
      value={{ user, loading, isDemo, login, register, demoMode, logout, updateProfile, updateEmail, updatePassword }}
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
