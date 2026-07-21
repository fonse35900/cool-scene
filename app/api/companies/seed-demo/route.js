import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { seedDemoCompany } from '@/lib/demoData';

// Load demonstration data for a company. Admin can target any company (body.company_id);
// a director can load it into their own company.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'director')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const company_id = user.role === 'admin' ? body.company_id : user.company_id;
  if (!company_id) return NextResponse.json({ error: 'Empresa obrigatória' }, { status: 400 });

  const locale = body.locale === 'en' ? 'en' : 'pt';

  const db = getDb();
  const company = await db.prepare('SELECT id FROM companies WHERE id = ?').get(company_id);
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  try {
    const result = await seedDemoCompany(db, Number(company_id), user, locale);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
    return NextResponse.json({ success: true, message: result.message });
  } catch (e) {
    console.error('seed-demo error:', e);
    return NextResponse.json({ error: 'Erro ao carregar dados de demonstração: ' + e.message }, { status: 500 });
  }
}
