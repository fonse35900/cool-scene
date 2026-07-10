import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  return NextResponse.json(user);
}

export async function PUT(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { email, phone, currentPassword, newPassword } = await req.json();
  const db = getDb();

  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: 'Password atual obrigatória' }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: 'Nova password deve ter mínimo 6 caracteres' }, { status: 400 });
    const dbUser = db.prepare('SELECT password FROM users WHERE id = ?').get(user.id);
    if (!bcrypt.compareSync(currentPassword, dbUser.password)) {
      return NextResponse.json({ error: 'Password atual incorreta' }, { status: 400 });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, user.id);
  }

  if (email !== undefined || phone !== undefined) {
    if (email && email !== user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email=? AND id!=?').get(email, user.id);
      if (existing) return NextResponse.json({ error: 'Este email já está em uso' }, { status: 400 });
    }
    db.prepare('UPDATE users SET email=COALESCE(?,email), phone=? WHERE id=?')
      .run(email || null, phone || null, user.id);
  }

  return NextResponse.json({ success: true });
}

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
