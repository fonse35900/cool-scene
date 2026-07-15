'use client';
import { LanguageProvider } from '@/lib/LanguageContext';
import { BrandingProvider } from '@/lib/BrandingContext';

export default function Providers({ children }) {
  return (
    <LanguageProvider>
      <BrandingProvider>{children}</BrandingProvider>
    </LanguageProvider>
  );
}
