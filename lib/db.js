import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

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
  await c.batch([
    { sql: `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      director_id INTEGER,
      investor_id INTEGER,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS investors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS investor_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investor_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      investor_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      director_id INTEGER NOT NULL,
      accepted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (investor_id) REFERENCES investors(id),
      FOREIGN KEY (director_id) REFERENCES users(id)
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS vehicles (
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
    )`, args: [] },
    { sql: `CREATE TABLE IF NOT EXISTS vehicle_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )`, args: [] },
  ], 'write');

  const adminCheck = await c.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!adminCheck.rows[0]) {
    const hash = bcrypt.hashSync('admin123', 10);
    await c.execute({
      sql: "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
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
      if (stmts.length) await c.batch(stmts.map(s => ({ sql: s, args: [] })), 'write');
    },
  };
}

export default getDb;
