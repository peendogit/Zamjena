// Pametno spajanje: prepoznaje da li oglas odgovara onome što neko traži.
// Radi sa bosanskim padežima (kosilica / kosilicu / kosilice) i čestim skraćenicama.

const STOP = new Set([
  'za', 'i', 'ili', 'sa', 's', 'na', 'u', 'od', 'do', 'po', 'pod', 'nad', 'iz', 'kod', 'uz', 'bez', 'pa', 'te',
  'je', 'su', 'da', 'ne', 'se', 'sam', 'mi', 'ti', 'to', 'ta', 'taj', 'neki', 'neku', 'neko', 'nesto', 'nešto',
  'bilo', 'kakav', 'kakvu', 'kakva', 'sta', 'šta', 'sve', 'ovo', 'ono', 'moj', 'moja', 'moje', 'tvoj', 'vas',
  'trazim', 'tražim', 'mijenjam', 'menjam', 'zamjena', 'zamjenu', 'zamjene', 'ponude', 'ponuda', 'ponudu',
  'dobro', 'ocuvan', 'ocuvano', 'ispravan', 'ispravno', 'stanje', 'stanju', 'novo', 'nov', 'nova', 'koristeno',
  'jako', 'vrlo', 'malo', 'kao', 'koji', 'koja', 'koje', 'ima', 'imam', 'ide', 'moze', 'može', 'molim'
]);

// Sinonimi: sve s lijeve strane se tretira kao isti korijen s desne
const SYN = {
  ps: 'playstation', ps2: 'playstation2', ps3: 'playstation3', ps4: 'playstation4', ps5: 'playstation5',
  play: 'playstation',
  tv: 'televizor', televizija: 'televizor', smarttv: 'televizor',
  mob: 'mobitel', mobilni: 'mobitel', telefon: 'mobitel', smartphone: 'mobitel', iphone: 'mobitel',
  laptop: 'laptop', notebook: 'laptop', lap: 'laptop',
  kompjuter: 'racunar', kompjuteri: 'racunar', pc: 'racunar', računar: 'racunar',
  bicikla: 'bicikl', biciklo: 'bicikl', bajs: 'bicikl',
  auto: 'automobil', kola: 'automobil', vozilo: 'automobil',
  moped: 'skuter', motor: 'motocikl', motorcikl: 'motocikl',
  frizider: 'frizider', hladnjak: 'frizider',
  vesmasina: 'masinazaves', vešmašina: 'masinazaves',
  trimer: 'trimer', flaks: 'brusilica', fleks: 'brusilica', flex: 'brusilica',
  aku: 'akumulator', akumulator: 'akumulator', bateriju: 'baterija',
  felne: 'felge', felna: 'felge', alu: 'aluminijske',
  gume: 'guma', pneumatici: 'guma',
  krecenje: 'krecenje', molerski: 'krecenje', moler: 'krecenje', farbanje: 'krecenje',
  sat: 'sat', satovi: 'sat'
};

const DIA = { č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'dj' };

export function normalize(text = '') {
  return String(text).toLowerCase().replace(/[čćžšđ]/g, ch => DIA[ch]);
}

// Korijen riječi: odsijeca nastavke padeža (kosilica -> kosilic, travu -> trav)
function stem(w) {
  if (/\d/.test(w)) return w;            // ps4, 18v, 2020 ostaju kakvi jesu
  if (w.length <= 4) return w;
  return w.slice(0, Math.max(4, w.length - 2));
}

// Keš da se isti tekst ne obrađuje stalno iznova
const cache = new Map();
export function tokens(text) {
  const key = String(text || '');
  const hit = cache.get(key);
  if (hit) return hit;
  const out = computeTokens(key);
  if (cache.size > 20000) cache.clear();
  cache.set(key, out);
  return out;
}

function computeTokens(text) {
  const raw = normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i < raw.length; i++) {
    let w = raw[i];
    // "ps 4" -> "ps4"
    if (/^(ps|playstation|iphone|golf|passat|xbox|s)$/.test(w) && /^\d{1,2}$/.test(raw[i + 1] || '')) { w = w + raw[i + 1]; i++; }
    if (STOP.has(w)) continue;
    if (w.length < 2) continue;
    const s = SYN[w] || w;
    out.add(stem(s));
    // "ps4" / "playstation4" / "golf4": dodaj i osnovu bez broja (playstation, golf)
    const m = s.match(/^([a-z]{2,})(\d{1,2})$/);
    if (m) out.add(stem(SYN[m[1]] || m[1]));
  }
  return out;
}

// Koliko oglas (naslov + opis) odgovara onome što se traži. 0..1
export function score(wantText, listing) {
  const want = tokens(wantText);
  if (!want.size) return 0;
  const title = tokens(listing.title);
  const desc = tokens(listing.description);
  let pts = 0;
  let titleHits = 0;
  for (const w of want) {
    if (title.has(w)) { pts += 1; titleHits++; }
    else if (desc.has(w)) pts += 0.5;
  }
  if (!titleHits) return 0;              // bar jedna tražena riječ mora biti u naslovu
  return Math.min(1, pts / want.size);
}

export const MATCH_MIN = 0.5;
export const matches = (wantText, listing) => score(wantText, listing) >= MATCH_MIN;
