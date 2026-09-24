import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

function allowed(user) {
  return user && (user.role === 'admin' || user.role === 'director');
}

export async function GET(req) {
  const user = await getCurrentUser();
  if (!allowed(user)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const db = getDb();
  const { searchParams } = new URL(req.url);
  const entity = searchParams.get('entity');
  const action = searchParams.get('action');
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

  const conds = ['company_id = ?'];
  const args = [user.company_id];
  if (entity) { conds.push('entity = ?'); args.push(entity); }
  if (action) { conds.push('action = ?'); args.push(action); }
  const where = 'WHERE ' + conds.join(' AND ');

  const rows = await db.prepare(
    `SELECT id, entity, entity_id, action, actor_name, label, before_data, after_data, undone, created_at
     FROM audit_log ${where} ORDER BY id DESC LIMIT ${limit}`
  ).all(...args);

  // Compute changed fields for updates (hide password), keep payload light
  const items = rows.map(r => {
    let changes = null;
    if (r.action === 'update' && r.before_data && r.after_data) {
      const b = JSON.parse(r.before_data), a = JSON.parse(r.after_data);
      changes = [];
      for (const k of Object.keys(a)) {
        if (k === 'password' || k === 'updated_at') continue;
        if (String(b[k] ?? '') !== String(a[k] ?? '')) {
          changes.push({ field: k, from: b[k], to: a[k] });
        }
      }
    }
    return {
      id: r.id, entity: r.entity, entity_id: r.entity_id, action: r.action,
      actor_name: r.actor_name, label: r.label, undone: r.undone, created_at: r.created_at,
      changes,
    };
  });

  return NextResponse.json({ items });
}
