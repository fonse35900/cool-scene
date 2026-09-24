'use client';
import { LanguageProvider } from '@/lib/LanguageContext';
import { BrandingProvider } from '@/lib/BrandingContext';

export default function Providers({ children, initialBranding }) {
  return (
    <LanguageProvider>
      <BrandingProvider initial={initialBranding}>{children}</BrandingProvider>
    </LanguageProvider>
  );
}
