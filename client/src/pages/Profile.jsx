import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';

export default function Profile({ user, setUser }) {
  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pmsg, setPmsg] = useState('');
  const [perr, setPerr] = useState('');

  useEffect(() => { if (user) api('/api/me').then(setMe).catch(() => {}); }, [user]);
  if (!user) return <Navigate to="/prijava?next=/profil" />;
  if (!me) return <div className="container">Učitavam...</div>;

  async function save(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const u = await api('/api/me', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) });
      setMe(u);
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
      setMsg('Podaci sačuvani ✓');
    } catch (x) { setErr(x.message); }
  }

  async function changePass(e) {
    e.preventDefault();
    setPmsg(''); setPerr('');
    const body = Object.fromEntries(new FormData(e.target));
    if (body.new_password !== body.repeat) return setPerr('Nove lozinke se ne poklapaju');
    try {
      const r = await api('/api/me/password', { method: 'POST', body });
      setPmsg(r.message + ' ✓');
      e.target.reset();
    } catch (x) { setPerr(x.message); }
  }

  return (
    <div className="container narrow">
      <h1>Moj profil</h1>
      <form className="form" onSubmit={save}>
        <label>Email<input value={me.email} disabled /></label>
        <label>Ime<input name="name" required defaultValue={me.name} /></label>
        <div className="two">
          <label>Telefon<input name="phone" type="tel" defaultValue={me.phone || ''} /></label>
          <label>Grad<input name="city" defaultValue={me.city || ''} /></label>
        </div>
        {err && <p className="err">{err}</p>}
        {msg && <p className="ok">{msg}</p>}
        <button className="btn-yellow big">Sačuvaj</button>
      </form>

      <h2>Promjena lozinke</h2>
      <form className="form" onSubmit={changePass}>
        <label>Stara lozinka<input name="old_password" type="password" required /></label>
        <label>Nova lozinka<input name="new_password" type="password" required minLength={6} /></label>
        <label>Ponovi novu lozinku<input name="repeat" type="password" required minLength={6} /></label>
        {perr && <p className="err">{perr}</p>}
        {pmsg && <p className="ok">{pmsg}</p>}
        <button className="btn-yellow big">Promijeni lozinku</button>
      </form>
    </div>
  );
}
