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
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','director','comercial')),
      director_id INTEGER,
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
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
      status TEXT DEFAULT 'em_stock' CHECK(status IN ('em_stock','vendido','reservado')),
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('manutencao','revisao','outro')),
      amount REAL NOT NULL,
      description TEXT,
      date TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    );
  `);

  const admin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
      'Administrador', 'admin@empresa.pt', hash, 'admin'
    );
  }
}

export default getDb;
