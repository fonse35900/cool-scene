import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAudit, fetchRow } from '@/lib/audit';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (user.role === 'comercial') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const db = getDb();
  const investors = await db.prepare('SELECT * FROM investors ORDER BY name').all();
  return NextResponse.json(investors);
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || user.role === 'comercial') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { name, email, phone, notes } = await req.json();
  const db = getDb();

  try {
    const result = await db.prepare(
      'INSERT INTO investors (name, email, phone, notes) VALUES (?, ?, ?, ?)'
    ).run(name, email || null, phone || null, notes || null);
    const created = await fetchRow(db, 'investors', result.lastInsertRowid);
    await recordAudit(db, { entity: 'investors', entityId: result.lastInsertRowid, action: 'insert', actor: user, after: created });
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e) {
    return NextResponse.json({ error: 'Erro ao criar investidor' }, { status: 500 });
  }
}

export async function PUT(req) {
  const user = await getCurrentUser();
  if (!user || user.role === 'comercial' || user.role === 'investidor') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  const { id, name, email, phone, notes } = await req.json();
  if (!id || !name) return NextResponse.json({ error: 'ID e nome obrigatórios' }, { status: 400 });
  const db = getDb();
  const before = await fetchRow(db, 'investors', id);
  await db.prepare('UPDATE investors SET name=?, email=?, phone=?, notes=? WHERE id=?')
    .run(name, email || null, phone || null, notes || null, id);
  const after = await fetchRow(db, 'investors', id);
  await recordAudit(db, { entity: 'investors', entityId: Number(id), action: 'update', actor: user, before, after });
  return NextResponse.json({ success: true });
}

export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { id } = await req.json();
  const db = getDb();
  const before = await fetchRow(db, 'investors', id);
  await db.prepare('UPDATE vehicles SET investor_id = NULL WHERE investor_id = ?').run(id);
  await db.prepare('DELETE FROM investors WHERE id = ?').run(id);
  await recordAudit(db, { entity: 'investors', entityId: Number(id), action: 'delete', actor: user, before });
  return NextResponse.json({ success: true });
}
