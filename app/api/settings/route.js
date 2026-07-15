import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { BRAND } from '@/lib/brand';

// Public: company branding (name + logo). Used by login/navbar before auth.
export async function GET() {
  const db = getDb();
  const row = await db.prepare('SELECT company_name, logo FROM settings WHERE id = 1').get();
  return NextResponse.json({
    company_name: row?.company_name || BRAND.name,
    logo: row?.logo || BRAND.logo,
    tagline: BRAND.tagline,
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
