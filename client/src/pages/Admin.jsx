import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { SwapBadge } from '../components';

function Pending({ onChange }) {
  const [items, setItems] = useState(null);
  const load = () => api('/api/admin/pending').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  async function act(id, a) {
    let body;
    if (a === 'odbij') {
      const reason = prompt('Razlog odbijanja (vidi ga korisnik):');
      if (reason === null) return;
      body = { reason };
    }
    await api(`/api/admin/listings/${id}/${a}`, { method: 'POST', body });
    load();
    onChange();
  }
  if (items === null) return <p>Učitavam...</p>;
  if (!items.length) return <p className="empty">Nema oglasa za pregled. 👍</p>;
  return items.map(l => (
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
  ));
}

function Reports({ onChange }) {
  const [items, setItems] = useState(null);
  const load = () => api('/api/admin/reports').then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  async function act(r, action) {
    let body;
    if (action === 'ukloni') {
      const reason = prompt('Razlog uklanjanja (vidi ga vlasnik):', 'Uklonjeno nakon prijave');
      if (reason === null) return;
      body = { reason };
    }
    await api(`/api/admin/reports/${r.listing_id}/${action}`, { method: 'POST', body });
    load();
    onChange();
  }
  async function block(r) {
    if (!confirm(`Blokirati korisnika ${r.owner_name}? Neće se moći prijaviti, a njegovi oglasi se sakrivaju.`)) return;
    await api(`/api/admin/users/${r.owner_id}/block`, { method: 'POST', body: { block: true } });
    await api(`/api/admin/reports/${r.listing_id}/ukloni`, { method: 'POST', body: { reason: 'Korisnik blokiran' } });
    load();
    onChange();
  }
  if (items === null) return <p>Učitavam...</p>;
  if (!items.length) return <p className="empty">Nema otvorenih prijava. 👍</p>;
  return items.map(r => (
    <div key={r.listing_id} className="admin-item">
      {r.images[0] ? <img src={r.images[0]} alt="" /> : <div className="noimg small">Bez slike</div>}
      <div className="admin-body">
        <h3>{r.title} <span className="badge big-badge">{r.total}×</span></h3>
        <p className="report-reasons">{r.reasons}</p>
        <small>Vlasnik: {r.owner_name} ({r.owner_email}){r.owner_blocked ? ' · BLOKIRAN' : ''}</small>
        <div className="admin-actions">
          <button className="btn-red" onClick={() => act(r, 'ukloni')}>Ukloni oglas</button>
          <button className="btn-outline" onClick={() => act(r, 'odbaci')}>Odbaci prijavu</button>
          {!r.owner_blocked && <button className="link danger" onClick={() => block(r)}>Blokiraj korisnika</button>}
          <Link to={`/oglas/${r.listing_id}`}>Pogledaj</Link>
        </div>
      </div>
    </div>
  ));
}

function Users({ me }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const load = (s = q) => api(`/api/admin/users?q=${encodeURIComponent(s)}`).then(setItems).catch(() => setItems([]));
  useEffect(() => { load(''); }, []);
  async function toggle(u) {
    const block = !u.blocked;
    if (!confirm(`${block ? 'Blokirati' : 'Odblokirati'} korisnika ${u.name}?`)) return;
    try {
      await api(`/api/admin/users/${u.id}/block`, { method: 'POST', body: { block } });
      load();
    } catch (x) { alert(x.message); }
  }
  return (
    <>
      <form className="word-add" onSubmit={e => { e.preventDefault(); load(); }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Traži po imenu ili emailu" />
        <button className="btn-yellow">Traži</button>
      </form>
      {items === null ? <p>Učitavam...</p> : items.map(u => (
        <div key={u.id} className="row">
          <Link to={`/korisnik/${u.id}`} className="row-main">
            <strong>{u.name} {u.is_admin ? '👑' : ''}</strong>
            <small>{u.email} · {u.city || '-'} · {u.listings} oglasa</small>
          </Link>
          <div className="row-right">
            {u.blocked ? <span className="st st-no">Blokiran</span> : null}
            {u.id !== me.id && (
              <button className={`link ${u.blocked ? 'link-blue' : 'danger'}`} onClick={() => toggle(u)}>
                {u.blocked ? 'Odblokiraj' : 'Blokiraj'}
              </button>
            )}
          </div>
        </div>
      ))}
    </>
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
  if (!data) return <p>Učitavam...</p>;
  return (
    <div className="words">
      <p className="muted">Dodaj riječ ili izraz. Oglas koji ih sadrži neće proći. Jedna riječ hvata i sve oblike koji počinju njom (npr. „zlat” hvata zlato, zlatni...).</p>
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

export default function Admin({ user }) {
  const [tab, setTab] = useState('pending');
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');
  const loadStats = () => api('/api/admin/stats').then(setStats).catch(e => setErr(e.message));
  useEffect(() => { if (user) loadStats(); }, [user]);
  if (!user) return <Navigate to="/prijava?next=/admin" />;
  if (err) return <div className="container"><p className="err">{err}</p></div>;

  const tabs = [
    ['pending', 'Na čekanju', stats?.pending],
    ['reports', 'Prijave', stats?.reports],
    ['users', 'Korisnici'],
    ['words', 'Riječi']
  ];
  return (
    <div className="container narrow-wide">
      <h1>Admin</h1>
      {stats && (
        <div className="admin-stats">
          <div><b>{stats.active}</b><small>aktivnih oglasa</small></div>
          <div><b>{stats.swaps}</b><small>zamjena</small></div>
          <div><b>{stats.users}</b><small>korisnika</small></div>
        </div>
      )}
      <div className="tabs">
        {tabs.map(([k, label, n]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label} {n > 0 && <span className="badge">{n}</span>}
          </button>
        ))}
      </div>
      {tab === 'pending' && <Pending onChange={loadStats} />}
      {tab === 'reports' && <Reports onChange={loadStats} />}
      {tab === 'users' && <Users me={user} />}
      {tab === 'words' && <BannedWords />}
    </div>
  );
}
