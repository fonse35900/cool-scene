import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAudit, fetchRow } from '@/lib/audit';

export async function GET(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const investorId = searchParams.get('investor_id');

  let id = investorId;
  if (user.role === 'investidor') id = user.investor_id;
  if (!id) return NextResponse.json({ error: 'Investidor não especificado' }, { status: 400 });

  const contributions = await db.prepare('SELECT * FROM investor_contributions WHERE investor_id = ? ORDER BY date DESC').all(id);
  return NextResponse.json(contributions);
}

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'director' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
    const { investor_id, amount, notes, date } = await req.json();
    const db = getDb();
    const result = await db.prepare(
      'INSERT INTO investor_contributions (investor_id, amount, notes, date) VALUES (?, ?, ?, ?)'
    ).run(investor_id, amount, notes || null, date || new Date().toISOString());
    const created = await fetchRow(db, 'investor_contributions', result.lastInsertRowid);
    await recordAudit(db, { entity: 'investor_contributions', entityId: result.lastInsertRowid, action: 'insert', actor: user, after: created });
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e) {
    console.error('contributions POST error:', e);
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
  const before = await fetchRow(db, 'investor_contributions', id);
  await db.prepare('DELETE FROM investor_contributions WHERE id = ?').run(id);
  await recordAudit(db, { entity: 'investor_contributions', entityId: Number(id), action: 'delete', actor: user, before });
  return NextResponse.json({ success: true });
}
