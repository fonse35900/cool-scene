import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const db = getDb();
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = signToken(user);
    const res = NextResponse.json({ id: user.id, name: user.name, role: user.role });
    res.cookies.set('token', token, { httpOnly: true, path: '/', maxAge: 86400, sameSite: 'lax' });
    return res;
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json({ error: 'Erro interno: ' + e.message }, { status: 500 });
  }
}
