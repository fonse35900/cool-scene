import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// List companies. Admin sees all; others see only their own company.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getDb();
  let companies;
  if (user.role === 'admin') {
    companies = await db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) as users_count,
        (SELECT name FROM users u WHERE u.company_id = c.id AND u.role = 'director' ORDER BY u.id LIMIT 1) as director_name,
        (SELECT email FROM users u WHERE u.company_id = c.id AND u.role = 'director' ORDER BY u.id LIMIT 1) as director_email
      FROM companies c ORDER BY c.id
    `).all();
  } else {
    companies = await db.prepare('SELECT * FROM companies WHERE id = ?').all(user.company_id);
  }
  return NextResponse.json(companies);
}

// Create a new client company (admin only).
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const db = getDb();
  const res = await db.prepare('INSERT INTO companies (name) VALUES (?)').run(name);
  return NextResponse.json({ id: res.lastInsertRowid });
}

// Update the current user's company (name/logo). Admin can update any via body.id.
export async function PUT(req) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'director')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id, name, logo } = await req.json();
  const targetId = user.role === 'admin' && id ? id : user.company_id;

  // A director can only edit their own company
  if (user.role === 'director' && targetId !== user.company_id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  if (logo && logo.length > 1_500_000) {
    return NextResponse.json({ error: 'Logótipo demasiado grande (máx. ~1MB)' }, { status: 400 });
  }

  const db = getDb();
  await db.prepare('UPDATE companies SET name = COALESCE(?, name), logo = COALESCE(?, logo) WHERE id = ?')
    .run(name ?? null, logo ?? null, targetId);
  return NextResponse.json({ success: true });
}
