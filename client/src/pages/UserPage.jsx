import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, timeAgo } from '../api';
import { Card, Stars } from '../components';

export default function UserPage() {
  const { id } = useParams();
  const [u, setU] = useState(null);
  useEffect(() => { setU(null); api(`/api/users/${id}`).then(setU).catch(() => setU(false)); }, [id]);
  if (u === null) return <div className="container">Učitavam...</div>;
  if (u === false) return <div className="container">Korisnik ne postoji.</div>;
  const since = new Date(u.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('bs-BA', { month: 'long', year: 'numeric' });
  return (
    <div className="container">
      <div className="profile-card">
        <div className="avatar">{u.name.charAt(0).toUpperCase()}</div>
        <div>
          <h1>{u.name}</h1>
          <p className="muted">{u.city ? `${u.city} · ` : ''}Član od {since}</p>
          <Stars value={u.rating} count={u.rating_count} />
          <div className="profile-stats">
            <div><b>{u.swaps}</b><small>zamjena</small></div>
            <div><b>{u.listings.length}</b><small>oglasa</small></div>
            <div><b>{u.rating_count}</b><small>ocjena</small></div>
          </div>
        </div>
      </div>

      <h2>Oglasi</h2>
      {u.listings.length === 0
        ? <p className="empty">Nema aktivnih oglasa.</p>
        : <div className="grid">{u.listings.map(l => <Card key={l.id} l={l} />)}</div>}

      <h2>Ocjene</h2>
      {u.ratings.length === 0
        ? <p className="empty">Još nema ocjena.</p>
        : u.ratings.map((r, i) => (
          <div key={i} className="review">
            <div className="review-top">
              <span className="st-on">{'★'.repeat(r.stars)}<span className="st-off">{'★'.repeat(5 - r.stars)}</span></span>
              <small className="muted">{timeAgo(r.created_at)}</small>
            </div>
            {r.comment && <p>{r.comment}</p>}
            <small>— <Link to={`/korisnik/${r.from_id}`}>{r.from_name}</Link></small>
          </div>
        ))}
    </div>
  );
}
