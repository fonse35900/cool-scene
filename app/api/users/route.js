import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = getDb();
  let users;

  if (user.role === 'admin') {
    users = await db.prepare('SELECT id, name, email, role, phone, director_id, suspended, created_at FROM users WHERE company_id = ?').all(user.company_id);
  } else if (user.role === 'director') {
    users = await db.prepare(
      'SELECT id, name, email, role, phone, director_id, suspended, created_at FROM users WHERE company_id = ? AND role != ?'
    ).all(user.company_id, 'admin');
  } else {
    users = [{ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, suspended: user.suspended }];
  }

  return NextResponse.json(users);
}
