import { createContext, useContext, useState, useCallback } from 'react';

const LanguageContext = createContext(null);

const SUPPORTED_LANGS = ['it', 'en'];
const DEFAULT_LANG = 'it';

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const stored = localStorage.getItem('herion_lang');
    return SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;
  });

  const switchLang = useCallback((newLang) => {
    if (SUPPORTED_LANGS.includes(newLang)) {
      setLang(newLang);
      localStorage.setItem('herion_lang', newLang);
    }
  }, []);

  const toggle = useCallback(() => {
    const next = lang === 'it' ? 'en' : 'it';
    switchLang(next);
  }, [lang, switchLang]);

  return (
    <LanguageContext.Provider value={{ lang, switchLang, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
