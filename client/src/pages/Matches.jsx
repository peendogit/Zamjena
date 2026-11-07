import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, timeAgo } from '../api';
import { Thumb } from '../components';

function Item({ l, label }) {
  return (
    <Link to={`/oglas/${l.id}`} className="offer-item">
      <Thumb src={l.images[0]} />
      <span className="mi-text">
        {label && <small>{label}</small>}
        <b>{l.title}</b>
        {l.user_name && <em>{l.user_name}{l.city ? ` · ${l.city}` : ''}</em>}
      </span>
    </Link>
  );
}

function PairCard({ mine, theirs, note, perfect }) {
  return (
    <div className={`offer match ${perfect ? 'perfect' : ''}`}>
      {note && <p className="match-note">{note}</p>}
      <div className="offer-swap">
        <div className="offer-side"><Item l={mine} label="TVOJE" /></div>
        <div className="offer-arrow">⇄</div>
        <div className="offer-side"><Item l={theirs} label="NJEGOVO" /></div>
      </div>
      <div className="offer-foot">
        <span />
        <Link to={`/oglas/${theirs.id}?ponudi=${mine.id}`} className="btn-yellow">⇄ Ponudi zamjenu</Link>
      </div>
    </div>
  );
}

function Wishes({ wishes, reload }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  async function add(e) {
    e.preventDefault();
    setErr('');
    try {
      await api('/api/wishes', { method: 'POST', body: { text } });
      setText('');
      reload();
    } catch (x) { setErr(x.message); }
  }
  async function del(id) {
    await api(`/api/wishes/${id}`, { method: 'DELETE' });
    reload();
  }
  return (
    <section>
      <h2>📝 Lista želja</h2>
      <p className="muted">Upiši šta tražiš (npr. „kosilica”, „PS4”, „krečenje”). Čim se pojavi takav oglas, javićemo ti.</p>
      <form className="word-add" onSubmit={add}>
        <input value={text} onChange={e => setText(e.target.value)} maxLength={80} placeholder="Šta tražiš?" />
        <button className="btn-yellow">Dodaj</button>
      </form>
      {err && <p className="err">{err}</p>}
      {wishes.map(w => (
        <div key={w.id} className="wish">
          <div className="wish-head">
            <strong>„{w.text}”</strong>
            <span>
              <small className="muted">{w.listings.length ? `${w.listings.length} pogodaka` : 'još ništa'}</small>
              <button className="link danger" onClick={() => del(w.id)}>Obriši</button>
            </span>
          </div>
          {w.listings.length > 0 && (
            <div className="hscroll">
              {w.listings.map(l => (
                <Link key={l.id} to={`/oglas/${l.id}`} className="hcard">
                  <div className="thumb" style={l.images[0] ? { backgroundImage: `url(${l.images[0]})` } : {}}>{!l.images[0] && '⇄'}</div>
                  <b>{l.title}</b>
                  <small>{l.city || 'BiH'}</small>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

export default function Matches({ user, refresh }) {
  const [d, setD] = useState(null);
  const load = () => api('/api/matches').then(r => { setD(r); refresh?.(); }).catch(() => setD(false));
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <Navigate to="/prijava?next=/pogodci" />;
  if (d === null) return <div className="container">Tražim pogotke...</div>;
  if (d === false) return <div className="container">Greška pri učitavanju.</div>;

  const nothing = !d.perfect.length && !d.forYou.length && !d.wantYours.length;
  return (
    <div className="container narrow-wide">
      <h1>✦ Pogodci</h1>
      <p className="muted">Sajt sam traži ko ima ono što ti tražiš i ko traži ono što ti imaš.</p>

      {d.notes.length > 0 && (
        <section>
          <h2>🔔 Novo</h2>
          {d.notes.map(n => (
            <Link key={n.id} to={`/oglas/${n.listing_id}`} className={`conv ${n.seen ? '' : 'unread'}`}>
              <Thumb src={n.listing_images[0]} />
              <div className="conv-body">
                <div className="conv-top"><strong>{n.listing_title}</strong><small>{timeAgo(n.created_at)}</small></div>
                <p>{n.text}</p>
              </div>
            </Link>
          ))}
        </section>
      )}

      {d.perfect.length > 0 && (
        <section>
          <h2>⇄ Savršeni parovi <span className="badge big-badge">{d.perfect.length}</span></h2>
          <p className="muted">Ti imaš ono što oni traže, a oni imaju ono što ti tražiš.</p>
          {d.perfect.map(p => <PairCard key={`${p.mine.id}-${p.theirs.id}`} {...p} perfect />)}
        </section>
      )}

      {d.forYou.length > 0 && (
        <section>
          <h2>🎯 Ima ono što tražiš</h2>
          {d.forYou.map(p => (
            <PairCard key={p.theirs.id} mine={p.mine} theirs={p.theirs}
              note={<>Tražiš: <b>{p.because}</b>{p.open ? <span className="tag tag-open">otvoren za ponude</span> : <> · on traži: {p.theirs.wanted}</>}</>} />
          ))}
        </section>
      )}

      {d.wantYours.length > 0 && (
        <section>
          <h2>🙋 Traže ono što ti imaš</h2>
          {d.wantYours.map(p => (
            <PairCard key={`${p.mine.id}-${p.theirs.id}`} mine={p.mine} theirs={p.theirs}
              note={<><b>{p.theirs.user_name}</b> traži: {p.theirs.wanted}</>} />
          ))}
        </section>
      )}

      {nothing && (
        <div className="empty">
          {!d.has_listings
            ? <>Nemaš aktivnih oglasa. <Link to="/novi-oglas">Dodaj oglas</Link> i izaberi „Tražim tačno ovo” da ti sajt nađe par.</>
            : !d.has_wants
              ? <>Tvoji oglasi su „otvoreni za ponude”. Ako upišeš šta tačno tražiš (Uredi oglas → „Tražim tačno ovo”) ili dodaš želju ispod, sajt će ti tražiti parove.</>
              : <>Još nema pogodaka. Čim se pojavi nešto što ti odgovara, javićemo ti.</>}
        </div>
      )}

      <Wishes wishes={d.wishes} reload={load} />
    </div>
  );
}
