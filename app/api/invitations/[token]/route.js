import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function GET(req, { params }) {
  const { token } = await params;
  const db = getDb();
  const invite = db.prepare(`
    SELECT i.*, inv.name as investor_name, inv.id as inv_id
    FROM invitations i JOIN investors inv ON i.investor_id = inv.id
    WHERE i.token = ? AND i.accepted_at IS NULL
  `).get(token);
  if (!invite) return NextResponse.json({ error: 'Convite inválido ou já utilizado' }, { status: 404 });
  return NextResponse.json({ email: invite.email, investor_name: invite.investor_name });
}

export async function POST(req, { params }) {
  const { token } = await params;
  const { name, password } = await req.json();
  if (!name || !password || password.length < 6) {
    return NextResponse.json({ error: 'Nome e password (mín. 6 caracteres) obrigatórios' }, { status: 400 });
  }

  const db = getDb();
  const invite = db.prepare(`
    SELECT * FROM invitations WHERE token = ? AND accepted_at IS NULL
  `).get(token);
  if (!invite) return NextResponse.json({ error: 'Convite inválido ou já utilizado' }, { status: 404 });

  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, investor_id, director_id) VALUES (?, ?, ?, 'investidor', ?, ?)
  `).run(name, invite.email, hash, invite.investor_id, invite.director_id);

  db.prepare("UPDATE invitations SET accepted_at = datetime('now') WHERE token = ?").run(token);

  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  const authToken = signToken(user);
  const res = NextResponse.json({ success: true });
  res.cookies.set('token', authToken, { httpOnly: true, path: '/', maxAge: 86400, sameSite: 'lax' });
  return res;
}
