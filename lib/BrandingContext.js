'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BRAND } from '@/lib/brand';

const BrandingContext = createContext({
  name: BRAND.name,
  logo: BRAND.logo,
  tagline: BRAND.tagline,
  reload: () => {},
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ name: BRAND.name, logo: BRAND.logo, tagline: BRAND.tagline });

  const reload = useCallback(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const b = { name: d.company_name || BRAND.name, logo: d.logo || BRAND.logo, tagline: d.tagline || BRAND.tagline };
        setBranding(b);
        if (typeof document !== 'undefined' && b.name) document.title = b.name;
      })
      .catch(() => {});
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <BrandingContext.Provider value={{ ...branding, reload }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
