// Filter protiv prodaje: "Koja je cijena, paše li keš? Ne hvala, samo zamjena."

// Tačne riječi (cijela riječ)
const EXACT = [
  'km', 'kma', 'kmova', 'eur', 'eura', 'euro', 'evra', 'evro', 'dolar', 'dolara',
  'keš', 'kes', 'keša', 'kesa', 'cash', 'pare', 'novac', 'novca', 'novce',
  'cijena', 'cijenu', 'cijene', 'cena', 'cenu', 'cene', 'fiksno', 'fiksna',
  'povoljno', 'plaćanje', 'placanje', 'doplata', 'doplatu', 'doplate',
  'doplatom', 'nadoplata', 'nadoplatu'
];
// Početak riječi (pokriva padeže i oblike)
const PREFIX = ['prodaj', 'prodam', 'prodat', 'kupuj', 'otkup', 'konvertibil', 'plaćam', 'placam'];

// allowKm: za vozila i auto dijelove "km" znači kilometre, pa se ne blokira
export function containsSale(text = '', { allowKm = false } = {}) {
  const t = String(text).toLowerCase();
  const KM_WORDS = ['km', 'kma', 'kmova'];

  // broj + valuta: "200km", "50 eur", "100€", "1.500 KM"
  const cur = allowKm ? 'eur|euro|evra|din|kn' : 'km|eur|euro|evra|din|kn';
  if (new RegExp(`\\d[\\d.,]*\\s*(${cur})(?![a-zčćžšđ])`, 'i').test(t)) return true;
  if (/[€$]/.test(t)) return true;

  const words = t.split(/[^a-z0-9čćžšđ]+/i).filter(Boolean);
  for (const w of words) {
    if (allowKm && KM_WORDS.includes(w)) continue;
    if (EXACT.includes(w)) return true;
    if (PREFIX.some(p => w.startsWith(p))) return true;
  }
  return false;
}
