import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Determines whether `actor` is allowed to manage `target` (edit/suspend/delete)
function canManage(actor, target) {
  if (actor.id === target.id) return 'self';
  if (actor.role === 'admin') return 'full';
  if (actor.role === 'director') {
    if ((target.role === 'comercial' || target.role === 'investidor') && target.director_id === actor.id) {
      return 'full';
    }
  }
  return false;
}

export async function PUT(req, { params }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const targetId = parseInt(id);
  const db = getDb();

  const target = await db.prepare('SELECT id, name, email, role, director_id FROM users WHERE id = ?').get(targetId);
  if (!target) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });

  const perm = canManage(actor, target);
  if (!perm) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { name, email, phone, password, suspended } = await req.json();

  // Only a manager (not self) can suspend/reactivate
  if (suspended !== undefined) {
    if (perm !== 'full') {
      return NextResponse.json({ error: 'Não pode suspender a sua própria conta' }, { status: 403 });
    }
    await db.prepare('UPDATE users SET suspended = ? WHERE id = ?').run(suspended ? 1 : 0, targetId);
  }

  // Update basic fields
  if (name !== undefined || email !== undefined || phone !== undefined) {
    if (email && email !== target.email) {
      const existing = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, targetId);
      if (existing) return NextResponse.json({ error: 'Este email já está em uso' }, { status: 400 });
    }
    await db.prepare('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), phone = ? WHERE id = ?')
      .run(name ?? null, email ?? null, phone ?? null, targetId);
  }

  // Password change
  if (password) {
    if (password.length < 6) return NextResponse.json({ error: 'Password deve ter no mínimo 6 caracteres' }, { status: 400 });
    const hash = bcrypt.hashSync(password, 10);
    await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, targetId);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req, { params }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const targetId = parseInt(id);
  const db = getDb();

  const target = await db.prepare('SELECT id, name, email, role, director_id FROM users WHERE id = ?').get(targetId);
  if (!target) return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });

  const perm = canManage(actor, target);
  if (perm !== 'full') {
    return NextResponse.json({ error: 'Sem permissão para eliminar este utilizador' }, { status: 403 });
  }

  await db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  return NextResponse.json({ success: true });
}
