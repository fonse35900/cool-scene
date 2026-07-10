import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role === 'comercial' || user.role === 'investidor') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const db = getDb();
  const invitations = db.prepare(`
    SELECT i.*, inv.name as investor_name, u.name as director_name
    FROM invitations i
    JOIN investors inv ON i.investor_id = inv.id
    JOIN users u ON i.director_id = u.id
    ${user.role === 'director' ? 'WHERE i.director_id = ?' : ''}
    ORDER BY i.created_at DESC
  `).all(...(user.role === 'director' ? [user.id] : []));
  return NextResponse.json(invitations);
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'director' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
    const { investor_id, email } = await req.json();
    if (!investor_id || !email) return NextResponse.json({ error: 'Investidor e email obrigatórios' }, { status: 400 });

    const db = getDb();

    const investor = db.prepare('SELECT * FROM investors WHERE id = ?').get(investor_id);
    if (!investor) return NextResponse.json({ error: 'Investidor não encontrado' }, { status: 404 });

    const existing = db.prepare("SELECT id FROM users WHERE email = ? AND role = 'investidor'").get(email);
    if (existing) return NextResponse.json({ error: 'Este email já tem conta de investidor' }, { status: 400 });

    const token = randomBytes(32).toString('hex');

    db.prepare(`
      INSERT INTO invitations (email, investor_id, token, director_id) VALUES (?, ?, ?, ?)
    `).run(email, investor_id, token, user.id);

    return NextResponse.json({ token, investor_name: investor.name });
  } catch (e) {
    console.error('invitations POST error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'director' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const { id } = await req.json();
  const db = getDb();
  db.prepare('DELETE FROM invitations WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
