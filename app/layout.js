import './globals.css';
import Providers from '@/components/Providers';
import { paletteCss } from '@/lib/palettes';
import { getServerBranding } from '@/lib/serverBranding';

export const metadata = {
  title: 'OCTANE - Car Dealer & Collector',
  description: 'Gestão de viaturas OCTANE',
};

export default async function RootLayout({ children }) {
  // Resolve branding (logo/name/palette) on the server so the correct identity
  // is present in the very first paint on every page, avoiding a flash of the
  // default brand or previous palette when navigating between pages.
  const branding = await getServerBranding();
  const css = paletteCss(branding.palette);
  return (
    <html lang="pt">
      <body className="bg-octane-black min-h-screen text-octane-white">
        {/* Palette injected at the top of body (a :root style still applies globally)
            so we don't render a manual <head>, which can interfere with Next's
            automatic stylesheet injection. */}
        {css && <style id="octane-palette-ssr" dangerouslySetInnerHTML={{ __html: css }} />}
        <Providers initialBranding={branding}>{children}</Providers>
      </body>
    </html>
  );
}
