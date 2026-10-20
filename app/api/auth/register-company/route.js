import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { signToken } from '@/lib/auth';
import { DEFAULT_PLAN, isCompanyEmail, emailDomain, trialEndFromNow } from '@/lib/plans';
import { seedDemoCompany } from '@/lib/demoData';

// Public self-service sign-up. Rules:
//  - Only company (business) emails are accepted; public providers are rejected.
//  - One email domain = one company. The first registrant of a domain creates
//    the company and becomes its director. A second person on the same domain
//    cannot self-register — they must be invited by the first — and is told the
//    company already exists.
//  - The company starts on a 14-day Free trial with KYRGA colours, no logo
//    (the trial user adjusts branding), and pre-loaded demo data.
export async function POST(req) {
  try {
    const { company_name, name, email, password } = await req.json();

    if (!company_name || !name || !email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'A password deve ter no mínimo 6 caracteres' }, { status: 400 });
    }
    if (!isCompanyEmail(email)) {
      return NextResponse.json({ error: 'Use um email da empresa (domínios públicos como gmail ou outlook não são aceites).' }, { status: 400 });
    }

    const domain = emailDomain(email);
    const db = getDb();

    // One domain = one company. If it already exists, the second user must be invited.
    const existingCompany = await db.prepare('SELECT id FROM companies WHERE domain = ?').get(domain);
    if (existingCompany) {
      return NextResponse.json({ error: `A empresa (${domain}) já está registada. Contacte o administrador da sua empresa para ser convidado.` }, { status: 409 });
    }

    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return NextResponse.json({ error: 'Este email já tem conta' }, { status: 400 });
    }

    // Create the company: Free plan, 14-day trial, KYRGA colours (octane/blue),
    // name set but no logo yet (branding_configured = 1 shows the name; logo null).
    const companyRes = await db.prepare(
      "INSERT INTO companies (name, logo, branding_configured, suspended, palette, plan, domain, trial_ends_at) VALUES (?, NULL, 1, 0, 'octane', ?, ?, ?)"
    ).run(company_name, DEFAULT_PLAN, domain, trialEndFromNow());
    const companyId = companyRes.lastInsertRowid;

    // Create the first director account (counts as the 1st of 2 real seats).
    const hash = bcrypt.hashSync(password, 10);
    const userRes = await db.prepare(
      "INSERT INTO users (name, email, password, role, company_id, is_demo) VALUES (?, ?, ?, 'director', ?, 0)"
    ).run(name, email, hash, companyId);

    // Pre-load demo data so the trial starts populated (demo users are flagged
    // is_demo and don't count toward the 2-seat limit).
    try {
      const actor = { id: userRes.lastInsertRowid, name, role: 'director', company_id: companyId };
      await seedDemoCompany(db, companyId, actor);
    } catch (seedErr) {
      console.error('demo seed on signup failed:', seedErr);
    }

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
