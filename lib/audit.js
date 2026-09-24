// Audit log: records inserts / updates / deletes across the main entities,
// and supports undoing a single logged operation.

// Entities that can be audited and undone. Maps to real table names.
export const AUDIT_ENTITIES = {
  vehicles: 'vehicles',
  vehicle_costs: 'vehicle_costs',
  investors: 'investors',
  investor_contributions: 'investor_contributions',
  users: 'users',
  invitations: 'invitations',
};

export async function fetchRow(db, entity, id) {
  if (id == null) return null;
  const table = AUDIT_ENTITIES[entity];
  if (!table) return null;
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

// Human-readable label for a row, for display in the log list.
export function rowLabel(entity, row) {
  if (!row) return '';
  switch (entity) {
    case 'vehicles': return `${row.brand || ''} ${row.model || ''}`.trim() || `#${row.id}`;
    case 'vehicle_costs': return `${row.type || 'custo'} €${row.amount ?? ''}`;
    case 'investors': return row.name || `#${row.id}`;
    case 'investor_contributions': return `€${row.amount ?? ''}`;
    case 'users': return row.name || row.email || `#${row.id}`;
    case 'invitations': return row.email || `#${row.id}`;
    default: return `#${row.id ?? ''}`;
  }
}

// Record an audit entry. Never throws (auditing must not break the request).
export async function recordAudit(db, { entity, entityId, action, actor, before = null, after = null }) {
  try {
    const label = rowLabel(entity, after || before);
    await db.prepare(`
      INSERT INTO audit_log (entity, entity_id, action, actor_id, actor_name, label, before_data, after_data, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entity, entityId ?? null, action,
      actor?.id ?? null, actor?.name ?? null, label,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      actor?.company_id ?? null
    );
  } catch (e) {
    console.error('recordAudit error:', e.message);
  }
}

async function reinsertRow(db, table, row) {
  const cols = Object.keys(row);
  const placeholders = cols.map(() => '?').join(', ');
  await db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`)
    .run(...cols.map(c => row[c]));
}

async function updateRow(db, table, row) {
  const cols = Object.keys(row).filter(c => c !== 'id');
  const setClause = cols.map(c => `${c} = ?`).join(', ');
  await db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`)
    .run(...cols.map(c => row[c]), row.id);
}

// Undo a single audit entry. Returns { ok } or throws with a message.
export async function undoAudit(db, entry, actor) {
  const table = AUDIT_ENTITIES[entry.entity];
  if (!table) throw new Error('Entidade não suportada');
  if (entry.undone) throw new Error('Esta operação já foi anulada');

  const before = entry.before_data ? JSON.parse(entry.before_data) : null;
  const after = entry.after_data ? JSON.parse(entry.after_data) : null;

  await db.exec('PRAGMA foreign_keys=OFF');
  try {
    if (entry.action === 'insert') {
      // undo insert => delete the row
      await db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(entry.entity_id);
    } else if (entry.action === 'delete') {
      // undo delete => re-insert the row (if not already present)
      if (before) {
        const exists = await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(before.id);
        if (!exists) await reinsertRow(db, table, before);
      }
    } else if (entry.action === 'update') {
      // undo update => restore previous values
      if (before) {
        const exists = await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(before.id);
        if (exists) await updateRow(db, table, before);
        else await reinsertRow(db, table, before);
      }
    }
  } finally {
    await db.exec('PRAGMA foreign_keys=ON');
  }

  await db.prepare('UPDATE audit_log SET undone = 1 WHERE id = ?').run(entry.id);

  // Record the undo itself as a new entry (not undoable)
  await recordAudit(db, {
    entity: entry.entity,
    entityId: entry.entity_id,
    action: 'undo',
    actor,
    before: after,
    after: before,
  });

  // Also record the reversal in the affected vehicle's change history, so the
  // undo is visible there for auditing (the original movement lived there too).
  await addVehicleUndoHistory(db, entry, actor, before, after);

  return { ok: true };
}

// Adds an entry to a vehicle's change history describing an undone movement,
// when the undone operation concerns a vehicle or one of its costs. Never throws.
async function addVehicleUndoHistory(db, entry, actor, before, after) {
  try {
    let vehicleId = null;
    if (entry.entity === 'vehicles') vehicleId = entry.entity_id;
    else if (entry.entity === 'vehicle_costs') vehicleId = before?.vehicle_id ?? after?.vehicle_id ?? null;
    else return; // not vehicle-related

    if (!vehicleId) return;
    const exists = await db.prepare('SELECT id FROM vehicles WHERE id = ?').get(vehicleId);
    if (!exists) return; // e.g. undoing a vehicle insert deletes it (and its history)

    const lbl = entry.label || '';
    let text;
    if (entry.entity === 'vehicle_costs') {
      if (entry.action === 'insert') text = `Custo anulado / Cost reverted: ${lbl}`;
      else if (entry.action === 'delete') text = `Custo reposto / Cost restored: ${lbl}`;
      else text = `Alteração de custo anulada / Cost change reverted: ${lbl}`;
    } else {
      if (entry.action === 'update') text = 'Alteração anulada / Change reverted';
      else if (entry.action === 'delete') text = 'Eliminação anulada, viatura reposta / Deletion reverted, vehicle restored';
      else text = 'Movimento anulado / Movement reverted';
    }

    const changes = JSON.stringify([{ label: 'Movimento anulado / Reverted', to: text }]);
    await db.prepare(`
      INSERT INTO vehicle_history (vehicle_id, changed_by, changed_by_name, action, changes, created_at)
      VALUES (?, ?, ?, 'undo', ?, datetime('now'))
    `).run(vehicleId, actor?.id ?? null, actor?.name ?? null, changes);
  } catch (e) {
    console.error('addVehicleUndoHistory error:', e.message);
  }
}
