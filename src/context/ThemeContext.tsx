import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  colors: any;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
  themeMode: 'light' | 'dark' | 'auto';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('themeMode');
      if (saved) {
        setThemeMode(saved as 'light' | 'dark' | 'auto');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveThemePreference = async (mode: 'light' | 'dark' | 'auto') => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    saveThemePreference(newMode);
  };

  const handleSetThemeMode = (mode: 'light' | 'dark' | 'auto') => {
    setThemeMode(mode);
    saveThemePreference(mode);
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'auto' && systemColorScheme === 'dark');
  const colors = Colors[isDark ? 'dark' : 'light'];

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme, setThemeMode: handleSetThemeMode, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
