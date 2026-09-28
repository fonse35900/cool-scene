import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { undoAudit } from '@/lib/audit';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'director')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  const entry = await db.prepare('SELECT * FROM audit_log WHERE id = ?').get(id);
  if (!entry) return NextResponse.json({ error: 'Registo não encontrado' }, { status: 404 });
  if (entry.action === 'undo') return NextResponse.json({ error: 'Não é possível anular uma anulação' }, { status: 400 });

  try {
    await undoAudit(db, entry, user);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('undo error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
