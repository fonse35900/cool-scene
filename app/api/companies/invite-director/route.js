import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Admin invites an email to become the director of a company.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { company_id, email } = await req.json();
  if (!company_id || !email) return NextResponse.json({ error: 'Empresa e email obrigatórios' }, { status: 400 });

  const db = getDb();
  const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(company_id);
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return NextResponse.json({ error: 'Já existe um utilizador com este email' }, { status: 400 });

  const token = randomBytes(32).toString('hex');
  await db.prepare(
    "INSERT INTO invitations (email, investor_id, token, director_id, role, company_id) VALUES (?, NULL, ?, ?, 'director', ?)"
  ).run(email, token, user.id, company_id);

  return NextResponse.json({ token, company_name: company.name });
}
