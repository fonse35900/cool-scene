import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { BRAND } from './brand';

let client;
let initPromise = null;

function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

async function initDb(c) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      director_id INTEGER,
      investor_id INTEGER,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS investors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS investor_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investor_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      investor_id INTEGER,
      token TEXT UNIQUE NOT NULL,
      director_id INTEGER NOT NULL,
      accepted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      license_plate TEXT,
      vin TEXT,
      color TEXT,
      mileage INTEGER,
      fuel_type TEXT,
      purchase_price REAL NOT NULL,
      sale_price REAL,
      status TEXT DEFAULT 'em_stock',
      notes TEXT,
      investor_id INTEGER,
      vehicle_type TEXT DEFAULT 'stock',
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS vehicle_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS vehicle_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      changed_by INTEGER,
      changed_by_name TEXT,
      action TEXT NOT NULL,
      changes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'daily',
      created_at TEXT DEFAULT (datetime('now')),
      created_by_name TEXT,
      summary TEXT,
      data TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      action TEXT NOT NULL,
      actor_id INTEGER,
      actor_name TEXT,
      label TEXT,
      before_data TEXT,
      after_data TEXT,
      undone INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      company_name TEXT,
      logo TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of tables) {
    await c.execute({ sql, args: [] });
  }

  // Seed the single settings row with the brand defaults
  const settingsRow = await c.execute('SELECT id FROM settings WHERE id = 1');
  if (!settingsRow.rows[0]) {
    await c.execute({
      sql: 'INSERT INTO settings (id, company_name, logo) VALUES (1, ?, ?)',
      args: [BRAND.name, BRAND.logo],
    });
  }

  // Seed company 1 (the first client, OCTANE) from the settings row
  const companyRow = await c.execute('SELECT id FROM companies WHERE id = 1');
  if (!companyRow.rows[0]) {
    const s = (await c.execute('SELECT company_name, logo FROM settings WHERE id = 1')).rows[0] || {};
    await c.execute({
      sql: "INSERT INTO companies (id, name, logo) VALUES (1, ?, ?)",
      args: [s.company_name || BRAND.name, s.logo || BRAND.logo],
    });
  }

  // Migration: add suspended column to users if missing
  const userCols = await c.execute("PRAGMA table_info(users)");
  if (!userCols.rows.some(r => r.name === 'suspended')) {
    await c.execute("ALTER TABLE users ADD COLUMN suspended INTEGER DEFAULT 0");
  }

  // Multi-tenant migrations: company_id on users, investors, vehicles
  if (!userCols.rows.some(r => r.name === 'company_id')) {
    await c.execute("ALTER TABLE users ADD COLUMN company_id INTEGER");
    await c.execute("UPDATE users SET company_id = 1 WHERE company_id IS NULL");
  }
  const invCols = await c.execute("PRAGMA table_info(investors)");
  if (!invCols.rows.some(r => r.name === 'company_id')) {
    await c.execute("ALTER TABLE investors ADD COLUMN company_id INTEGER");
    await c.execute("UPDATE investors SET company_id = 1 WHERE company_id IS NULL");
  }
  const vehCols = await c.execute("PRAGMA table_info(vehicles)");
  if (!vehCols.rows.some(r => r.name === 'company_id')) {
    await c.execute("ALTER TABLE vehicles ADD COLUMN company_id INTEGER");
    await c.execute("UPDATE vehicles SET company_id = 1 WHERE company_id IS NULL");
  }
  // Invitations: support director invites (role + company_id)
  const invtCols = await c.execute("PRAGMA table_info(invitations)");
  if (!invtCols.rows.some(r => r.name === 'role')) {
    await c.execute("ALTER TABLE invitations ADD COLUMN role TEXT DEFAULT 'investidor'");
  }
  if (!invtCols.rows.some(r => r.name === 'company_id')) {
    await c.execute("ALTER TABLE invitations ADD COLUMN company_id INTEGER");
  }
  // Audit log company scoping
  const auditCols = await c.execute("PRAGMA table_info(audit_log)");
  if (!auditCols.rows.some(r => r.name === 'company_id')) {
    await c.execute("ALTER TABLE audit_log ADD COLUMN company_id INTEGER");
    await c.execute("UPDATE audit_log SET company_id = 1 WHERE company_id IS NULL");
  }

  // Rebuild invitations table if investor_id is still NOT NULL (director invites need it nullable)
  const invtInvestorCol = invtCols.rows.find(r => r.name === 'investor_id');
  if (invtInvestorCol && invtInvestorCol.notnull === 1) {
    await c.execute('PRAGMA foreign_keys=OFF');
    await c.execute(`CREATE TABLE invitations_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      investor_id INTEGER,
      token TEXT UNIQUE NOT NULL,
      director_id INTEGER NOT NULL,
      accepted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      role TEXT DEFAULT 'investidor',
      company_id INTEGER
    )`);
    await c.execute('INSERT INTO invitations_new (id, email, investor_id, token, director_id, accepted_at, created_at, role, company_id) SELECT id, email, investor_id, token, director_id, accepted_at, created_at, role, company_id FROM invitations');
    await c.execute('DROP TABLE invitations');
    await c.execute('ALTER TABLE invitations_new RENAME TO invitations');
    await c.execute('PRAGMA foreign_keys=ON');
  }

  const adminCheck = await c.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!adminCheck.rows[0]) {
    const hash = bcrypt.hashSync('admin123', 10);
    await c.execute({
      sql: "INSERT INTO users (name, email, password, role, company_id) VALUES (?, ?, ?, ?, 1)",
      args: ['Administrador', 'admin@empresa.pt', hash, 'admin'],
    });
  }
}

function getDb() {
  const c = getClient();
  if (!initPromise) initPromise = initDb(c);

  return {
    prepare(sql) {
      return {
        async get(...args) {
          await initPromise;
          const r = await c.execute({ sql, args: args.flat() });
          return r.rows[0] ?? null;
        },
        async all(...args) {
          await initPromise;
          const r = await c.execute({ sql, args: args.flat() });
          return Array.from(r.rows);
        },
        async run(...args) {
          await initPromise;
          const r = await c.execute({ sql, args: args.flat() });
          return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.rowsAffected };
        },
      };
    },
    async exec(sql) {
      await initPromise;
      const stmts = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const s of stmts) await c.execute({ sql: s, args: [] });
    },
  };
}

export default getDb;
