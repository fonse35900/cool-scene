import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BRAND } from '@/lib/brand';
import { DEFAULT_PALETTE } from '@/lib/palettes';

// Resolves the branding for the current request on the server, using the exact
// same rules as /api/settings. Used by the root layout to seed the branding
// provider so the correct logo/name/palette are present on the first paint,
// avoiding a flash of the default brand when navigating between pages.
export async function getServerBranding() {
  const fallback = { name: '', logo: null, tagline: BRAND.tagline, configured: true, palette: DEFAULT_PALETTE };
  try {
    const user = await getCurrentUser();
    const companyId = user?.company_id || 1;
    const db = getDb();
    const company = await db.prepare('SELECT name, logo, branding_configured, palette FROM companies WHERE id = ?').get(companyId);
    const palette = company?.palette || DEFAULT_PALETTE;

    // Only company 1 uses the default brand logo/name; every other company shows
    // strictly its own logo (or none) so it never inherits another company's identity.
    if (companyId === 1 || !company) {
      return {
        name: company?.name || BRAND.name,
        logo: company?.logo || BRAND.logo,
        tagline: BRAND.tagline,
        configured: true,
        palette,
      };
    }

    const configured = company.branding_configured === 1;
    return {
      name: configured ? (company.name || '') : '',
      logo: company.logo || null,
      tagline: BRAND.tagline,
      configured,
      palette,
    };
  } catch {
    return fallback;
  }
}
