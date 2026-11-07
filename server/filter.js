// Filter protiv prodaje: "Koja je cijena, paše li keš? Ne hvala, samo zamjena."

// Ugrađene tačne riječi (cijela riječ)
export const EXACT = [
  'km', 'kma', 'kmova', 'eur', 'eura', 'euro', 'evra', 'evro', 'dolar', 'dolara',
  'keš', 'kes', 'keša', 'kesa', 'cash', 'pare', 'novac', 'novca', 'novce',
  'cijena', 'cijenu', 'cijene', 'cena', 'cenu', 'cene', 'fiksno', 'fiksna',
  'povoljno', 'plaćanje', 'placanje', 'doplata', 'doplatu', 'doplate',
  'doplatom', 'nadoplata', 'nadoplatu'
];
// Ugrađeni počeci riječi (pokriva padeže i oblike)
export const PREFIX = ['prodaj', 'prodam', 'prodat', 'kupuj', 'otkup', 'konvertibil', 'plaćam', 'placam'];

const KM_WORDS = ['km', 'kma', 'kmova'];

// allowKm: za vozila i auto dijelove "km" znači kilometre, pa se ne blokira
// extra: dodatne riječi/izrazi koje je admin dodao (traži se bilo gdje u tekstu)
export function containsSale(text = '', { allowKm = false, extra = [] } = {}) {
  const t = String(text).toLowerCase();

  // broj + valuta: "200km", "50 eur", "1.500 KM"
  const cur = allowKm ? 'eur|euro|evra|din|kn' : 'km|eur|euro|evra|din|kn';
  if (new RegExp(`\\d[\\d.,]*\\s*(${cur})(?![a-zčćžšđ])`, 'i').test(t)) return true;
  if (/[€$]/.test(t)) return true;

  const words = t.split(/[^a-z0-9čćžšđ]+/i).filter(Boolean);
  for (const w of words) {
    if (allowKm && KM_WORDS.includes(w)) continue;
    if (EXACT.includes(w)) return true;
    if (PREFIX.some(p => w.startsWith(p))) return true;
  }

  for (const e of extra) {
    const x = String(e).toLowerCase().trim();
    if (!x) continue;
    // jedna riječ: početak riječi; izraz: bilo gdje u tekstu
    if (x.includes(' ') ? t.includes(x) : words.some(w => w.startsWith(x))) return true;
  }
  return false;
}
