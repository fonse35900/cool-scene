'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BRAND } from '@/lib/brand';
import { paletteCss, DEFAULT_PALETTE } from '@/lib/palettes';

const BrandingContext = createContext({
  name: BRAND.name,
  logo: BRAND.logo,
  tagline: BRAND.tagline,
  configured: true,
  palette: DEFAULT_PALETTE,
  reload: () => {},
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({ name: BRAND.name, logo: BRAND.logo, tagline: BRAND.tagline, configured: true, palette: DEFAULT_PALETTE });

  const reload = useCallback((companyId) => {
    const url = companyId ? `/api/settings?company=${companyId}` : '/api/settings';
    fetch(url)
      .then(r => r.json())
      .then(d => {
        // Trust the server's resolved branding. The default brand logo/name is
        // only ever returned for company 1; every other company shows its own
        // logo or nothing at all, so it never inherits another company's identity.
        const b = {
          name: d.company_name || '',
          logo: d.logo || null,
          tagline: d.tagline || BRAND.tagline,
          configured: d.configured !== false,
          palette: d.palette || DEFAULT_PALETTE,
        };
        setBranding(b);
        if (typeof document !== 'undefined') document.title = b.name || BRAND.tagline || 'ASMS';
      })
      .catch(() => {});
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <BrandingContext.Provider value={{ ...branding, reload }}>
      <style id="octane-palette" dangerouslySetInnerHTML={{ __html: paletteCss(branding.palette) }} />
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
