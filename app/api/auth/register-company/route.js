import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { signToken } from '@/lib/auth';
import { DEFAULT_PLAN } from '@/lib/plans';

// Public self-service sign-up: creates a brand-new company on the Free plan
// plus its first director account, and logs the user straight in. Paid plans
// (Pro/Enterprise) are handled via sales contact, not here, so the plan is
// always 'free'. Branding is left unconfigured so the director sets the
// company name/logo/palette on first login.
export async function POST(req) {
  try {
    const { company_name, name, email, password } = await req.json();

    if (!company_name || !name || !email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'A password deve ter no mínimo 6 caracteres' }, { status: 400 });
    }

    const db = getDb();

    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Este email já tem conta' }, { status: 400 });
    }

    // Create the company (Free plan, branding not yet configured).
    const companyRes = await db.prepare(
      "INSERT INTO companies (name, logo, branding_configured, suspended, palette, plan) VALUES (?, NULL, 0, 0, 'octane', ?)"
    ).run(company_name, DEFAULT_PLAN);
    const companyId = companyRes.lastInsertRowid;

    // Create the director account for that company.
    const hash = bcrypt.hashSync(password, 10);
    const userRes = await db.prepare(
      "INSERT INTO users (name, email, password, role, company_id) VALUES (?, ?, ?, 'director', ?)"
    ).run(name, email, hash, companyId);

    const user = await db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(userRes.lastInsertRowid);
    const token = signToken(user);
    const res = NextResponse.json({ success: true, role: user.role });
    res.cookies.set('token', token, { httpOnly: true, path: '/', maxAge: 86400, sameSite: 'lax' });
    return res;
  } catch (e) {
    console.error('register-company error:', e);
    if (String(e.message).includes('UNIQUE')) {
      return NextResponse.json({ error: 'Este email já tem conta' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 });
  }
}
