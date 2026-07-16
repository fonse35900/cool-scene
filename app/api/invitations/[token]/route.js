import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function GET(req, { params }) {
  const { token } = await params;
  const db = getDb();
  const invite = await db.prepare(`
    SELECT i.*, inv.name as investor_name,
      c.name as company_name, c.logo as company_logo, c.branding_configured as company_configured
    FROM invitations i
    LEFT JOIN investors inv ON i.investor_id = inv.id
    LEFT JOIN companies c ON i.company_id = c.id
    WHERE i.token = ? AND i.accepted_at IS NULL
  `).get(token);
  if (!invite) return NextResponse.json({ error: 'Convite inválido ou já utilizado' }, { status: 404 });
  // Only company 1 uses the default logo; every other company shows strictly
  // its own logo (or none), so an invite never displays another company's brand.
  return NextResponse.json({
    email: invite.email,
    role: invite.role || 'investidor',
    investor_name: invite.investor_name,
    company_name: invite.company_name,
    company_id: invite.company_id,
    company_logo: invite.company_id === 1 ? invite.company_logo : (invite.company_logo || null),
  });
}

export async function POST(req, { params }) {
  const { token } = await params;
  const { name, password } = await req.json();
  if (!name || !password || password.length < 6) {
    return NextResponse.json({ error: 'Nome e password (mín. 6 caracteres) obrigatórios' }, { status: 400 });
  }

  const db = getDb();
  const invite = await db.prepare(
    'SELECT * FROM invitations WHERE token = ? AND accepted_at IS NULL'
  ).get(token);
  if (!invite) return NextResponse.json({ error: 'Convite inválido ou já utilizado' }, { status: 404 });

  const hash = bcrypt.hashSync(password, 10);
  const role = invite.role || 'investidor';

  let result;
  if (role === 'director') {
    result = await db.prepare(
      "INSERT INTO users (name, email, password, role, company_id) VALUES (?, ?, ?, 'director', ?)"
    ).run(name, invite.email, hash, invite.company_id);
  } else {
    // Investor: inherit the inviting director's company
    const director = await db.prepare('SELECT company_id FROM users WHERE id = ?').get(invite.director_id);
    result = await db.prepare(
      "INSERT INTO users (name, email, password, role, investor_id, director_id, company_id) VALUES (?, ?, ?, 'investidor', ?, ?, ?)"
    ).run(name, invite.email, hash, invite.investor_id, invite.director_id, director?.company_id ?? null);
  }

  await db.prepare("UPDATE invitations SET accepted_at = datetime('now') WHERE token = ?").run(token);

  const user = await db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const authToken = signToken(user);
  const res = NextResponse.json({ success: true, role });
  res.cookies.set('token', authToken, { httpOnly: true, path: '/', maxAge: 86400, sameSite: 'lax' });
  return res;
}
