import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, timeAgo } from '../api';
import { Thumb, StarPicker, Modal } from '../components';

function RateModal({ o, received, onClose, onDone }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const name = received ? o.from_name : o.to_name;
  async function send() {
    setErr('');
    try {
      await api(`/api/offers/${o.id}/rate`, { method: 'POST', body: { stars, comment } });
      onDone();
    } catch (x) { setErr(x.message); }
  }
  return (
    <Modal title={`Ocijeni: ${name}`} onClose={onClose}>
      <p className="muted">Kako je prošla zamjena? Ocjena se vidi na profilu korisnika.</p>
      <StarPicker value={stars} onChange={setStars} />
      <label className="block">Komentar (nije obavezno)
        <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="npr. Korektan, sve kako je opisano" />
      </label>
      {err && <p className="err">{err}</p>}
      <button className="btn-yellow big" disabled={!stars} onClick={send}>Pošalji ocjenu</button>
    </Modal>
  );
}

const OFFER_STATUS = {
  na_cekanju: { t: 'Na čekanju', c: 'st-wait' },
  prihvacena: { t: 'Prihvaćena', c: 'st-ok' },
  odbijena: { t: 'Odbijena', c: 'st-no' },
  povucena: { t: 'Povučena', c: 'st-gray' },
  zatvorena: { t: 'Zatvorena', c: 'st-gray' }
};

function OfferCard({ o, received, onAction }) {
  const s = OFFER_STATUS[o.status] || { t: o.status, c: '' };
  return (
    <div className="offer">
      <div className="offer-top">
        <span>{received ? <><strong>{o.from_name}</strong> nudi zamjenu</> : <>Tvoja ponuda za <strong>{o.to_name}</strong></>}</span>
        <span className={`st ${s.c}`}>{s.t}</span>
      </div>
      <div className="offer-swap">
        <div className="offer-side">
          <small>{received ? 'NUDI' : 'NUDIŠ'}</small>
          {o.offered.map(x => (
            <Link key={x.id} to={`/oglas/${x.id}`} className="offer-item">
              <Thumb src={x.images[0]} /><span>{x.title}</span>
            </Link>
          ))}
        </div>
        <div className="offer-arrow">⇄</div>
        <div className="offer-side">
          <small>{received ? 'ZA TVOJ' : 'ZA NJEGOV'}</small>
          <Link to={`/oglas/${o.listing_id}`} className="offer-item">
            <Thumb src={o.listing_images[0]} /><span>{o.listing_title}</span>
          </Link>
        </div>
      </div>
      {o.message && <p className="offer-msg">„{o.message}”</p>}
      <div className="offer-foot">
        <small className="muted">{timeAgo(o.created_at)}</small>
        <div className="offer-btns">
          {o.status === 'na_cekanju' && received && (
            <>
              <button className="btn-yellow" onClick={() => onAction(o, 'prihvati')}>Prihvati</button>
              <button className="btn-red" onClick={() => onAction(o, 'odbij')}>Odbij</button>
            </>
          )}
          {o.status === 'na_cekanju' && !received && (
            <button className="btn-outline" onClick={() => onAction(o, 'povuci')}>Povuci ponudu</button>
          )}
          {o.status === 'prihvacena' && (
            o.my_rating
              ? <span className="rated">Ocijenio si {'★'.repeat(o.my_rating)}</span>
              : <button className="btn-yellow" onClick={() => onAction(o, 'ocijeni')}>★ Ocijeni</button>
          )}
          <button className="link-blue" onClick={() => onAction(o, 'chat')}>Poruke →</button>
        </div>
      </div>
    </div>
  );
}

export default function Offers({ user, refresh }) {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('received');
  const [rating, setRating] = useState(null);
  const load = () => api('/api/offers').then(d => { setData(d); refresh?.(); }).catch(() => setData({ received: [], sent: [] }));
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <Navigate to="/prijava?next=/ponude" />;

  async function onAction(o, action) {
    try {
      if (action === 'chat') return nav(`/poruke/${o.conversation_id}`);
      if (action === 'ocijeni') return setRating(o);
      const ask = {
        prihvati: 'Prihvatiti ovu zamjenu? Oba oglasa će biti označena kao zamijenjena.',
        odbij: 'Odbiti ovu ponudu?',
        povuci: 'Povući svoju ponudu?'
      }[action];
      if (!confirm(ask)) return;
      const r = await api(`/api/offers/${o.id}/${action}`, { method: 'POST' });
      if (action === 'prihvati' && r.conversation_id) return nav(`/poruke/${r.conversation_id}`);
      load();
    } catch (x) { alert(x.message); load(); }
  }

  const list = data ? data[tab] : null;
  const pendingIn = data?.received.filter(o => o.status === 'na_cekanju').length || 0;
  return (
    <div className="container narrow-wide">
      <h1>Ponude zamjene</h1>
      <div className="tabs">
        <button className={tab === 'received' ? 'on' : ''} onClick={() => setTab('received')}>
          Primljene {pendingIn > 0 && <span className="badge">{pendingIn}</span>}
        </button>
        <button className={tab === 'sent' ? 'on' : ''} onClick={() => setTab('sent')}>Poslane</button>
      </div>
      {list === null ? <p>Učitavam...</p>
        : list.length === 0 ? (
          <p className="empty">
            {tab === 'received' ? 'Još nemaš primljenih ponuda.' : <>Nisi poslao nijednu ponudu. <Link to="/oglasi">Pogledaj oglase</Link></>}
          </p>
        ) : list.map(o => <OfferCard key={o.id} o={o} received={tab === 'received'} onAction={onAction} />)}
      {rating && (
        <RateModal o={rating} received={tab === 'received'} onClose={() => setRating(null)}
          onDone={() => { setRating(null); load(); }} />
      )}
    </div>
  );
}
