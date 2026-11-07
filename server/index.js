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
import { containsSale, EXACT, PREFIX } from './filter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3047;
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

// ---------- POMOĆNE ----------
function readToken(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try { return jwt.verify(token, SECRET); } catch { return null; }
}
function auth(req, res, next) {
  const u = readToken(req);
  if (!u) return res.status(401).json({ error: 'Prijava je istekla, prijavite se ponovo' });
  req.user = u;
  next();
}
const isAdmin = id => !!db.prepare('SELECT is_admin FROM users WHERE id = ?').get(id)?.is_admin;
function admin(req, res, next) {
  if (!isAdmin(req.user.id)) return res.status(403).json({ error: 'Samo admin' });
  next();
}

const parse = l => (l ? { ...l, images: JSON.parse(l.images || '[]') } : l);
const extraWords = () => db.prepare('SELECT word FROM banned_words').all().map(r => r.word);
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

function saleCheck(text, categoryId) {
  const cat = db.prepare('SELECT slug FROM categories WHERE id = ?').get(Number(categoryId));
  if (!cat) return 'Nepoznata kategorija';
  const allowKm = cat.slug === 'vozila' || cat.slug === 'auto-dijelovi';
  return containsSale(text, { allowKm, extra: extraWords() }) ? SALE_MSG : null;
}

async function saveImages(files) {
  const out = [];
  for (const f of files || []) {
    const name = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
    await sharp(f.buffer).rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(UPLOADS, name));
    out.push(`/uploads/${name}`);
  }
  return out;
}
const removeImage = img => fs.rm(path.join(UPLOADS, path.basename(img)), { force: true }, () => {});

// Razgovor između dva korisnika o oglasu (pravi ga ako ne postoji)
function getConversation(listingId, u1, u2) {
  const [a, b] = u1 < u2 ? [u1, u2] : [u2, u1];
  let c = db.prepare('SELECT * FROM conversations WHERE listing_id IS ? AND user_a = ? AND user_b = ?').get(listingId, a, b);
  if (!c) {
    const r = db.prepare('INSERT INTO conversations (listing_id, user_a, user_b) VALUES (?, ?, ?)').run(listingId, a, b);
    c = db.prepare('SELECT * FROM conversations WHERE id = ?').get(r.lastInsertRowid);
  }
  return c;
}
function addMessage(convId, senderId, body, isSystem = 0) {
  db.prepare('INSERT INTO messages (conversation_id, sender_id, body, is_system) VALUES (?, ?, ?, ?)').run(convId, senderId, body, isSystem);
  db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now(), convId);
}

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
  const u = db.prepare('SELECT id, name, email, phone, city, is_admin, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'Korisnik ne postoji' });
  res.json(u);
});

app.put('/api/me', auth, (req, res) => {
  const { name, phone, city } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Ime je obavezno' });
  db.prepare('UPDATE users SET name = ?, phone = ?, city = ? WHERE id = ?')
    .run(name.trim(), phone || null, city || null, req.user.id);
  res.json(db.prepare('SELECT id, name, email, phone, city, is_admin, created_at FROM users WHERE id = ?').get(req.user.id));
});

app.post('/api/me/password', auth, (req, res) => {
  const { old_password, new_password } = req.body;
  const u = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!u || !bcrypt.compareSync(old_password || '', u.password))
    return res.status(400).json({ error: 'Stara lozinka nije tačna' });
  if (!new_password || new_password.length < 6)
    return res.status(400).json({ error: 'Nova lozinka mora imati najmanje 6 znakova' });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), req.user.id);
  res.json({ ok: true, message: 'Lozinka promijenjena' });
});

// Broj novih stvari za značku u zaglavlju
app.get('/api/notifications', auth, (req, res) => {
  const id = req.user.id;
  const messages = db.prepare(`SELECT COUNT(*) AS c FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.user_a = ? OR c.user_b = ?) AND (m.sender_id IS NULL OR m.sender_id != ?) AND m.read_at IS NULL`).get(id, id, id).c;
  const offers = db.prepare(`SELECT COUNT(*) AS c FROM offers WHERE to_user_id = ? AND status = 'na_cekanju' AND seen = 0`).get(id).c;
  res.json({ messages, offers });
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
  // Neodobrene i odbijene oglase vidi samo vlasnik i admin
  if (l.status === 'na_cekanju' || l.status === 'odbijen') {
    const u = readToken(req);
    if (!u || (u.id !== l.user_id && !isAdmin(u.id))) return res.status(404).json({ error: 'Oglas ne postoji' });
  }
  res.json(parse(l));
});

app.get('/api/my-listings', auth, (req, res) => {
  const { active } = req.query;
  let sql = `SELECT l.*, c.name AS category_name,
    (SELECT COUNT(*) FROM offers o WHERE o.listing_id = l.id AND o.status = 'na_cekanju') AS pending_offers
    FROM listings l JOIN categories c ON c.id = l.category_id WHERE l.user_id = ?`;
  if (active) sql += ` AND l.status = 'aktivan'`;
  sql += ' ORDER BY l.created_at DESC, l.id DESC';
  res.json(db.prepare(sql).all(req.user.id).map(parse));
});

function validateListing(body) {
  const { title, description, category_id, swap_mode, wanted } = body;
  if (!title || !description || !category_id) return 'Naslov, opis i kategorija su obavezni';
  if (swap_mode === 'trazim' && !wanted?.trim()) return 'Upišite šta tražite u zamjenu';
  return saleCheck(`${title} ${description} ${swap_mode === 'trazim' ? wanted : ''}`, category_id);
}

app.post('/api/listings', auth, upload.array('images', 8), async (req, res) => {
  try {
    const err = validateListing(req.body);
    if (err) return res.status(400).json({ error: err });
    const { title, description, category_id, city, item_condition, swap_mode, wanted } = req.body;
    const mode = swap_mode === 'trazim' ? 'trazim' : 'otvoren';
    const images = await saveImages(req.files);
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

// Uređivanje oglasa: nakon izmjene ide ponovo na odobrenje
app.put('/api/listings/:id', auth, upload.array('images', 8), async (req, res) => {
  try {
    const l = db.prepare('SELECT * FROM listings WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!l) return res.status(404).json({ error: 'Oglas ne postoji' });
    if (l.status === 'zamijenjeno') return res.status(400).json({ error: 'Zamijenjeni oglas se ne može mijenjati' });
    const err = validateListing(req.body);
    if (err) return res.status(400).json({ error: err });

    const old = JSON.parse(l.images || '[]');
    let keep = [];
    try { keep = JSON.parse(req.body.keep_images || '[]').filter(i => old.includes(i)); } catch { keep = old; }
    if (keep.length + (req.files?.length || 0) > 8) return res.status(400).json({ error: 'Najviše 8 slika' });
    old.filter(i => !keep.includes(i)).forEach(removeImage);
    const images = [...keep, ...(await saveImages(req.files))];

    const { title, description, category_id, city, item_condition, swap_mode, wanted } = req.body;
    const mode = swap_mode === 'trazim' ? 'trazim' : 'otvoren';
    db.prepare(`UPDATE listings SET category_id = ?, title = ?, description = ?, city = ?, item_condition = ?,
      swap_mode = ?, wanted = ?, images = ?, status = 'na_cekanju', reject_reason = NULL WHERE id = ?`)
      .run(Number(category_id), title.trim(), description.trim(), city || null,
           item_condition === 'novo' ? 'novo' : 'koristeno', mode,
           mode === 'trazim' ? wanted.trim() : null, JSON.stringify(images), l.id);
    res.json({ id: l.id, message: 'Izmjene su sačuvane. Oglas ponovo čeka odobrenje.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Greška pri spremanju izmjena' });
  }
});

app.delete('/api/listings/:id', auth, (req, res) => {
  const l = db.prepare('SELECT * FROM listings WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!l) return res.status(404).json({ error: 'Oglas ne postoji' });
  JSON.parse(l.images || '[]').forEach(removeImage);
  db.prepare('DELETE FROM listings WHERE id = ?').run(l.id);
  res.json({ ok: true });
});

// ---------- PONUDE ZAMJENE ----------
app.post('/api/listings/:id/offers', auth, (req, res) => {
  const target = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!target || target.status !== 'aktivan') return res.status(400).json({ error: 'Ovaj oglas trenutno ne prima ponude' });
  if (target.user_id === req.user.id) return res.status(400).json({ error: 'Ne možete ponuditi zamjenu na svoj oglas' });

  const ids = [...new Set((req.body.offered_ids || []).map(Number))].filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: 'Izaberite barem jedan svoj oglas koji nudite' });
  const mine = db.prepare(`SELECT id, title FROM listings WHERE user_id = ? AND status = 'aktivan' AND id IN (${ids.map(() => '?').join(',')})`)
    .all(req.user.id, ...ids);
  if (mine.length !== ids.length) return res.status(400).json({ error: 'Možete nuditi samo svoje aktivne oglase' });

  const dup = db.prepare(`SELECT id FROM offers WHERE listing_id = ? AND from_user_id = ? AND status = 'na_cekanju'`).get(target.id, req.user.id);
  if (dup) return res.status(400).json({ error: 'Već imate ponudu na čekanju za ovaj oglas. Povucite je ako želite poslati novu.' });

  const message = (req.body.message || '').trim().slice(0, 1000);
  const r = db.prepare(`INSERT INTO offers (listing_id, from_user_id, to_user_id, offered_ids, message) VALUES (?, ?, ?, ?, ?)`)
    .run(target.id, req.user.id, target.user_id, JSON.stringify(ids), message || null);

  const conv = getConversation(target.id, req.user.id, target.user_id);
  addMessage(conv.id, req.user.id, `⇄ Ponuda zamjene za "${target.title}": ${mine.map(m => m.title).join(', ')}`, 1);
  if (message) addMessage(conv.id, req.user.id, message);

  res.json({ id: Number(r.lastInsertRowid), conversation_id: conv.id, message: 'Ponuda je poslana!' });
});

function offerRows(where, param) {
  const rows = db.prepare(`
    SELECT o.*, l.title AS listing_title, l.images AS listing_images, l.status AS listing_status,
           uf.name AS from_name, ut.name AS to_name
    FROM offers o
    JOIN listings l ON l.id = o.listing_id
    JOIN users uf ON uf.id = o.from_user_id
    JOIN users ut ON ut.id = o.to_user_id
    WHERE ${where} ORDER BY o.updated_at DESC, o.id DESC`).all(param);
  const getL = db.prepare('SELECT id, title, images, status, city FROM listings WHERE id = ?');
  return rows.map(o => ({
    ...o,
    conversation_id: getConversation(o.listing_id, o.from_user_id, o.to_user_id).id,
    listing_images: JSON.parse(o.listing_images || '[]'),
    offered: JSON.parse(o.offered_ids).map(id => parse(getL.get(id))).filter(Boolean)
  }));
}

app.get('/api/offers', auth, (req, res) => {
  const received = offerRows('o.to_user_id = ?', req.user.id);
  const sent = offerRows('o.from_user_id = ?', req.user.id);
  db.prepare('UPDATE offers SET seen = 1 WHERE to_user_id = ? AND seen = 0').run(req.user.id);
  res.json({ received, sent });
});

app.post('/api/offers/:id/:action', auth, (req, res) => {
  const o = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
  if (!o || o.status !== 'na_cekanju') return res.status(400).json({ error: 'Ponuda više nije aktivna' });
  const { action } = req.params;
  const target = db.prepare('SELECT * FROM listings WHERE id = ?').get(o.listing_id);
  const conv = getConversation(o.listing_id, o.from_user_id, o.to_user_id);

  if (action === 'povuci') {
    if (o.from_user_id !== req.user.id) return res.status(403).json({ error: 'Nije vaša ponuda' });
    db.prepare(`UPDATE offers SET status = 'povucena', updated_at = ? WHERE id = ?`).run(now(), o.id);
    addMessage(conv.id, req.user.id, '↩ Ponuda je povučena.', 1);
    return res.json({ ok: true });
  }

  if (o.to_user_id !== req.user.id) return res.status(403).json({ error: 'Nije vaša ponuda' });

  if (action === 'odbij') {
    db.prepare(`UPDATE offers SET status = 'odbijena', updated_at = ? WHERE id = ?`).run(now(), o.id);
    addMessage(conv.id, req.user.id, '✗ Ponuda je odbijena.', 1);
    return res.json({ ok: true });
  }

  if (action === 'prihvati') {
    const offeredIds = JSON.parse(o.offered_ids);
    const stillActive = db.prepare(`SELECT COUNT(*) AS c FROM listings WHERE status = 'aktivan' AND id IN (${offeredIds.map(() => '?').join(',')})`)
      .get(...offeredIds).c;
    if (target.status !== 'aktivan' || stillActive !== offeredIds.length)
      return res.status(400).json({ error: 'Neki od oglasa u ponudi više nije dostupan' });

    const allIds = [o.listing_id, ...offeredIds];
    const ph = allIds.map(() => '?').join(',');
    db.transaction(() => {
      db.prepare(`UPDATE offers SET status = 'prihvacena', updated_at = ? WHERE id = ?`).run(now(), o.id);
      db.prepare(`UPDATE listings SET status = 'zamijenjeno' WHERE id IN (${ph})`).run(...allIds);
      // Ostale ponude koje uključuju ove oglase više nemaju smisla
      const others = db.prepare(`SELECT * FROM offers WHERE status = 'na_cekanju' AND id != ?`).all(o.id);
      for (const x of others) {
        const xs = [x.listing_id, ...JSON.parse(x.offered_ids)];
        if (xs.some(id => allIds.includes(id))) {
          db.prepare(`UPDATE offers SET status = 'zatvorena', updated_at = ? WHERE id = ?`).run(now(), x.id);
          const c = getConversation(x.listing_id, x.from_user_id, x.to_user_id);
          addMessage(c.id, null, 'Ova ponuda je zatvorena jer je oglas već zamijenjen.', 1);
        }
      }
      addMessage(conv.id, req.user.id, '✓ Ponuda je PRIHVAĆENA! Dogovorite se ovdje oko mjesta i vremena zamjene.', 1);
    })();
    return res.json({ ok: true, conversation_id: conv.id });
  }

  res.status(400).json({ error: 'Nepoznata akcija' });
});

// ---------- PORUKE ----------
app.post('/api/listings/:id/contact', auth, (req, res) => {
  const l = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Oglas ne postoji' });
  if (l.user_id === req.user.id) return res.status(400).json({ error: 'To je vaš oglas' });
  const c = getConversation(l.id, req.user.id, l.user_id);
  res.json({ conversation_id: c.id });
});

app.get('/api/conversations', auth, (req, res) => {
  const id = req.user.id;
  const rows = db.prepare(`
    SELECT c.*, l.title AS listing_title, l.images AS listing_images,
      CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END AS other_id,
      (SELECT name FROM users WHERE id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END) AS other_name,
      (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_body,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND (sender_id IS NULL OR sender_id != ?) AND read_at IS NULL) AS unread
    FROM conversations c
    LEFT JOIN listings l ON l.id = c.listing_id
    WHERE (c.user_a = ? OR c.user_b = ?) AND EXISTS (SELECT 1 FROM messages WHERE conversation_id = c.id)
    ORDER BY c.updated_at DESC`).all(id, id, id, id, id);
  res.json(rows.map(r => ({ ...r, listing_images: JSON.parse(r.listing_images || '[]') })));
});

function myConversation(req, res) {
  const c = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!c || (c.user_a !== req.user.id && c.user_b !== req.user.id)) {
    res.status(404).json({ error: 'Razgovor ne postoji' });
    return null;
  }
  return c;
}

app.get('/api/conversations/:id', auth, (req, res) => {
  const c = myConversation(req, res);
  if (!c) return;
  const otherId = c.user_a === req.user.id ? c.user_b : c.user_a;
  const other = db.prepare('SELECT id, name, city, phone FROM users WHERE id = ?').get(otherId);
  const listing = parse(db.prepare('SELECT id, title, images, status, user_id FROM listings WHERE id = ?').get(c.listing_id));
  const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY id').all(c.id);
  db.prepare(`UPDATE messages SET read_at = ? WHERE conversation_id = ? AND (sender_id IS NULL OR sender_id != ?) AND read_at IS NULL`)
    .run(now(), c.id, req.user.id);
  res.json({ id: c.id, other, listing, messages });
});

app.post('/api/conversations/:id/messages', auth, (req, res) => {
  const c = myConversation(req, res);
  if (!c) return;
  const body = (req.body.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Poruka je prazna' });
  if (body.length > 2000) return res.status(400).json({ error: 'Poruka je preduga' });
  addMessage(c.id, req.user.id, body);
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

app.get('/api/admin/words', auth, admin, (req, res) => {
  res.json({
    builtin: [...EXACT, ...PREFIX.map(p => p + '...')],
    custom: db.prepare('SELECT * FROM banned_words ORDER BY word').all()
  });
});

app.post('/api/admin/words', auth, admin, (req, res) => {
  const word = (req.body.word || '').trim().toLowerCase();
  if (!word) return res.status(400).json({ error: 'Upišite riječ' });
  db.prepare('INSERT OR IGNORE INTO banned_words (word) VALUES (?)').run(word);
  res.json({ ok: true });
});

app.delete('/api/admin/words/:id', auth, admin, (req, res) => {
  db.prepare('DELETE FROM banned_words WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---------- FRONTEND ----------
app.use(express.static(DIST));
app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Slika je prevelika (max 10 MB)' : 'Greška' });
});

app.listen(PORT, () => console.log(`zamjena.ba radi na portu ${PORT}`));
