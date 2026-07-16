'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BRAND } from '@/lib/brand';

const BrandingContext = createContext({
  name: BRAND.name,
  logo: BRAND.logo,
  tagline: BRAND.tagline,
  configured: true,
  reload: () => {},
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ name: BRAND.name, logo: BRAND.logo, tagline: BRAND.tagline, configured: true });

  const reload = useCallback((companyId) => {
    const url = companyId ? `/api/settings?company=${companyId}` : '/api/settings';
    fetch(url)
      .then(r => r.json())
      .then(d => {
        // When a company hasn't configured its branding yet, keep it neutral
        // (no logo, no name) instead of falling back to the default brand.
        const configured = d.configured !== false;
        const b = configured
          ? { name: d.company_name || BRAND.name, logo: d.logo || BRAND.logo, tagline: d.tagline || BRAND.tagline, configured: true }
          : { name: '', logo: null, tagline: d.tagline || BRAND.tagline, configured: false };
        setBranding(b);
        if (typeof document !== 'undefined') document.title = b.name || BRAND.tagline || 'ASMS';
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
