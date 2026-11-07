import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, timeAgo } from './api';

const MOTO = 'Koja je cijena, paše li keš? Ne hvala, samo zamjena.';

function Logo() {
  return (
    <Link to="/" className="logo">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
        <g fill="none" stroke="#FFC300" strokeWidth="6" strokeLinecap="round">
          <path d="M18 26a15 15 0 0 1 27-6" />
          <path d="M46 38a15 15 0 0 1-27 6" />
        </g>
        <path d="M48 10v13H35z" fill="#FFC300" />
        <path d="M16 54V41h13z" fill="#FFC300" />
      </svg>
      <span>zamjena<b>.ba</b></span>
    </Link>
  );
}

function Header({ user, logout }) {
  return (
    <header>
      <Logo />
      <nav>
        {user ? (
          <>
            <Link to="/moji-oglasi">Moji oglasi</Link>
            {user.is_admin ? <Link to="/admin">Admin</Link> : null}
            <button className="link" onClick={logout}>Odjava</button>
          </>
        ) : (
          <>
            <Link to="/prijava">Prijava</Link>
            <Link to="/registracija">Registracija</Link>
          </>
        )}
        <Link to="/novi-oglas" className="btn-yellow">+ Dodaj oglas</Link>
      </nav>
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

function SwapBadge({ l }) {
  return l.swap_mode === 'trazim'
    ? <p className="swap"><span className="tag tag-want">Traži</span> {l.wanted}</p>
    : <p className="swap"><span className="tag tag-open">Otvoren za ponude</span></p>;
}

function Card({ l }) {
  return (
    <Link to={`/oglas/${l.id}`} className="card">
      <div className="thumb" style={l.images[0] ? { backgroundImage: `url(${l.images[0]})` } : {}}>
        {!l.images[0] && <span>Bez slike</span>}
      </div>
      <div className="card-body">
        <h3>{l.title}</h3>
        <SwapBadge l={l} />
        <small>{l.city || 'BiH'} · {timeAgo(l.created_at)}</small>
      </div>
    </Link>
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

function ListingPage({ user }) {
  const { id } = useParams();
  const [l, setL] = useState(null);
  const [img, setImg] = useState(0);
  useEffect(() => { setImg(0); api(`/api/listings/${id}`).then(setL).catch(() => setL(false)); }, [id]);
  if (l === null) return <div className="container">Učitavam...</div>;
  if (l === false) return <div className="container">Oglas ne postoji.</div>;
  const mine = user && user.id === l.user_id;
  return (
    <div className="container">
      {l.status !== 'aktivan' && <p className="notice">Ovaj oglas još nije javno vidljiv ({l.status === 'na_cekanju' ? 'čeka odobrenje' : 'odbijen'}).</p>}
      <div className="listing">
        <div className="gallery">
          {l.images.length ? (
            <>
              <img src={l.images[img]} alt={l.title} />
              {l.images.length > 1 && (
                <div className="thumbs">
                  {l.images.map((s, i) => (
                    <img key={s} src={s} alt="" className={i === img ? 'on' : ''} onClick={() => setImg(i)} />
                  ))}
                </div>
              )}
            </>
          ) : <div className="noimg">Bez slike</div>}
        </div>
        <div>
          <h1>{l.title}</h1>
          <div className="swapbox">
            {l.swap_mode === 'trazim'
              ? <><small>MIJENJA ZA</small><strong>{l.wanted}</strong></>
              : <><small>NAČIN ZAMJENE</small><strong>Otvoren za ponude</strong></>}
          </div>
          <p className="meta">
            <span>{l.category_name}</span>
            <span>{l.item_condition === 'novo' ? 'Novo' : 'Korišteno'}</span>
            <span>{l.city || 'BiH'}</span>
            <span>{timeAgo(l.created_at)}</span>
          </p>
          <h3>Opis</h3>
          <p className="desc">{l.description}</p>
          <div className="owner">
            <strong>{l.user_name}</strong>
            <small>{l.user_city || ''}</small>
          </div>
          {!mine && (
            <button className="btn-yellow big" disabled title="Uskoro">
              ⇄ Ponudi zamjenu (uskoro)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NewListing({ user }) {
  const nav = useNavigate();
  const [cats, setCats] = useState([]);
  const [mode, setMode] = useState('otvoren');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState([]);
  useEffect(() => { api('/api/categories').then(setCats).catch(() => {}); }, []);
  if (!user) return <Navigate to="/prijava?next=/novi-oglas" />;

  function pickImages(e) {
    const files = [...e.target.files].slice(0, 8);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api('/api/listings', { method: 'POST', body: new FormData(e.target) });
      alert(r.message);
      nav('/moji-oglasi');
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  }

  return (
    <div className="container narrow">
      <h1>Novi oglas za zamjenu</h1>
      <p className="muted">{MOTO} Oglasi s cijenama i prodajom se ne objavljuju.</p>
      <form className="form" onSubmit={submit}>
        <label>Naslov
          <input name="title" required maxLength={80} placeholder="npr. Bušilica Bosch 18V" />
        </label>
        <label>Kategorija
          <select name="category_id" required defaultValue="">
            <option value="" disabled>Izaberi kategoriju</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Opis
          <textarea name="description" required rows={5} placeholder="Opiši stvar ili uslugu koju nudiš" />
        </label>
        <div className="two">
          <label>Grad
            <input name="city" defaultValue={user.city || ''} placeholder="npr. Bijeljina" />
          </label>
          <label>Stanje
            <select name="item_condition" defaultValue="koristeno">
              <option value="koristeno">Korišteno</option>
              <option value="novo">Novo</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend>Šta želiš u zamjenu?</legend>
          <label className="radio">
            <input type="radio" name="swap_mode" value="otvoren" checked={mode === 'otvoren'} onChange={() => setMode('otvoren')} />
            Otvoren za ponude
          </label>
          <label className="radio">
            <input type="radio" name="swap_mode" value="trazim" checked={mode === 'trazim'} onChange={() => setMode('trazim')} />
            Tražim tačno ovo
          </label>
          {mode === 'trazim' && (
            <input name="wanted" required placeholder="npr. Kosilica za travu ili PlayStation 4" />
          )}
        </fieldset>
        <label>Slike (do 8)
          <input type="file" name="images" accept="image/*" multiple onChange={pickImages} />
        </label>
        {previews.length > 0 && (
          <div className="previews">{previews.map(p => <img key={p} src={p} alt="" />)}</div>
        )}
        {err && <p className="err">{err}</p>}
        <button className="btn-yellow big" disabled={busy}>{busy ? 'Šaljem...' : 'Objavi oglas'}</button>
      </form>
    </div>
  );
}

function MyListings({ user }) {
  const [items, setItems] = useState(null);
  const load = () => api('/api/my-listings').then(setItems).catch(() => setItems([]));
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <Navigate to="/prijava?next=/moji-oglasi" />;
  const label = { na_cekanju: '⏳ Na čekanju', aktivan: '✅ Aktivan', odbijen: '❌ Odbijen' };
  async function remove(id) {
    if (!confirm('Obrisati ovaj oglas?')) return;
    await api(`/api/listings/${id}`, { method: 'DELETE' });
    load();
  }
  return (
    <div className="container">
      <h1>Moji oglasi</h1>
      {items === null ? <p>Učitavam...</p>
        : items.length === 0 ? <p className="empty">Nemaš oglasa. <Link to="/novi-oglas">Dodaj prvi</Link>.</p>
        : items.map(l => (
          <div key={l.id} className="row">
            <Link to={`/oglas/${l.id}`}>
              <strong>{l.title}</strong>
              <small>{l.category_name}</small>
            </Link>
            <div className="row-right">
              <span className={`status s-${l.status}`}>{label[l.status]}</span>
              <button className="link danger" onClick={() => remove(l.id)}>Obriši</button>
            </div>
          </div>
        ))}
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
    if (a === 'odbij') body = { reason: prompt('Razlog odbijanja (nije obavezno):') || '' };
    await api(`/api/admin/listings/${id}/${a}`, { method: 'POST', body });
    load();
  }
  return (
    <div className="container">
      <h1>Oglasi na čekanju</h1>
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
            ? <>Nemaš račun? <Link to="/registracija">Registruj se</Link></>
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

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    api('/api/me')
      .then(u => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); })
      .catch(() => setUser(null));
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <>
      <Header user={user} logout={logout} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/oglasi" element={<Listings />} />
          <Route path="/oglas/:id" element={<ListingPage user={user} />} />
          <Route path="/novi-oglas" element={<NewListing user={user} />} />
          <Route path="/moji-oglasi" element={<MyListings user={user} />} />
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
