'use client';
import { LanguageProvider } from '@/lib/LanguageContext';
import { BrandingProvider } from '@/lib/BrandingContext';
import TrialBanner from '@/components/TrialBanner';

export default function Providers({ children, initialBranding }) {
  return (
    <LanguageProvider>
      <BrandingProvider initial={initialBranding}>
        <TrialBanner />
        {children}
      </BrandingProvider>
    </LanguageProvider>
  );
}
