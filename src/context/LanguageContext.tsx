import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, t } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('language');
      if (saved && (saved === 'en' || saved === 'fr')) {
        setLanguageState(saved);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveLanguagePreference = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('language', lang);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveLanguagePreference(lang);
  };

  const translate = (key: string, params?: Record<string, string>): string => {
    return t(key, language, params);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
