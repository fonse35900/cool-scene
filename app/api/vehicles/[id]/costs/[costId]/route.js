import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAudit, fetchRow } from '@/lib/audit';

export async function PUT(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id, costId } = await params;
  const data = await req.json();
  const db = getDb();

  const cost = await db.prepare('SELECT * FROM vehicle_costs WHERE id = ? AND vehicle_id = ?').get(costId, id);
  if (!cost) return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 });

  await db.prepare(`
    UPDATE vehicle_costs SET type = ?, amount = ?, description = ?, date = ? WHERE id = ?
  `).run(
    data.type ?? cost.type,
    data.amount != null ? parseFloat(data.amount) : cost.amount,
    data.description ?? cost.description,
    data.date || cost.date,
    costId
  );

  const after = await fetchRow(db, 'vehicle_costs', costId);
  await recordAudit(db, { entity: 'vehicle_costs', entityId: Number(costId), action: 'update', actor: user, before: cost, after });

  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id, costId } = await params;
  const db = getDb();

  const cost = await db.prepare('SELECT * FROM vehicle_costs WHERE id = ? AND vehicle_id = ?').get(costId, id);
  if (!cost) return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 });

  await db.prepare('DELETE FROM vehicle_costs WHERE id = ?').run(costId);
  await recordAudit(db, { entity: 'vehicle_costs', entityId: Number(costId), action: 'delete', actor: user, before: cost });
  return NextResponse.json({ success: true });
}
