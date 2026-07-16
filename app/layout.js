import './globals.css';
import Providers from '@/components/Providers';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { paletteCss, DEFAULT_PALETTE } from '@/lib/palettes';

export const metadata = {
  title: 'OCTANE - Car Dealer & Collector',
  description: 'Gestão de viaturas OCTANE',
};

// Resolve the current company's palette on the server so the correct colors are
// present in the very first paint on every page, avoiding a flash of the
// previous palette on navigation.
async function getInitialPalette() {
  try {
    const user = await getCurrentUser();
    if (!user?.company_id) return DEFAULT_PALETTE;
    const db = getDb();
    const company = await db.prepare('SELECT palette FROM companies WHERE id = ?').get(user.company_id);
    return company?.palette || DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

export default async function RootLayout({ children }) {
  const palette = await getInitialPalette();
  const css = paletteCss(palette);
  return (
    <html lang="pt">
      <head>
        {css && <style id="octane-palette-ssr" dangerouslySetInnerHTML={{ __html: css }} />}
      </head>
      <body className="bg-octane-black min-h-screen text-octane-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
