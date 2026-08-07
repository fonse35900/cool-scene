'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext({ lang: 'pt', setLang: () => {}, t: (pt) => pt });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('pt');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('octane_lang');
    if (saved === 'pt' || saved === 'en') {
      setLangState(saved);
      return;
    }
    // No saved preference: detect from the OS / browser language.
    // Portuguese if the primary language is pt (pt, pt-PT, pt-BR, ...); otherwise default to English.
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    const primary = (langs[0] || 'en').toLowerCase();
    setLangState(primary.startsWith('pt') ? 'pt' : 'en');
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
