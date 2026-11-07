import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { Card } from '../components';

export default function Saved({ user }) {
  const [items, setItems] = useState(null);
  useEffect(() => { if (user) api('/api/saved').then(setItems).catch(() => setItems([])); }, [user]);
  if (!user) return <Navigate to="/prijava?next=/sacuvani" />;
  return (
    <div className="container">
      <h1>♥ Sačuvani oglasi</h1>
      {items === null ? <p>Učitavam...</p>
        : items.length === 0 ? <p className="empty">Nemaš sačuvanih oglasa. Klikni ♡ na oglasu da ga sačuvaš. <Link to="/oglasi">Pogledaj oglase</Link></p>
        : <div className="grid">{items.map(l => (
            <div key={l.id} className={l.status === 'zamijenjeno' ? 'faded' : ''}>
              <Card l={l} />
            </div>
          ))}</div>}
    </div>
  );
}
