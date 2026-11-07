export async function api(url, opts = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = opts.body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(url, { ...opts, headers, body });
  let data = {};
  try { data = await res.json(); } catch { /* prazan odgovor */ }
  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  if (!res.ok) throw new Error(data.error || 'Greška na serveru');
  return data;
}

export function timeAgo(dateStr) {
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'upravo';
  if (s < 3600) return `prije ${Math.floor(s / 60)} min`;
  if (s < 86400) return `prije ${Math.floor(s / 3600)} h`;
  const days = Math.floor(s / 86400);
  if (days < 30) return `prije ${days} ${days === 1 ? 'dan' : 'dana'}`;
  return d.toLocaleDateString('bs-BA');
}
