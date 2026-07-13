import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
    await db.prepare('INSERT INTO users (name, email, password, role, phone, director_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      name, email, hash, role, phone || null, assignedDirector
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Email já existe' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar utilizador' }, { status: 500 });
  }
}
