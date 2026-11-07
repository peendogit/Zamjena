import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Link, NavLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from './api';
import { Logo, Card, SwapBadge, STATUS, MOTO } from './components';
import ListingForm from './pages/ListingForm';
import ListingPage from './pages/ListingPage';
import Offers from './pages/Offers';
import { Inbox, Chat } from './pages/Messages';
import Profile from './pages/Profile';

function Header({ user, logout, notes }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header>
      <Logo />
      <div className="head-right">
        {user && (
          <>
            <NavLink to="/ponude" className="icon-link" title="Ponude">
              ⇄{notes.offers > 0 && <span className="badge">{notes.offers}</span>}
            </NavLink>
            <NavLink to="/poruke" className="icon-link" title="Poruke">
              ✉{notes.messages > 0 && <span className="badge">{notes.messages}</span>}
            </NavLink>
          </>
        )}
        <Link to="/novi-oglas" className="btn-yellow">+ Oglas</Link>
        <button className="burger" onClick={() => setOpen(!open)} aria-label="Meni">☰</button>
      </div>
      {open && (
        <nav className="menu" onClick={close}>
          <Link to="/oglasi">Svi oglasi</Link>
          {user ? (
            <>
              <Link to="/moji-oglasi">Moji oglasi</Link>
              <Link to="/ponude">Ponude zamjene {notes.offers > 0 && <span className="badge">{notes.offers}</span>}</Link>
              <Link to="/poruke">Poruke {notes.messages > 0 && <span className="badge">{notes.messages}</span>}</Link>
              <Link to="/profil">Moj profil</Link>
              {user.is_admin ? <Link to="/admin">Admin</Link> : null}
              <button className="link" onClick={logout}>Odjava</button>
            </>
          ) : (
            <>
              <Link to="/prijava">Prijava</Link>
              <Link to="/registracija">Registracija</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}

function SearchBar({ initial = '' }) {
  const [q, setQ] = useState(initial);
  const nav = useNavigate();
  return (
    <form className="search" onSubmit={e => { e.preventDefault(); nav(`/oglasi?q=${encodeURIComponent(q)}`); }}>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Šta želiš zamijeniti?" />
      <button className="btn-yellow">Traži</button>
    </form>
  );
}

function Home() {
  const [cats, setCats] = useState([]);
  const [latest, setLatest] = useState([]);
  useEffect(() => {
    api('/api/categories').then(setCats).catch(() => {});
    api('/api/listings').then(d => setLatest(d.slice(0, 12))).catch(() => {});
  }, []);
  return (
    <>
      <section className="hero">
        <h1>Koja je cijena, paše li keš?</h1>
        <h2>Ne hvala, <span>samo zamjena.</span></h2>
        <SearchBar />
        <Link to="/novi-oglas" className="btn-yellow">Ponudi nešto za zamjenu</Link>
      </section>
      <div className="container">
        <h2>Kategorije</h2>
        <div className="cats">
          {cats.map(c => (
            <Link key={c.id} to={`/oglasi?category=${c.slug}`} className={`cat ${c.slug === 'usluge' ? 'cat-special' : ''}`}>
              <span>{c.name}</span><small>{c.total}</small>
            </Link>
          ))}
        </div>
        <h2>Najnovije zamjene</h2>
        {latest.length === 0
          ? <p className="empty">Još nema oglasa. Budi prvi i <Link to="/novi-oglas">dodaj oglas</Link>!</p>
          : <div className="grid">{latest.map(l => <Card key={l.id} l={l} />)}</div>}
      </div>
    </>
  );
}

function Listings() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  useEffect(() => { api('/api/categories').then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    setItems(null);
    api(`/api/listings?${params.toString()}`).then(setItems).catch(() => setItems([]));
  }, [params]);
  const set = (k, v) => {
    const p = new URLSearchParams(params);
    v ? p.set(k, v) : p.delete(k);
    setParams(p);
  };
  return (
    <div className="container">
      <SearchBar key={params.get('q') || ''} initial={params.get('q') || ''} />
      <div className="filters">
        <select value={params.get('category') || ''} onChange={e => set('category', e.target.value)}>
          <option value="">Sve kategorije</option>
          {cats.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={params.get('mode') || ''} onChange={e => set('mode', e.target.value)}>
          <option value="">Svi oglasi</option>
          <option value="otvoren">Otvoren za ponude</option>
          <option value="trazim">Traži tačno nešto</option>
        </select>
        <input placeholder="Grad" defaultValue={params.get('city') || ''}
          onKeyDown={e => { if (e.key === 'Enter') set('city', e.target.value); }}
          onBlur={e => set('city', e.target.value)} />
      </div>
      {items === null ? <p>Učitavam...</p>
        : items.length === 0 ? <p className="empty">Nema oglasa za ovu pretragu.</p>
        : <>
            <p className="muted">{items.length} oglasa</p>
            <div className="grid">{items.map(l => <Card key={l.id} l={l} />)}</div>
          </>}
    </div>
  );
}

function MyListings({ user }) {
  const [items, setItems] = useState(null);
  const load = () => api('/api/my-listings').then(setItems).catch(() => setItems([]));
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <Navigate to="/prijava?next=/moji-oglasi" />;
  async function remove(id) {
    if (!confirm('Obrisati ovaj oglas?')) return;
    await api(`/api/listings/${id}`, { method: 'DELETE' });
    load();
  }
  return (
    <div className="container narrow-wide">
      <h1>Moji oglasi</h1>
      {items === null ? <p>Učitavam...</p>
        : items.length === 0 ? <p className="empty">Nemaš oglasa. <Link to="/novi-oglas">Dodaj prvi</Link>.</p>
        : items.map(l => (
          <div key={l.id} className="row">
            <Link to={`/oglas/${l.id}`} className="row-main">
              <strong>{l.title}</strong>
              <small>
                {l.category_name} · <span className={`status s-${l.status}`}>{STATUS[l.status] || l.status}</span>
                {l.pending_offers > 0 && <> · <span className="hot">{l.pending_offers} ponud{l.pending_offers === 1 ? 'a' : 'e'}</span></>}
              </small>
              {l.status === 'odbijen' && l.reject_reason && <small className="err">Razlog: {l.reject_reason}</small>}
            </Link>
            <div className="row-right">
              {l.status !== 'zamijenjeno' && <Link to={`/uredi-oglas/${l.id}`} className="link-blue">Uredi</Link>}
              <button className="link danger" onClick={() => remove(l.id)}>Obriši</button>
            </div>
          </div>
        ))}
    </div>
  );
}

function BannedWords() {
  const [data, setData] = useState(null);
  const [word, setWord] = useState('');
  const [show, setShow] = useState(false);
  const load = () => api('/api/admin/words').then(setData).catch(() => {});
  useEffect(() => { load(); }, []);
  async function add(e) {
    e.preventDefault();
    if (!word.trim()) return;
    try { await api('/api/admin/words', { method: 'POST', body: { word } }); setWord(''); load(); }
    catch (x) { alert(x.message); }
  }
  async function del(id) { await api(`/api/admin/words/${id}`, { method: 'DELETE' }); load(); }
  if (!data) return null;
  return (
    <div className="words">
      <h2>Zabranjene riječi</h2>
      <p className="muted">Dodaj riječ ili izraz. Oglas koji ih sadrži neće proći. Jedna riječ hvata i sve oblike koji počinju njom (npr. "mijenjam za pare" ili "zlato").</p>
      <form className="word-add" onSubmit={add}>
        <input value={word} onChange={e => setWord(e.target.value)} placeholder="nova riječ ili izraz" />
        <button className="btn-yellow">Dodaj</button>
      </form>
      <div className="chips">
        {data.custom.length === 0 && <span className="muted">Još nema dodatih riječi.</span>}
        {data.custom.map(w => (
          <span key={w.id} className="chip">{w.word}<button onClick={() => del(w.id)} aria-label="Ukloni">×</button></span>
        ))}
      </div>
      <button className="link-blue" onClick={() => setShow(!show)}>{show ? 'Sakrij' : 'Prikaži'} ugrađene riječi ({data.builtin.length})</button>
      {show && <div className="chips">{data.builtin.map(w => <span key={w} className="chip gray">{w}</span>)}</div>}
    </div>
  );
}

function Admin({ user }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api('/api/admin/pending').then(setItems).catch(e => { setErr(e.message); setItems([]); });
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <Navigate to="/prijava?next=/admin" />;
  async function act(id, a) {
    let body;
    if (a === 'odbij') {
      const reason = prompt('Razlog odbijanja (vidi ga korisnik):');
      if (reason === null) return;
      body = { reason };
    }
    await api(`/api/admin/listings/${id}/${a}`, { method: 'POST', body });
    load();
  }
  return (
    <div className="container">
      <h1>Oglasi na čekanju {items?.length > 0 && <span className="badge big-badge">{items.length}</span>}</h1>
      {err && <p className="err">{err}</p>}
      {items === null ? <p>Učitavam...</p>
        : items.length === 0 ? <p className="empty">Nema oglasa za pregled. 👍</p>
        : items.map(l => (
          <div key={l.id} className="admin-item">
            {l.images[0] ? <img src={l.images[0]} alt="" /> : <div className="noimg small">Bez slike</div>}
            <div className="admin-body">
              <h3>{l.title}</h3>
              <SwapBadge l={l} />
              <p className="desc">{l.description}</p>
              <small>{l.category_name} · {l.user_name} ({l.user_email}) · {l.city || '-'}</small>
              <div className="admin-actions">
                <button className="btn-yellow" onClick={() => act(l.id, 'odobri')}>Odobri</button>
                <button className="btn-red" onClick={() => act(l.id, 'odbij')}>Odbij</button>
                <Link to={`/oglas/${l.id}`}>Pogledaj</Link>
              </div>
            </div>
          </div>
        ))}
      {!err && <BannedWords />}
    </div>
  );
}

function AuthForm({ type, setUser }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [err, setErr] = useState('');
  const isLogin = type === 'login';
  async function submit(e) {
    e.preventDefault();
    setErr('');
    const body = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api(`/api/${isLogin ? 'login' : 'register'}`, { method: 'POST', body });
      localStorage.setItem('token', r.token);
      localStorage.setItem('user', JSON.stringify(r.user));
      setUser(r.user);
      nav(params.get('next') || '/');
    } catch (x) {
      setErr(x.message);
    }
  }
  return (
    <div className="container narrow">
      <h1>{isLogin ? 'Prijava' : 'Registracija'}</h1>
      <form className="form" onSubmit={submit}>
        {!isLogin && <label>Ime<input name="name" required /></label>}
        <label>Email<input name="email" type="email" required /></label>
        {!isLogin && (
          <div className="two">
            <label>Telefon<input name="phone" type="tel" /></label>
            <label>Grad<input name="city" /></label>
          </div>
        )}
        <label>Lozinka<input name="password" type="password" required minLength={6} /></label>
        {err && <p className="err">{err}</p>}
        <button className="btn-yellow big">{isLogin ? 'Prijavi se' : 'Registruj se'}</button>
        <p className="muted center">
          {isLogin
            ? <>Nemaš račun? <Link to={`/registracija${params.get('next') ? `?next=${params.get('next')}` : ''}`}>Registruj se</Link></>
            : <>Već imaš račun? <Link to="/prijava">Prijavi se</Link></>}
        </p>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [notes, setNotes] = useState({ messages: 0, offers: 0 });

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api('/api/me')
      .then(u => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); })
      .catch(() => setUser(null));
  }, []);

  const refresh = useCallback(() => {
    if (!localStorage.getItem('token')) return;
    api('/api/notifications').then(setNotes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) { setNotes({ messages: 0, offers: 0 }); return; }
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [user, refresh]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <>
      <Header user={user} logout={logout} notes={notes} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/oglasi" element={<Listings />} />
          <Route path="/oglas/:id" element={<ListingPage user={user} />} />
          <Route path="/novi-oglas" element={<ListingForm user={user} />} />
          <Route path="/uredi-oglas/:id" element={<ListingForm user={user} />} />
          <Route path="/moji-oglasi" element={<MyListings user={user} />} />
          <Route path="/ponude" element={<Offers user={user} refresh={refresh} />} />
          <Route path="/poruke" element={<Inbox user={user} />} />
          <Route path="/poruke/:id" element={<Chat user={user} refresh={refresh} />} />
          <Route path="/profil" element={<Profile user={user} setUser={setUser} />} />
          <Route path="/admin" element={<Admin user={user} />} />
          <Route path="/prijava" element={<AuthForm type="login" setUser={setUser} />} />
          <Route path="/registracija" element={<AuthForm type="register" setUser={setUser} />} />
          <Route path="*" element={<div className="container"><h1>Stranica ne postoji</h1><Link to="/">Nazad na početnu</Link></div>} />
        </Routes>
      </main>
      <footer>
        <Logo />
        <p>{MOTO}</p>
      </footer>
    </>
  );
}
