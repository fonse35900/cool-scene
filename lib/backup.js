import getDb from './db';

// Tables included in a snapshot, in parent-first order (for inserts).
// Deletes run in reverse (children first).
const TABLES = [
  'users',
  'investors',
  'vehicles',
  'vehicle_costs',
  'investor_contributions',
  'invitations',
  'vehicle_history',
];

const todayStr = () => new Date().toISOString().split('T')[0];

// Build a full snapshot of all data tables as { table: rows[] }
export async function snapshotData(db) {
  const data = {};
  for (const t of TABLES) {
    data[t] = await db.prepare(`SELECT * FROM ${t}`).all();
  }
  return data;
}

// Count of rows per table
export function summarize(data) {
  const s = {};
  for (const t of TABLES) s[t] = (data[t] || []).length;
  return s;
}

// Create a backup row. For kind 'daily', skips if today's daily already exists.
export async function createBackup(db, { kind = 'daily', createdByName = null } = {}) {
  const day = todayStr();

  if (kind === 'daily') {
    const existing = await db.prepare("SELECT id FROM backups WHERE day = ? AND kind = 'daily'").get(day);
    if (existing) return existing.id;
  }

  const data = await snapshotData(db);
  const summary = summarize(data);

  const res = await db.prepare(
    'INSERT INTO backups (day, kind, created_by_name, summary, data) VALUES (?, ?, ?, ?, ?)'
  ).run(day, kind, createdByName, JSON.stringify(summary), JSON.stringify(data));

  if (kind === 'daily') await pruneBackups(db);
  return res.lastInsertRowid;
}

// Ensure a daily backup exists for today (lazy trigger).
export async function ensureDailyBackup(db) {
  try {
    const day = todayStr();
    const existing = await db.prepare("SELECT id FROM backups WHERE day = ? AND kind = 'daily'").get(day);
    if (!existing) await createBackup(db, { kind: 'daily' });
  } catch (e) {
    // Never block the request if backup fails
    console.error('ensureDailyBackup error:', e.message);
  }
}

// Keep: last 30 daily backups + the last daily of each of the previous 6 months.
// Manual and pre-restore backups are always kept.
export async function pruneBackups(db) {
  const dailies = await db.prepare("SELECT id, day FROM backups WHERE kind = 'daily' ORDER BY day DESC").all();
  const keep = new Set();

  // last 30 days
  dailies.slice(0, 30).forEach(b => keep.add(b.id));

  // last day of each of the previous 6 months
  const byMonth = {};
  for (const b of dailies) {
    const ym = b.day.slice(0, 7); // YYYY-MM
    if (!byMonth[ym] || b.day > byMonth[ym].day) byMonth[ym] = b;
  }
  const months = Object.keys(byMonth).sort().reverse().slice(0, 7); // current + 6 previous
  months.forEach(ym => keep.add(byMonth[ym].id));

  const toDelete = dailies.filter(b => !keep.has(b.id)).map(b => b.id);
  for (const id of toDelete) {
    await db.prepare('DELETE FROM backups WHERE id = ?').run(id);
  }
}

// Restore points to offer: last 30 daily days + last daily of each of previous 6 months.
export async function listRestorePoints(db) {
  const rows = await db.prepare(
    "SELECT id, day, kind, created_at, created_by_name, summary FROM backups ORDER BY created_at DESC"
  ).all();

  const dailies = rows.filter(r => r.kind === 'daily').sort((a, b) => b.day.localeCompare(a.day));

  const daily30 = dailies.slice(0, 30);

  const byMonth = {};
  for (const b of dailies) {
    const ym = b.day.slice(0, 7);
    if (!byMonth[ym] || b.day > byMonth[ym].day) byMonth[ym] = b;
  }
  const nowYm = todayStr().slice(0, 7);
  const monthly = Object.keys(byMonth).sort().reverse()
    .filter(ym => ym !== nowYm)
    .slice(0, 6)
    .map(ym => byMonth[ym]);

  const manual = rows.filter(r => r.kind !== 'daily');

  const parse = r => ({ ...r, summary: r.summary ? JSON.parse(r.summary) : {} });
  return {
    daily: daily30.map(parse),
    monthly: monthly.map(parse),
    manual: manual.map(parse),
  };
}

export async function getBackup(db, id) {
  const row = await db.prepare('SELECT * FROM backups WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, summary: row.summary ? JSON.parse(row.summary) : {}, data: JSON.parse(row.data) };
}

// Compute rows added in `current` data vs `prev` data, per table (by id).
export function diffAdded(currentData, prevData) {
  const added = {};
  for (const t of TABLES) {
    const prevIds = new Set((prevData[t] || []).map(r => r.id));
    added[t] = (currentData[t] || []).filter(r => !prevIds.has(r.id));
  }
  return added;
}

// Summary of what was inserted since the previous daily backup (drill-down source).
export async function insertedSincePrevious(db) {
  const current = await snapshotData(db);
  // most recent daily backup that is before today (previous day)
  const day = todayStr();
  const prev = await db.prepare(
    "SELECT data FROM backups WHERE kind = 'daily' AND day < ? ORDER BY day DESC LIMIT 1"
  ).get(day);
  if (!prev) return { hasPrevious: false, added: {}, current: summarize(current) };
  const prevData = JSON.parse(prev.data);
  return { hasPrevious: true, added: diffAdded(current, prevData), current: summarize(current) };
}

// Restore the database to a given backup. Creates a safety backup first.
export async function restoreBackup(db, id, createdByName = null) {
  const backup = await getBackup(db, id);
  if (!backup) throw new Error('Backup não encontrado');

  // Safety snapshot before overwriting
  await createBackup(db, { kind: 'pre-restore', createdByName });

  const data = backup.data;

  await db.exec('PRAGMA foreign_keys=OFF');
  // delete children first
  for (const t of [...TABLES].reverse()) {
    await db.prepare(`DELETE FROM ${t}`).run();
  }
  // insert parents first
  for (const t of TABLES) {
    const rows = data[t] || [];
    for (const row of rows) {
      const cols = Object.keys(row);
      const placeholders = cols.map(() => '?').join(', ');
      const values = cols.map(c => row[c]);
      await db.prepare(
        `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`
      ).run(...values);
    }
  }
  await db.exec('PRAGMA foreign_keys=ON');

  return true;
}
