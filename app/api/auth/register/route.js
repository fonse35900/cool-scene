import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAudit, fetchRow } from '@/lib/audit';

export async function POST(req) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'director')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { name, email, password, role, phone, director_id } = await req.json();

  if (currentUser.role === 'director' && role !== 'comercial') {
    return NextResponse.json({ error: 'Diretor só pode criar comerciais' }, { status: 403 });
  }

  const assignedDirector = (currentUser.role === 'director' && role === 'comercial')
    ? currentUser.id
    : (director_id || null);

  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);

  try {
    const result = await db.prepare('INSERT INTO users (name, email, password, role, phone, director_id, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      name, email, hash, role, phone || null, assignedDirector, currentUser.company_id
    );
    const created = await fetchRow(db, 'users', result.lastInsertRowid);
    await recordAudit(db, { entity: 'users', entityId: result.lastInsertRowid, action: 'insert', actor: currentUser, after: created });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Email já existe' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar utilizador' }, { status: 500 });
  }
}
