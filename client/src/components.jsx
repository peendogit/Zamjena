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

// Prikaz ocjene: ★★★★☆ 4.2 (12)
export function Stars({ value, count, small }) {
  if (!count) return <span className={`stars none ${small ? 'sm' : ''}`}>Još nema ocjena</span>;
  const full = Math.round(value);
  return (
    <span className={`stars ${small ? 'sm' : ''}`}>
      <span className="st-on">{'★'.repeat(full)}</span><span className="st-off">{'★'.repeat(5 - full)}</span>
      <b>{Number(value).toFixed(1)}</b>{count != null && <em>({count})</em>}
    </span>
  );
}

// Biranje zvjezdica
export function StarPicker({ value, onChange }) {
  return (
    <div className="star-pick">
      {[1, 2, 3, 4, 5].map(n => (
        <button type="button" key={n} className={n <= value ? 'on' : ''} onClick={() => onChange(n)} aria-label={`${n} zvjezdica`}>★</button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="x" onClick={onClose} aria-label="Zatvori">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const STATUS = {
  na_cekanju: '⏳ Na čekanju',
  aktivan: '✅ Aktivan',
  odbijen: '❌ Odbijen',
  zamijenjeno: '⇄ Zamijenjeno'
};
