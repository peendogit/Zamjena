import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { MOTO } from '../components';

// Isti obrazac za novi oglas i za uređivanje (kad postoji :id)
export default function ListingForm({ user }) {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();
  const [cats, setCats] = useState([]);
  const [l, setL] = useState(editing ? null : {});
  const [mode, setMode] = useState('otvoren');
  const [keep, setKeep] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/api/categories').then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    if (!editing || !user) return;
    api(`/api/listings/${id}`).then(d => {
      if (d.user_id !== user.id) { setL(false); return; }
      setL(d);
      setMode(d.swap_mode);
      setKeep(d.images);
    }).catch(() => setL(false));
  }, [id, editing, user]);

  if (!user) return <Navigate to={`/prijava?next=${editing ? `/uredi-oglas/${id}` : '/novi-oglas'}`} />;
  if (l === null) return <div className="container">Učitavam...</div>;
  if (l === false) return <div className="container">Oglas ne postoji.</div>;

  const maxNew = 8 - keep.length;

  function pickImages(e) {
    const files = [...e.target.files];
    if (files.length > maxNew) {
      setErr(`Možeš dodati još najviše ${maxNew} slika`);
      e.target.value = '';
      setPreviews([]);
      return;
    }
    setErr('');
    setPreviews(files.map(f => URL.createObjectURL(f)));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const fd = new FormData(e.target);
    if (editing) fd.set('keep_images', JSON.stringify(keep));
    try {
      const r = await api(editing ? `/api/listings/${id}` : '/api/listings', { method: editing ? 'PUT' : 'POST', body: fd });
      alert(r.message);
      nav('/moji-oglasi');
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  }

  return (
    <div className="container narrow">
      <h1>{editing ? 'Uredi oglas' : 'Novi oglas za zamjenu'}</h1>
      <p className="muted">
        {MOTO} Oglasi s cijenama i prodajom se ne objavljuju.
        {editing && ' Nakon izmjene oglas ponovo ide na odobrenje.'}
      </p>
      <form className="form" onSubmit={submit}>
        <label>Naslov
          <input name="title" required maxLength={80} defaultValue={l.title || ''} placeholder="npr. Bušilica Bosch 18V" />
        </label>
        <label>Kategorija
          <select name="category_id" required defaultValue={l.category_id || ''} key={cats.length}>
            <option value="" disabled>Izaberi kategoriju</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Opis
          <textarea name="description" required rows={5} defaultValue={l.description || ''} placeholder="Opiši stvar ili uslugu koju nudiš" />
        </label>
        <div className="two">
          <label>Grad
            <input name="city" defaultValue={l.city ?? user.city ?? ''} placeholder="npr. Bijeljina" />
          </label>
          <label>Stanje
            <select name="item_condition" defaultValue={l.item_condition || 'koristeno'}>
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
            <input name="wanted" required defaultValue={l.wanted || ''} placeholder="npr. Kosilica za travu ili PlayStation 4" />
          )}
        </fieldset>

        {editing && keep.length > 0 && (
          <div>
            <strong>Postojeće slike</strong>
            <div className="previews">
              {keep.map(src => (
                <div key={src} className="pv">
                  <img src={src} alt="" />
                  <button type="button" onClick={() => setKeep(keep.filter(k => k !== src))} aria-label="Ukloni sliku">×</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {maxNew > 0 && (
          <label>{editing ? `Dodaj slike (još ${maxNew})` : 'Slike (do 8)'}
            <input type="file" name="images" accept="image/*" multiple onChange={pickImages} />
          </label>
        )}
        {previews.length > 0 && (
          <div className="previews">{previews.map(p => <img key={p} src={p} alt="" />)}</div>
        )}
        {err && <p className="err">{err}</p>}
        <button className="btn-yellow big" disabled={busy}>
          {busy ? 'Šaljem...' : editing ? 'Sačuvaj izmjene' : 'Objavi oglas'}
        </button>
      </form>
    </div>
  );
}
