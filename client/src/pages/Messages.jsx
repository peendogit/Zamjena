import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { api, timeAgo } from '../api';
import { Thumb } from '../components';

export function Inbox({ user }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!user) return;
    const load = () => api('/api/conversations').then(setItems).catch(() => setItems([]));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [user]);
  if (!user) return <Navigate to="/prijava?next=/poruke" />;
  return (
    <div className="container narrow-wide">
      <h1>Poruke</h1>
      {items === null ? <p>Učitavam...</p>
        : items.length === 0 ? <p className="empty">Nemaš poruka. Javi se nekom preko oglasa!</p>
        : items.map(c => (
          <Link key={c.id} to={`/poruke/${c.id}`} className={`conv ${c.unread ? 'unread' : ''}`}>
            <Thumb src={c.listing_images[0]} />
            <div className="conv-body">
              <div className="conv-top">
                <strong>{c.other_name}</strong>
                <small>{timeAgo(c.updated_at)}</small>
              </div>
              <small className="conv-listing">{c.listing_title || 'Oglas obrisan'}</small>
              <p>{c.last_body}</p>
            </div>
            {c.unread > 0 && <span className="badge">{c.unread}</span>}
          </Link>
        ))}
    </div>
  );
}

export function Chat({ user, refresh }) {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const lastCount = useRef(0);

  useEffect(() => {
    if (!user) return;
    lastCount.current = 0;
    const load = () => api(`/api/conversations/${id}`).then(d => { setC(d); refresh?.(); }).catch(() => setC(false));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [id, user]);

  useEffect(() => {
    if (c && c.messages.length !== lastCount.current) {
      lastCount.current = c.messages.length;
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [c]);

  if (!user) return <Navigate to={`/prijava?next=/poruke/${id}`} />;
  if (c === null) return <div className="container">Učitavam...</div>;
  if (c === false) return <div className="container">Razgovor ne postoji.</div>;

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await api(`/api/conversations/${id}/messages`, { method: 'POST', body: { body: text } });
      setText('');
      setC(await api(`/api/conversations/${id}`));
    } catch (x) { alert(x.message); }
    setSending(false);
  }

  return (
    <div className="container chat-wrap">
      <div className="chat-head">
        <Link to="/poruke" className="back">←</Link>
        <div>
          <strong>{c.other?.name}</strong>
          {c.other?.city && <small> · {c.other.city}</small>}
          {c.listing && (
            <Link to={`/oglas/${c.listing.id}`} className="chat-listing">
              <Thumb src={c.listing.images[0]} className="tiny" /> {c.listing.title}
              {c.listing.status === 'zamijenjeno' && <span className="tag tag-want">Zamijenjeno</span>}
            </Link>
          )}
        </div>
      </div>
      <div className="chat">
        {c.messages.map(m => (
          m.is_system
            ? <div key={m.id} className="msg-sys">{m.body}</div>
            : (
              <div key={m.id} className={`msg ${m.sender_id === user.id ? 'me' : 'them'}`}>
                <p>{m.body}</p>
                <small>{timeAgo(m.created_at)}</small>
              </div>
            )
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-input" onSubmit={send}>
        <textarea rows={1} value={text} onChange={e => setText(e.target.value)} placeholder="Napiši poruku..."
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 700) send(e); }} />
        <button className="btn-yellow" disabled={sending || !text.trim()}>Pošalji</button>
      </form>
    </div>
  );
}
