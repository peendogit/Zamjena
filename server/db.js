import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'zamjena.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  city TEXT,
  password TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  city TEXT,
  item_condition TEXT DEFAULT 'koristeno',
  swap_mode TEXT NOT NULL DEFAULT 'otvoren',
  wanted TEXT,
  images TEXT DEFAULT '[]',
  status TEXT DEFAULT 'na_cekanju',
  reject_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_cat ON listings(category_id);
`);

const count = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
if (count === 0) {
  const cats = [
    ['Vozila', 'vozila'],
    ['Auto dijelovi', 'auto-dijelovi'],
    ['Tehnika i mobiteli', 'tehnika'],
    ['Kuća i bašta', 'kuca-basta'],
    ['Alati', 'alati'],
    ['Odjeća i obuća', 'odjeca'],
    ['Sport i rekreacija', 'sport'],
    ['Djeca i igračke', 'djeca'],
    ['Životinje', 'zivotinje'],
    ['Usluge za usluge', 'usluge'],
    ['Ostalo', 'ostalo']
  ];
  const ins = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  for (const c of cats) ins.run(...c);
}

export default db;
