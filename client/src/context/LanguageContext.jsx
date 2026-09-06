/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { th } from '../i18n/th';
import { en } from '../i18n/en';

const LanguageContext = createContext();

const dictionaries = { th, en };

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('kku_sportpass_lang');
      return (saved === 'en' || saved === 'th') ? saved : 'th';
    } catch {
      return 'th';
    }
  });

  const setLanguage = (lang) => {
    if (lang === 'th' || lang === 'en') {
      setLanguageState(lang);
      try {
        localStorage.setItem('kku_sportpass_lang', lang);
      } catch {}
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'th' ? 'en' : 'th');
  };

  const t = (key, fallback = '') => {
    const dict = dictionaries[language] || dictionaries.th;
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    // Fallback to Thai dictionary first, then provided fallback, then key
    if (dictionaries.th[key] !== undefined) {
      return dictionaries.th[key];
    }
    return fallback || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback safe dummy context
    return {
      language: 'th',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key, fallback) => th[key] || fallback || key
    };
  }
  return ctx;
}
