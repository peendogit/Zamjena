import { Link } from 'react-router-dom';
import { timeAgo } from './api';

export const MOTO = 'Koja je cijena, paše li keš? Ne hvala, samo zamjena.';

export function Logo() {
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

export function SwapBadge({ l }) {
  return l.swap_mode === 'trazim'
    ? <p className="swap"><span className="tag tag-want">Traži</span> {l.wanted}</p>
    : <p className="swap"><span className="tag tag-open">Otvoren za ponude</span></p>;
}

export function Thumb({ src, className = 'mini' }) {
  return src
    ? <img src={src} alt="" className={className} />
    : <div className={`${className} mini-empty`}>⇄</div>;
}

export function Card({ l }) {
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

export const STATUS = {
  na_cekanju: '⏳ Na čekanju',
  aktivan: '✅ Aktivan',
  odbijen: '❌ Odbijen',
  zamijenjeno: '⇄ Zamijenjeno'
};
