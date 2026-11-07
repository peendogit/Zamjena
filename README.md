# zamjena.ba

> Koja je cijena, paše li keš? Ne hvala, samo zamjena.

Oglasnik po uzoru na OLX, ali **samo za zamjenu** – roba za robu, usluga za uslugu. Nikakva prodaja.

## Faza 1 (ovo)
- Registracija i prijava
- Oglasi sa slikama (do 8, automatski smanjene u WebP)
- Dva načina zamjene: **Tražim tačno ovo** ili **Otvoren za ponude**
- Kategorije (kao OLX + **Usluge za usluge**)
- Pretraga po tekstu, kategoriji, gradu i načinu zamjene
- Automatski filter protiv prodaje (KM, €, prodajem, cijena, keš...)
  - u Vozilima i Auto dijelovima "km" je dozvoljen (kilometri)
- Svaki oglas čeka ručno odobrenje admina

## Stack
Node.js + Express, SQLite (better-sqlite3), React + Vite. Port **3047**.

## Prva instalacija (Contabo, Termius)
```bash
cd /var/www
git clone https://github.com/peendogit/zamjena.git
cd zamjena/client && npm install && npm run build
cd ../server && npm install
JWT_SECRET="neka-duga-tajna" pm2 start index.js --name zamjena
pm2 save
```

### Postavi sebe za admina
Registruj se na sajtu, pa:
```bash
cd /var/www/zamjena/server
node -e "require('better-sqlite3')('zamjena.db').prepare(\"UPDATE users SET is_admin=1 WHERE email=?\").run('TVOJ@EMAIL.com')"
```
Osvježi stranicu, pojaviće se link **Admin**.

### Nginx
`/etc/nginx/sites-available/zamjena.ba`
```nginx
server {
    server_name zamjena.ba www.zamjena.ba;
    client_max_body_size 80M;
    location / {
        proxy_pass http://localhost:3047;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/zamjena.ba /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d zamjena.ba -d www.zamjena.ba
```

## Ažuriranje
```bash
cd /var/www/zamjena && git pull
cd client && npm install && npm run build
cd ../server && npm install
pm2 restart zamjena
```

## Faza 2
- **Ponudi zamjenu**: biraš jedan ili više svojih aktivnih oglasa + poruka
- Vlasnik **prihvata / odbija**, pošiljalac može **povući** ponudu
- Prihvaćena zamjena: oba oglasa postaju **Zamijenjeno**, ostale ponude na njima se zatvaraju
- **Poruke** između korisnika (osvježavaju se same), značke za nove poruke i ponude
- **Uređivanje oglasa** (nakon izmjene ide ponovo na odobrenje)
- **Profil** i **promjena lozinke**
- Admin: **zabranjene riječi** koje sam dodaješ (pored ugrađenih)

## Faza 3
- **Ocjene** 1–5 zvjezdica + komentar, nakon prihvaćene zamjene (oba korisnika)
- **Javni profil** korisnika: ocjena, broj zamjena, oglasi, recenzije
- **Sačuvani oglasi** (♡ na oglasu)
- **Prijava oglasa** sa razlogom
- Admin kartice: Na čekanju, Prijave, Korisnici (blokiranje), Riječi + statistika

## Pametno spajanje (✦ Pogodci)
- **Savršeni parovi**: ti imaš ono što on traži, on ima ono što ti tražiš
- **Ima ono što tražiš** (oglasi otvoreni za ponude imaju prednost)
- **Traže ono što ti imaš**
- **Lista želja** (do 20): obavijest čim admin odobri oglas koji odgovara
- Prepoznaje padeže (kosilica/kosilicu), kvačice i skraćenice (PS4 = Playstation 4, TV = televizor...)
- U „Ponudi zamjenu” tvoji oglasi koji odgovaraju su označeni sa ✓
- Algoritam: `server/matcher.js` (sinonimi se dodaju u `SYN`)
