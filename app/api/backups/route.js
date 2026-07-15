import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createBackup, listRestorePoints, insertedSincePrevious } from '@/lib/backup';

function allowed(user) {
  return user && (user.role === 'admin' || user.role === 'director');
}

export async function GET() {
  const user = await getCurrentUser();
  if (!allowed(user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const db = getDb();
  const [points, inserted] = await Promise.all([
    listRestorePoints(db),
    insertedSincePrevious(db),
  ]);
  return NextResponse.json({ points, inserted });
}

export async function POST() {
  const user = await getCurrentUser();
  if (!allowed(user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const db = getDb();
  const id = await createBackup(db, { kind: 'manual', createdByName: user.name });
  return NextResponse.json({ id, success: true });
}
