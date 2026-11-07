import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, timeAgo } from '../api';
import { Thumb } from '../components';

function OfferModal({ listing, onClose }) {
  const nav = useNavigate();
  const [mine, setMine] = useState(null);
  const [picked, setPicked] = useState([]);
  const [message, setMessage] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/api/my-listings?active=1').then(setMine).catch(e => { setErr(e.message); setMine([]); }); }, []);

  const toggle = id => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

  async function send() {
    setErr('');
    setBusy(true);
    try {
      const r = await api(`/api/listings/${listing.id}/offers`, { method: 'POST', body: { offered_ids: picked, message } });
      nav(`/poruke/${r.conversation_id}`);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Ponudi zamjenu</h2>
          <button className="x" onClick={onClose} aria-label="Zatvori">×</button>
        </div>
        <p className="muted">Za: <strong>{listing.title}</strong></p>
        {listing.swap_mode === 'trazim' && (
          <p className="hint">Vlasnik traži: <strong>{listing.wanted}</strong></p>
        )}

        {mine === null ? <p>Učitavam tvoje oglase...</p>
          : mine.length === 0 ? (
            <div className="empty">
              Nemaš aktivnih oglasa koje možeš ponuditi.<br />
              <Link to="/novi-oglas">Dodaj oglas</Link> pa se vrati ovdje (oglas mora prvo biti odobren).
            </div>
          ) : (
            <>
              <p><strong>Šta nudiš?</strong> Izaberi jedan ili više svojih oglasa:</p>
              <div className="pick-list">
                {mine.map(m => (
                  <label key={m.id} className={`pick ${picked.includes(m.id) ? 'on' : ''}`}>
                    <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
                    <Thumb src={m.images[0]} />
                    <span>{m.title}</span>
                  </label>
                ))}
              </div>
              <label className="block">Poruka (nije obavezno)
                <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="npr. Mogu doći u subotu, stvar je ispravna..." />
              </label>
              {err && <p className="err">{err}</p>}
              <button className="btn-yellow big" disabled={!picked.length || busy} onClick={send}>
                {busy ? 'Šaljem...' : `⇄ Pošalji ponudu${picked.length > 1 ? ` (${picked.length} oglasa)` : ''}`}
              </button>
            </>
          )}
        {mine?.length === 0 && err && <p className="err">{err}</p>}
      </div>
    </div>
  );
}

export default function ListingPage({ user }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [l, setL] = useState(null);
  const [img, setImg] = useState(0);
  const [offering, setOffering] = useState(false);

  useEffect(() => { setImg(0); api(`/api/listings/${id}`).then(setL).catch(() => setL(false)); }, [id]);

  if (l === null) return <div className="container">Učitavam...</div>;
  if (l === false) return <div className="container">Oglas ne postoji.</div>;

  const mine = user && user.id === l.user_id;
  const active = l.status === 'aktivan';
  const needLogin = () => nav(`/prijava?next=/oglas/${l.id}`);

  async function contact() {
    if (!user) return needLogin();
    try {
      const r = await api(`/api/listings/${l.id}/contact`, { method: 'POST' });
      nav(`/poruke/${r.conversation_id}`);
    } catch (x) { alert(x.message); }
  }

  return (
    <div className="container">
      {l.status === 'na_cekanju' && <p className="notice">Ovaj oglas čeka odobrenje i još nije javno vidljiv.</p>}
      {l.status === 'odbijen' && <p className="notice">Oglas je odbijen{l.reject_reason ? `: ${l.reject_reason}` : ''}. Uredi ga i pošalji ponovo.</p>}
      {l.status === 'zamijenjeno' && <p className="notice done">⇄ Ova stvar je već zamijenjena.</p>}
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
          {mine ? (
            l.status !== 'zamijenjeno' && <Link to={`/uredi-oglas/${l.id}`} className="btn-outline big">Uredi oglas</Link>
          ) : active && (
            <div className="actions">
              <button className="btn-yellow big" onClick={() => (user ? setOffering(true) : needLogin())}>
                ⇄ Ponudi zamjenu
              </button>
              <button className="btn-outline big" onClick={contact}>✉ Pošalji poruku</button>
            </div>
          )}
        </div>
      </div>
      {offering && <OfferModal listing={l} onClose={() => setOffering(false)} />}
    </div>
  );
}
