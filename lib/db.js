import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb(db);
  }
  return db;
}

function initDb(db) {
  // Migrate users table if needed (remove CHECK constraint, add investor_id)
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (tableInfo) {
    const needsMigration = tableInfo.sql.includes("'admin','director','comercial'");
    const hasInvestorCol = tableInfo.sql.includes('investor_id');
    if (needsMigration || !hasInvestorCol) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users_migration (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          director_id INTEGER,
          investor_id INTEGER,
          phone TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO users_migration (id, name, email, password, role, director_id, phone, created_at)
          SELECT id, name, email, password, role, director_id, phone, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_migration RENAME TO users;
      `);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      director_id INTEGER,
      investor_id INTEGER,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS investors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS investor_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investor_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      investor_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      director_id INTEGER NOT NULL,
      accepted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (investor_id) REFERENCES investors(id),
      FOREIGN KEY (director_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vehicles (
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
    );

    CREATE TABLE IF NOT EXISTS vehicle_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
  `);

  // Column migrations for existing DBs
  const vCols = db.prepare("PRAGMA table_info(vehicles)").all().map(c => c.name);
  if (!vCols.includes('investor_id')) db.exec("ALTER TABLE vehicles ADD COLUMN investor_id INTEGER");
  if (!vCols.includes('vehicle_type')) db.exec("ALTER TABLE vehicles ADD COLUMN vehicle_type TEXT DEFAULT 'stock'");

  // Ensure new tables exist (for DBs created before these were added)
  db.exec(`
    CREATE TABLE IF NOT EXISTS investor_contributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      investor_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      investor_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      director_id INTEGER NOT NULL,
      accepted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (investor_id) REFERENCES investors(id),
      FOREIGN KEY (director_id) REFERENCES users(id)
    )
  `);

  // Seed admin
  const admin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
      'Administrador', 'admin@empresa.pt', hash, 'admin'
    );
  }
}

export default getDb;
