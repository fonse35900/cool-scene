import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recordAudit, fetchRow } from '@/lib/audit';
import { planLimits, trialInfo } from '@/lib/plans';

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

  // Enforce Free-plan user cap and trial status per company.
  const company = await db.prepare('SELECT plan, trial_ends_at FROM companies WHERE id = ?').get(currentUser.company_id);
  const trial = trialInfo(company);
  if (trial.expired) {
    return NextResponse.json({ error: 'O período de avaliação terminou. Contacte o administrador para atualizar o plano.' }, { status: 403 });
  }
  const limits = planLimits(company?.plan);
  if (Number.isFinite(limits.maxUsers)) {
    const { c: count } = await db.prepare('SELECT COUNT(*) as c FROM users WHERE company_id = ? AND is_demo = 0').get(currentUser.company_id);
    if (count >= limits.maxUsers) {
      return NextResponse.json({ error: `Limite do plano ${limits.name} atingido (${limits.maxUsers} utilizadores). Atualize o plano para adicionar mais.` }, { status: 403 });
    }
  }

  try {
    const result = await db.prepare('INSERT INTO users (name, email, password, role, phone, director_id, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      name, email, hash, role, phone || null, assignedDirector, currentUser.company_id
    );
    const created = await fetchRow(db, 'users', result.lastInsertRowid);
    await recordAudit(db, { entity: 'users', entityId: result.lastInsertRowid, action: 'insert', actor: currentUser, after: created });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Email já existe' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar utilizador' }, { status: 500 });
  }
}
