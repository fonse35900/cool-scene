import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getBackup, diffAdded } from '@/lib/backup';

function allowed(user) {
  return user && (user.role === 'admin' || user.role === 'director');
}

// Detail of a backup: its summary plus what was added relative to the
// previous daily backup (drill-down of inserted data).
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!allowed(user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { id } = await params;
  const db = getDb();
  const backup = await getBackup(db, id);
  if (!backup) return NextResponse.json({ error: 'Backup não encontrado' }, { status: 404 });

  const prev = await db.prepare(
    "SELECT data FROM backups WHERE kind = 'daily' AND day < ? ORDER BY day DESC LIMIT 1"
  ).get(backup.day);

  const added = prev ? diffAdded(backup.data, JSON.parse(prev.data)) : {};

  return NextResponse.json({
    id: backup.id,
    day: backup.day,
    kind: backup.kind,
    created_at: backup.created_at,
    created_by_name: backup.created_by_name,
    summary: backup.summary,
    hasPrevious: !!prev,
    added,
  });
}
