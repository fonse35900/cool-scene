import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { restoreBackup } from '@/lib/backup';

export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'director')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  try {
    await restoreBackup(db, id, user.name);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('restore error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
