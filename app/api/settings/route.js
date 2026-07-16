import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BRAND } from '@/lib/brand';

// Branding (name + logo). Returns the current user's company when authenticated,
// otherwise the default (company 1) so the login page has a logo.
export async function GET(req) {
  const db = getDb();
  const user = await getCurrentUser();
  // Authenticated users see their own company. An unauthenticated caller may
  // pass ?company=<id> (invite context) so the invite screen reflects that
  // company's branding state instead of always defaulting to company 1.
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get('company');
  const companyId = user?.company_id || (requested ? parseInt(requested) : 1);
  const company = await db.prepare('SELECT name, logo, branding_configured FROM companies WHERE id = ?').get(companyId);

  // Until a company's director configures its branding, show neutral placeholders
  // (no logo, no name) instead of inheriting the default brand. Company 1 and any
  // already-configured company keep their branding.
  const configured = company ? company.branding_configured === 1 : true;
  if (company && !configured) {
    return NextResponse.json({ company_name: '', logo: null, tagline: BRAND.tagline, configured: false });
  }

  return NextResponse.json({
    company_name: company?.name || BRAND.name,
    logo: company?.logo || BRAND.logo,
    tagline: BRAND.tagline,
    configured: true,
  });
}

export async function PUT(req) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'director')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { company_name, logo } = await req.json();

  // Guard against oversized logos (data URIs). ~1.5MB base64 limit.
  if (logo && logo.length > 1_500_000) {
    return NextResponse.json({ error: 'Logótipo demasiado grande (máx. ~1MB)' }, { status: 400 });
  }

  const db = getDb();
  await db.prepare(
    "UPDATE settings SET company_name = COALESCE(?, company_name), logo = COALESCE(?, logo), updated_at = datetime('now') WHERE id = 1"
  ).run(company_name ?? null, logo ?? null);

  return NextResponse.json({ success: true });
}
