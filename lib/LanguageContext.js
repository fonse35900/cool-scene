'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext({ lang: 'pt', setLang: () => {}, t: (pt) => pt });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('pt');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('octane_lang') : null;
    if (saved === 'pt' || saved === 'en') setLangState(saved);
  }, []);

  const setLang = useCallback((l) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('octane_lang', l);
  }, []);

  // t(pt, en) returns the string for the active language (falls back to pt)
  const t = useCallback((pt, en) => (lang === 'en' && en !== undefined ? en : pt), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
