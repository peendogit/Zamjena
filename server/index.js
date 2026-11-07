import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { containsSale } from './filter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3010;
const SECRET = process.env.JWT_SECRET || 'promijeni-ovo-u-tajnu';
const UPLOADS = path.join(__dirname, 'uploads');
const DIST = path.join(__dirname, '..', 'client', 'dist');
fs.mkdirSync(UPLOADS, { recursive: true });

const SALE_MSG = 'Koja je cijena, paše li keš? Ne hvala, samo zamjena! Uklonite cijene i riječi o prodaji.';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS, { maxAge: '30d' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Niste prijavljeni' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Prijava je istekla, prijavite se ponovo' });
  }
}

function admin(req, res, next) {
  const u = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!u?.is_admin) return res.status(403).json({ error: 'Samo admin' });
  next();
}

const parse = l => ({ ...l, images: JSON.parse(l.images || '[]') });

// ---------- KORISNICI ----------
app.post('/api/register', (req, res) => {
  const { name, email, phone, city, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'Popunite ime, email i lozinku (najmanje 6 znakova)' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const r = db.prepare('INSERT INTO users (name, email, phone, city, password) VALUES (?, ?, ?, ?, ?)')
      .run(name.trim(), email.trim().toLowerCase(), phone || null, city || null, hash);
    const user = { id: Number(r.lastInsertRowid), name, city, is_admin: 0 };
    const token = jwt.sign({ id: user.id, name }, SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch {
    res.status(400).json({ error: 'Taj email je već registrovan' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').trim().toLowerCase());
  if (!u || !bcrypt.compareSync(password || '', u.password))
    return res.status(400).json({ error: 'Pogrešan email ili lozinka' });
  const token = jwt.sign({ id: u.id, name: u.name }, SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: u.id, name: u.name, city: u.city, is_admin: u.is_admin } });
});

app.get('/api/me', auth, (req, res) => {
  const u = db.prepare('SELECT id, name, email, phone, city, is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'Korisnik ne postoji' });
  res.json(u);
});

// ---------- KATEGORIJE ----------
app.get('/api/categories', (req, res) => {
  res.json(db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id AND l.status = 'aktivan') AS total
    FROM categories c ORDER BY c.id`).all());
});

// ---------- OGLASI ----------
app.get('/api/listings', (req, res) => {
  const { q, category, city, mode } = req.query;
  let sql = `SELECT l.*, c.name AS category_name, c.slug AS category_slug, u.name AS user_name
             FROM listings l
             JOIN categories c ON c.id = l.category_id
             JOIN users u ON u.id = l.user_id
             WHERE l.status = 'aktivan'`;
  const p = [];
  if (q) {
    sql += ' AND (l.title LIKE ? OR l.description LIKE ? OR l.wanted LIKE ?)';
    p.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) { sql += ' AND c.slug = ?'; p.push(category); }
  if (city) { sql += ' AND l.city LIKE ?'; p.push(`%${city}%`); }
  if (mode === 'trazim' || mode === 'otvoren') { sql += ' AND l.swap_mode = ?'; p.push(mode); }
  sql += ' ORDER BY l.created_at DESC, l.id DESC LIMIT 100';
  res.json(db.prepare(sql).all(...p).map(parse));
});

app.get('/api/listings/:id', (req, res) => {
  const l = db.prepare(`
    SELECT l.*, c.name AS category_name, c.slug AS category_slug,
           u.name AS user_name, u.city AS user_city, u.created_at AS user_since
    FROM listings l
    JOIN categories c ON c.id = l.category_id
    JOIN users u ON u.id = l.user_id
    WHERE l.id = ?`).get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Oglas ne postoji' });
  res.json(parse(l));
});

app.get('/api/my-listings', auth, (req, res) => {
  res.json(db.prepare(`SELECT l.*, c.name AS category_name FROM listings l
    JOIN categories c ON c.id = l.category_id
    WHERE l.user_id = ? ORDER BY l.created_at DESC, l.id DESC`).all(req.user.id).map(parse));
});

app.post('/api/listings', auth, upload.array('images', 8), async (req, res) => {
  try {
    const { title, description, category_id, city, item_condition, swap_mode, wanted } = req.body;
    if (!title || !description || !category_id)
      return res.status(400).json({ error: 'Naslov, opis i kategorija su obavezni' });
    const mode = swap_mode === 'trazim' ? 'trazim' : 'otvoren';
    if (mode === 'trazim' && !wanted?.trim())
      return res.status(400).json({ error: 'Upišite šta tražite u zamjenu' });
    const cat = db.prepare('SELECT slug FROM categories WHERE id = ?').get(Number(category_id));
    if (!cat) return res.status(400).json({ error: 'Nepoznata kategorija' });
    const allowKm = cat.slug === 'vozila' || cat.slug === 'auto-dijelovi';
    if (containsSale(`${title} ${description} ${wanted || ''}`, { allowKm }))
      return res.status(400).json({ error: SALE_MSG });

    const images = [];
    for (const f of req.files || []) {
      const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
      await sharp(f.buffer).rotate()
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(UPLOADS, name));
      images.push(`/uploads/${name}`);
    }

    const r = db.prepare(`INSERT INTO listings
      (user_id, category_id, title, description, city, item_condition, swap_mode, wanted, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(req.user.id, Number(category_id), title.trim(), description.trim(), city || null,
           item_condition === 'novo' ? 'novo' : 'koristeno', mode,
           mode === 'trazim' ? wanted.trim() : null, JSON.stringify(images));
    res.json({ id: Number(r.lastInsertRowid), message: 'Oglas je poslan na odobrenje. Biće vidljiv čim ga admin pregleda.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Greška pri spremanju oglasa' });
  }
});

app.delete('/api/listings/:id', auth, (req, res) => {
  const l = db.prepare('SELECT * FROM listings WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!l) return res.status(404).json({ error: 'Oglas ne postoji' });
  for (const img of JSON.parse(l.images || '[]')) {
    fs.rm(path.join(UPLOADS, path.basename(img)), { force: true }, () => {});
  }
  db.prepare('DELETE FROM listings WHERE id = ?').run(l.id);
  res.json({ ok: true });
});

// ---------- ADMIN ----------
app.get('/api/admin/pending', auth, admin, (req, res) => {
  res.json(db.prepare(`SELECT l.*, u.name AS user_name, u.email AS user_email, c.name AS category_name
    FROM listings l JOIN users u ON u.id = l.user_id JOIN categories c ON c.id = l.category_id
    WHERE l.status = 'na_cekanju' ORDER BY l.created_at, l.id`).all().map(parse));
});

app.post('/api/admin/listings/:id/:action', auth, admin, (req, res) => {
  const { action } = req.params;
  if (action !== 'odobri' && action !== 'odbij') return res.status(400).json({ error: 'Nepoznata akcija' });
  const status = action === 'odobri' ? 'aktivan' : 'odbijen';
  db.prepare('UPDATE listings SET status = ?, reject_reason = ? WHERE id = ?')
    .run(status, action === 'odbij' ? (req.body?.reason || null) : null, req.params.id);
  res.json({ ok: true, status });
});

// ---------- FRONTEND ----------
app.use(express.static(DIST));
app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Slika je prevelika (max 10 MB)' : 'Greška' });
});

app.listen(PORT, () => console.log(`zamjena.ba radi na portu ${PORT}`));
