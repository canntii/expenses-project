'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { updateUserDocument } from '@/lib/firebase/firestore/users';

// Import translation files
import esTranslations from '@/i18n/locales/es.json';
import enTranslations from '@/i18n/locales/en.json';

type Translations = typeof esTranslations;

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: Translations;
  availableLanguages: { code: string; name: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Translations> = {
  es: esTranslations,
  en: enTranslations,
};

const availableLanguages = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
];

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<string>('es'); // Default to Spanish

  // Initialize language from user preferences or browser
  useEffect(() => {
    if (user?.language) {
      setLanguageState(user.language);
    } else {
      // Detect browser language
      const browserLang = navigator.language.split('-')[0];
      const supportedLang = availableLanguages.find(l => l.code === browserLang);
      if (supportedLang) {
        setLanguageState(supportedLang.code);
      }
    }
  }, [user]);

  const setLanguage = async (lang: string) => {
    setLanguageState(lang);

    // Persist to Firebase if user is logged in
    if (user) {
      try {
        await updateUserDocument(user.uid, { language: lang });
      } catch (error) {
        console.error('Error updating language preference:', error);
      }
    }
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language] || translations.es,
    availableLanguages,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
