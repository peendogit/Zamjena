// Gradovi i općine u BiH sa približnim koordinatama (centar mjesta).
// Koristi ga i server (filter po udaljenosti) i sajt (prijedlozi grada, "~25 km od tebe").
// Novi grad se dodaje kao ['Ime', širina, dužina].

export const GRADOVI = [
  ['Sarajevo', 43.856, 18.413], ['Banja Luka', 44.772, 17.191], ['Tuzla', 44.538, 18.676],
  ['Zenica', 44.203, 17.908], ['Mostar', 43.343, 17.808], ['Bijeljina', 44.757, 19.214],
  ['Brčko', 44.872, 18.809], ['Prijedor', 44.979, 16.714], ['Doboj', 44.734, 18.084],
  ['Bihać', 44.817, 15.870], ['Cazin', 44.967, 15.943], ['Zvornik', 44.386, 19.102],
  ['Živinice', 44.449, 18.650], ['Travnik', 44.226, 17.666], ['Gradiška', 45.145, 17.255],
  ['Gračanica', 44.703, 18.309], ['Sanski Most', 44.766, 16.666], ['Lukavac', 44.541, 18.528],
  ['Velika Kladuša', 45.184, 15.806], ['Visoko', 43.989, 18.178], ['Kakanj', 44.133, 18.122],
  ['Gradačac', 44.879, 18.427], ['Tešanj', 44.612, 17.986], ['Bugojno', 44.057, 17.451],
  ['Srebrenik', 44.707, 18.488], ['Trebinje', 42.712, 18.344], ['Zavidovići', 44.446, 18.150],
  ['Konjic', 43.651, 17.961], ['Livno', 43.827, 17.008], ['Derventa', 44.977, 17.908],
  ['Modriča', 44.955, 18.303], ['Široki Brijeg', 43.383, 17.594], ['Čapljina', 43.122, 17.684],
  ['Goražde', 43.668, 18.976], ['Mrkonjić Grad', 44.417, 17.083], ['Novi Grad', 45.048, 16.378],
  ['Kalesija', 44.441, 18.873], ['Kiseljak', 43.943, 18.078], ['Vitez', 44.158, 17.791],
  ['Novi Travnik', 44.171, 17.658], ['Jajce', 44.341, 17.270], ['Laktaši', 44.909, 17.302],
  ['Ljubuški', 43.197, 17.545], ['Gornji Vakuf-Uskoplje', 43.938, 17.588], ['Prnjavor', 44.869, 17.660],
  ['Čelinac', 44.724, 17.326], ['Kozarska Dubica', 45.177, 16.809], ['Foča', 43.506, 18.776],
  ['Višegrad', 43.782, 19.293], ['Sokolac', 43.938, 18.800], ['Pale', 43.817, 18.569],
  ['Istočno Sarajevo', 43.824, 18.355], ['Ilidža', 43.830, 18.310], ['Vogošća', 43.903, 18.347],
  ['Hadžići', 43.822, 18.202], ['Ilijaš', 43.951, 18.270], ['Breza', 44.019, 18.262],
  ['Vareš', 44.164, 18.328], ['Olovo', 44.128, 18.581], ['Kladanj', 44.226, 18.692],
  ['Vlasenica', 44.181, 18.941], ['Bratunac', 44.185, 19.331], ['Srebrenica', 44.106, 19.296],
  ['Ugljevik', 44.693, 18.996], ['Lopare', 44.636, 18.846], ['Janja', 44.669, 19.247],
  ['Šamac', 45.060, 18.468], ['Orašje', 45.037, 18.693], ['Odžak', 45.011, 18.326],
  ['Brod', 45.137, 17.987], ['Teslić', 44.606, 17.860], ['Maglaj', 44.548, 18.098],
  ['Žepče', 44.427, 18.039], ['Kotor Varoš', 44.621, 17.371], ['Šipovo', 44.283, 17.086],
  ['Glamoč', 44.046, 16.849], ['Bosansko Grahovo', 44.177, 16.363], ['Drvar', 44.375, 16.383],
  ['Bosanski Petrovac', 44.553, 16.369], ['Ključ', 44.533, 16.776], ['Bosanska Krupa', 44.883, 16.152],
  ['Bužim', 45.053, 16.033], ['Kostajnica', 45.218, 16.540], ['Kozarac', 44.977, 16.844],
  ['Tomislavgrad', 43.718, 17.226], ['Kupres', 43.991, 17.278], ['Posušje', 43.471, 17.329],
  ['Grude', 43.373, 17.415], ['Čitluk', 43.229, 17.700], ['Stolac', 43.083, 17.958],
  ['Neum', 42.924, 17.616], ['Jablanica', 43.660, 17.762], ['Prozor-Rama', 43.822, 17.609],
  ['Fojnica', 43.960, 17.891], ['Kreševo', 43.866, 18.042], ['Busovača', 44.098, 17.880],
  ['Donji Vakuf', 44.143, 17.401], ['Nevesinje', 43.259, 18.114], ['Bileća', 42.875, 18.430],
  ['Gacko', 43.168, 18.535], ['Ljubinje', 42.952, 18.090], ['Rudo', 43.618, 19.366],
  ['Čajniče', 43.557, 19.072], ['Han Pijesak', 44.083, 18.950], ['Rogatica', 43.800, 19.002],
  ['Milići', 44.170, 19.083], ['Šekovići', 44.297, 18.857], ['Petrovo', 44.629, 18.355],
  ['Banovići', 44.408, 18.529], ['Sapna', 44.493, 19.003], ['Teočak', 44.594, 19.000],
  ['Doboj Istok', 44.733, 18.180], ['Usora', 44.668, 17.989], ['Srbac', 45.097, 17.523],
  ['Kneževo', 44.491, 17.381], ['Ribnik', 44.418, 16.808], ['Vukosavlje', 44.996, 18.272],
  ['Pelagićevo', 44.900, 18.600], ['Donji Žabar', 44.951, 18.639], ['Domaljevac', 45.059, 18.586],
  ['Dobretići', 44.400, 17.400], ['Kalinovik', 43.505, 18.447], ['Trnovo', 43.667, 18.450],
  ['Novo Sarajevo', 43.855, 18.400], ['Novi Grad Sarajevo', 43.849, 18.367], ['Stari Grad Sarajevo', 43.859, 18.431]
];

// Stari ili drugi nazivi -> ime iz spiska
const ALIAS = {
  'bosanski brod': 'Brod', 'srpski brod': 'Brod',
  'bosanska gradiska': 'Gradiška', 'b gradiska': 'Gradiška',
  'bosanski novi': 'Novi Grad', 'bosanska dubica': 'Kozarska Dubica', 'dubica': 'Kozarska Dubica',
  'bosanski samac': 'Šamac', 'srpski samac': 'Šamac',
  'bosanska kostajnica': 'Kostajnica', 'srpska kostajnica': 'Kostajnica',
  'lukavica': 'Istočno Sarajevo', 'srpsko sarajevo': 'Istočno Sarajevo', 'i sarajevo': 'Istočno Sarajevo',
  'uskoplje': 'Gornji Vakuf-Uskoplje', 'gornji vakuf': 'Gornji Vakuf-Uskoplje',
  'rama': 'Prozor-Rama', 'prozor': 'Prozor-Rama', 'duvno': 'Tomislavgrad',
  'mrkonjic': 'Mrkonjić Grad', 'banjaluka': 'Banja Luka', 'bl': 'Banja Luka', 'bn': 'Bijeljina',
  'brcko distrikt': 'Brčko', 'grahovo': 'Bosansko Grahovo', 'petrovac': 'Bosanski Petrovac',
  'krupa': 'Bosanska Krupa', 'kladusa': 'Velika Kladuša', 'siroki': 'Široki Brijeg',
  'sa': 'Sarajevo', 'sarajevu': 'Sarajevo', 'tuzli': 'Tuzla', 'mostaru': 'Mostar', 'zenici': 'Zenica'
};

const DIA = { č: 'c', ć: 'c', ž: 'z', š: 's', đ: 'dj' };
const norm = s => String(s || '').toLowerCase().replace(/[čćžšđ]/g, c => DIA[c])
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const INDEX = new Map(GRADOVI.map(g => [norm(g[0]), { name: g[0], lat: g[1], lng: g[2] }]));
for (const [a, name] of Object.entries(ALIAS)) INDEX.set(norm(a), INDEX.get(norm(name)));

export const IMENA_GRADOVA = GRADOVI.map(g => g[0]).sort((a, b) => a.localeCompare(b, 'bs'));

// "bijeljina", "Bijeljina, BiH", "Janja kod Bijeljine" -> { name, lat, lng } ili null
export function findCity(text) {
  const t = norm(text);
  if (!t) return null;
  if (INDEX.has(t)) return INDEX.get(t);
  const first = t.split(/ (kod|pored|blizu|okolina) /)[0].trim();
  if (INDEX.has(first)) return INDEX.get(first);
  // najduži poznati naziv koji se nalazi na početku teksta
  let best = null;
  for (const [k, v] of INDEX) {
    if (v && (t === k || t.startsWith(k + ' ')) && (!best || k.length > best.k.length)) best = { k, v };
  }
  return best ? best.v : null;
}

// Udaljenost vazdušnom linijom u km (pravi put je obično 20-30% duži)
export function distanceKm(a, b) {
  if (!a || !b) return null;
  if (a.name === b.name) return 0;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function cityDistance(fromText, toText) {
  return distanceKm(findCity(fromText), findCity(toText));
}
