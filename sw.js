/*
 * Service Worker – Rezepte offline
 * --------------------------------
 * App-Hülle (index.html, assets, Rezepte, Vorschaubilder, Symbole) wird beim Installieren vorab gespeichert.
 *  - Seiten, Skripte, Styles: zuerst aus dem Netz (frisch, damit Änderungen sofort ankommen), nach TIMEOUT_MS
 *    oder ohne Netz aus dem Speicher. Was aus dem Netz kommt, ersetzt die gespeicherte Kopie.
 *  - Bilder: zuerst aus dem Speicher, sonst laden und merken. Offline ohne großes Foto → Vorschaubild.
 * VERSION und Dateiliste schreibt tools/pruefen.js (Prüfsummen der Dateien). Ändert sich etwas, lädt der Browser
 * diese Datei neu, installiert die neue Version (unveränderte Dateien werden aus dem alten Speicher übernommen),
 * übernimmt sofort und löscht alte Speicher. Die App zeigt dann „Neue Version – tippen zum Aktualisieren“.
 */
'use strict';
// <automatisch> von tools/pruefen.js – nicht von Hand bearbeiten
const VERSION = "f67d842256f1";
const DATEIEN = [
  ["./","77cd73de6db1"],
  ["manifest.json","1df84bcab53b"],
  ["assets/app.js","1eb8624b0464"],
  ["assets/einheiten.js","cb08bff8d674"],
  ["assets/icons.js","ebf52db1418a"],
  ["assets/naehrwerte.js","9b4a627d4215"],
  ["assets/style.css","d6bc5e05166a"],
  ["assets/timer.js","c771db408d36"],
  ["assets/zutaten.js","32e76eee663d"],
  ["rezepte/apfel-bananen-muffins.js","ad7ada067ab0"],
  ["rezepte/apfeltarte.js","31ecf9ea92c9"],
  ["rezepte/blattsalat-mit-feta-und-tomaten.js","1f2f9a01ab26"],
  ["rezepte/chinesische-pilzpfanne-mit-austernsauce-reis.js","d4a1f01bbd21"],
  ["rezepte/cremige-parmesan-kartoffeln-mit-geroesteten-haselnuessen.js","65fd5f46f949"],
  ["rezepte/crunchy-gnocchi-mit-knusprigen-kaese-talern-tomaten-zucchini-pueree.js","d9a1418ff771"],
  ["rezepte/gemuesegratin.js","bfefedd0bfa3"],
  ["rezepte/gnocchi-in-salbei-sahne-sauce-mit-knusprigen-gruenkohl-chips.js","9a446e2b6c5f"],
  ["rezepte/guacamole-salat-bowl-mit-knusprigem-brot.js","8caf054efa40"],
  ["rezepte/kartoffel-rosen.js","b2729bae76e9"],
  ["rezepte/kaspressknoedel.js","0e9178236fa7"],
  ["rezepte/koettbullar.js","d43ed6be292f"],
  ["rezepte/linguine-in-paprika-mandel-sauce.js","046e30f6cb31"],
  ["rezepte/linguine-mit-zitronenbutter-burrata.js","e8426ea102bd"],
  ["rezepte/low-carb-huehnchen-mit-mozzarella-tomaten-pesto.js","8ebe902bf2de"],
  ["rezepte/mediterraner-salat-mit-geroestetem-pesto-gemuese.js","c1bf24a2a789"],
  ["rezepte/one-pot-hackfleisch-porree-nudeln.js","d255abb1efe9"],
  ["rezepte/one-pot-reis-mit-spinat.js","5824bcbb69d8"],
  ["rezepte/pasta-mit-rotwein-sauce-steak-streifen.js","6f407b55555a"],
  ["rezepte/pfannkuchen.js","924093340e2a"],
  ["rezepte/pfifferlinge-mit-spinatknoedeln-in-salbeibutter.js","90fc59dc700e"],
  ["rezepte/pistazien-pesto-pasta-mit-burrata.js","63842326b90f"],
  ["rezepte/rote-bete-carpaccio.js","a4473a0122cf"],
  ["rezepte/sanshoku-don-vegetarische-drei-farben-reisschale.js","a1c4714efca0"],
  ["rezepte/schupfnudelpfanne-mit-tomaten-und-mozzarella.js","ab9bc0179b15"],
  ["rezepte/semmelknoedel.js","9db08749fa0a"],
  ["rezepte/spaghetti-bolognese.js","9a27d3a950cd"],
  ["rezepte/suesskartoffelragout-mit-bulgur-cashewkernen.js","bf33a2e068eb"],
  ["rezepte/tartelettes-mit-feta-creme-geroesteten-cherrytomaten.js","633d41803422"],
  ["rezepte/thai-kokos-suesskartoffelsuppe.js","51db7d05d7e0"],
  ["rezepte/tofu-scramble-mit-gemuese.js","3d0ee4fba7a5"],
  ["rezepte/wuerziger-couscous-one-pot.js","b6a25441b7cf"],
  ["icons/app.svg","f72ce8571983"],
  ["icons/app-180.png","a9f3bd96cf5d"],
  ["icons/app-192.png","2d9444b230d8"],
  ["icons/app-512.png","c362833ed3be"],
  ["bilder/klein/apfel-bananen-muffins.jpg","0947100eb454"],
  ["bilder/klein/chinesische-pilzpfanne-mit-austernsauce-reis.jpg","b363bdbdc44b"],
  ["bilder/klein/cremige-parmesan-kartoffeln-mit-geroesteten-haselnuessen.jpg","5f8abcd1f492"],
  ["bilder/klein/crunchy-gnocchi-mit-knusprigen-kaese-talern-tomaten-zucchini-pueree.jpg","0334ea6287a9"],
  ["bilder/klein/gnocchi-in-salbei-sahne-sauce-mit-knusprigen-gruenkohl-chips.jpg","b5eae5788903"],
  ["bilder/klein/guacamole-salat-bowl-mit-knusprigem-brot.jpg","be42ac1c8a7a"],
  ["bilder/klein/kaspressknoedel.jpg","5e93f15a1cc0"],
  ["bilder/klein/koettbullar.jpg","f98201b4be08"],
  ["bilder/klein/linguine-in-paprika-mandel-sauce.jpg","e3d97670c62e"],
  ["bilder/klein/linguine-mit-zitronenbutter-burrata.jpg","3239b546386a"],
  ["bilder/klein/low-carb-huehnchen-mit-mozzarella-tomaten-pesto.jpg","bc93720d0424"],
  ["bilder/klein/mediterraner-salat-mit-geroestetem-pesto-gemuese.jpg","e388b60e73a7"],
  ["bilder/klein/one-pot-hackfleisch-porree-nudeln.jpg","56b7d4f0b2bc"],
  ["bilder/klein/one-pot-reis-mit-spinat.jpg","2ad5840ab6c6"],
  ["bilder/klein/pasta-mit-rotwein-sauce-steak-streifen.jpg","042d5e574aea"],
  ["bilder/klein/pfannkuchen.jpg","2e8978ab8de8"],
  ["bilder/klein/pfifferlinge-mit-spinatknoedeln-in-salbeibutter.jpg","d593eb868b97"],
  ["bilder/klein/pistazien-pesto-pasta-mit-burrata.jpg","4be86c602329"],
  ["bilder/klein/sanshoku-don-vegetarische-drei-farben-reisschale.jpg","52650398b75b"],
  ["bilder/klein/schupfnudelpfanne-mit-tomaten-und-mozzarella.jpg","76d7941915b1"],
  ["bilder/klein/semmelknoedel.jpg","1361fa4cd5da"],
  ["bilder/klein/spaghetti-bolognese.jpg","3173b81ec97f"],
  ["bilder/klein/suesskartoffelragout-mit-bulgur-cashewkernen.jpg","dc886eca60a4"],
  ["bilder/klein/tartelettes-mit-feta-creme-geroesteten-cherrytomaten.jpg","412bb9b408c4"],
  ["bilder/klein/thai-kokos-suesskartoffelsuppe.jpg","944f23736cf7"],
  ["bilder/klein/tofu-scramble-mit-gemuese.jpg","2558b384b677"],
  ["bilder/klein/wuerziger-couscous-one-pot.jpg","e69df802bd58"],
  ["rezepte/liste.js","f2271d11b6b3"],
];
const BILDER = [
  ["bilder/apfel-bananen-muffins.jpg","8691047efc18"],
  ["bilder/chinesische-pilzpfanne-mit-austernsauce-reis.jpg","cb1b53df6df7"],
  ["bilder/cremige-parmesan-kartoffeln-mit-geroesteten-haselnuessen.jpg","dd230ea160c3"],
  ["bilder/crunchy-gnocchi-mit-knusprigen-kaese-talern-tomaten-zucchini-pueree.jpg","477d9169aee0"],
  ["bilder/gnocchi-in-salbei-sahne-sauce-mit-knusprigen-gruenkohl-chips.jpg","6603964d4fb8"],
  ["bilder/guacamole-salat-bowl-mit-knusprigem-brot.jpg","e5e411534b20"],
  ["bilder/kaspressknoedel.jpg","705637a5c43b"],
  ["bilder/koettbullar.jpg","b4a408b4e0da"],
  ["bilder/linguine-in-paprika-mandel-sauce.jpg","781463085d2b"],
  ["bilder/linguine-mit-zitronenbutter-burrata.jpg","c98076504991"],
  ["bilder/low-carb-huehnchen-mit-mozzarella-tomaten-pesto.jpg","5d4bb222f91c"],
  ["bilder/mediterraner-salat-mit-geroestetem-pesto-gemuese.jpg","26ac50b27811"],
  ["bilder/one-pot-hackfleisch-porree-nudeln.jpg","20b71d85dbd8"],
  ["bilder/one-pot-reis-mit-spinat.jpg","8f43fd0e9aef"],
  ["bilder/pasta-mit-rotwein-sauce-steak-streifen.jpg","a56ceb0f02a4"],
  ["bilder/pfannkuchen.jpg","e45a6349178e"],
  ["bilder/pfifferlinge-mit-spinatknoedeln-in-salbeibutter.jpg","de9557fa5bde"],
  ["bilder/pistazien-pesto-pasta-mit-burrata.jpg","341313a7af74"],
  ["bilder/sanshoku-don-vegetarische-drei-farben-reisschale.jpg","6485d0f56415"],
  ["bilder/schupfnudelpfanne-mit-tomaten-und-mozzarella.jpg","af9c062bd8e9"],
  ["bilder/semmelknoedel.jpg","3386cef47888"],
  ["bilder/spaghetti-bolognese.jpg","e39cec0b92e2"],
  ["bilder/suesskartoffelragout-mit-bulgur-cashewkernen.jpg","36a2d9cf31d7"],
  ["bilder/tartelettes-mit-feta-creme-geroesteten-cherrytomaten.jpg","2433f7b46048"],
  ["bilder/thai-kokos-suesskartoffelsuppe.jpg","5e8a4807feb6"],
  ["bilder/tofu-scramble-mit-gemuese.jpg","c1de0f0b491e"],
  ["bilder/wuerziger-couscous-one-pot.jpg","73bf3a9c1316"],
];
// </automatisch>

const PRAEFIX = 'rezepte-';
const CACHE = PRAEFIX + VERSION;
const TIMEOUT_MS = 4000;
const BASIS = new URL('./', self.location).href;
const abs = (p) => new URL(p, BASIS).href;

/** Prüfsumme wie in tools/pruefen.js: SHA-256, erste 12 Hex-Zeichen */
async function pruefsumme(puffer) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', puffer));
  return Array.from(d.slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
}
/** Antwort mit Prüfsumme im Kopf speichern (damit die nächste Version unveränderte Dateien übernehmen kann) */
async function merken(cache, url, antwort) {
  const puffer = await antwort.arrayBuffer();
  const kopf = new Headers(antwort.headers);
  kopf.set('x-pruefsumme', await pruefsumme(puffer));
  await cache.put(url, new Response(puffer, { status: antwort.status, statusText: antwort.statusText, headers: kopf }));
}
async function ausAltemSpeicher(url, soll) {
  for (const k of await caches.keys()) {
    if (!k.startsWith(PRAEFIX) || k === CACHE) continue;
    const r = await (await caches.open(k)).match(url);
    if (r && r.headers.get('x-pruefsumme') === soll) return r;
  }
  return null;
}

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(DATEIEN.map(async ([p, soll]) => {
      const url = abs(p);
      const alt = await ausAltemSpeicher(url, soll);
      if (alt) return cache.put(url, alt);
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error(p + ': ' + r.status);
      await merken(cache, url, r);
    }));
    // schon geladene große Fotos mitnehmen, wenn sie sich nicht geändert haben
    await Promise.all(BILDER.map(async ([p, soll]) => {
      const alt = await ausAltemSpeicher(abs(p), soll);
      if (alt) await cache.put(abs(p), alt);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith(PRAEFIX) && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'version' && e.ports[0]) e.ports[0].postMessage(VERSION);
  // „Aktualisieren“ unter Mehr → Nach neuer Version suchen: wartende Version sofort übernehmen
  // (normalerweise übernimmt sie schon selbst per skipWaiting beim Installieren)
  if (e.data === 'skipWaiting') self.skipWaiting();
});

/** Speicher-Schlüssel: ohne ?…; Seite selbst (./, index.html, Navigation) = ./ */
function schluessel(anfrage) {
  const u = new URL(anfrage.url);
  u.search = ''; u.hash = '';
  if (anfrage.mode === 'navigate' || u.href === abs('index.html')) return BASIS;
  return u.href;
}

/** Safari/Chrome lehnen umgeleitete Antworten für Seitenaufrufe ab: als neue Antwort ohne Umleitung */
async function ohneUmleitung(r) {
  return new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers });
}

function netzZuerst(e) {
  const k = schluessel(e.request);
  const netz = fetch(e.request.mode === 'navigate' ? k : e.request, { cache: 'no-cache' });
  // frische Antwort merken (läuft weiter, auch wenn schon die gespeicherte Kopie gezeigt wird)
  e.waitUntil(netz.then((r) => {
    if (!r.ok) return null;
    const kopie = r.clone();           // sofort kopieren, bevor die Seite den Inhalt liest
    return caches.open(CACHE).then((c) => merken(c, k, kopie));
  }).catch(() => {}));
  return (async () => {
    let frist;
    const zeit = new Promise((fertig) => { frist = setTimeout(fertig, TIMEOUT_MS); });
    try {
      const r = await Promise.race([netz, zeit]);
      clearTimeout(frist);
      if (r && r.ok) return r.redirected && e.request.mode === 'navigate' ? ohneUmleitung(r) : r;
      const gespeichert = await caches.match(k, { cacheName: CACHE });
      if (gespeichert) return gespeichert;
      return r || await netz;          // nichts gespeichert: auf das Netz warten
    } catch (fehler) {
      clearTimeout(frist);
      const gespeichert = await caches.match(k, { cacheName: CACHE });
      if (gespeichert) return gespeichert;
      throw fehler;
    }
  })();
}

function bildZuerstGespeichert(e) {
  const k = schluessel(e.request);
  let fertig;
  e.waitUntil(new Promise((f) => { fertig = f; }));   // bis das Foto gespeichert ist
  return (async () => {
    const gespeichert = await caches.match(k, { cacheName: CACHE });
    if (gespeichert) { fertig(); return gespeichert; }
    try {
      const r = await fetch(e.request);
      if (r.ok) { const kopie = r.clone(); caches.open(CACHE).then((c) => merken(c, k, kopie)).then(fertig, fertig); } else fertig();
      return r;
    } catch (fehler) {
      fertig();
      // offline und großes Foto nie angesehen: Vorschaubild zeigen
      const klein = k.replace(/\/bilder\/([^/]+)$/, '/bilder/klein/$1');
      const ersatz = klein !== k && await caches.match(klein, { cacheName: CACHE });
      if (ersatz) return ersatz;
      throw fehler;
    }
  })();
}

self.addEventListener('fetch', (e) => {
  const a = e.request;
  if (a.method !== 'GET' || !a.url.startsWith(BASIS)) return;
  if (/\.(jpe?g|png|webp|gif|svg|ico)$/i.test(new URL(a.url).pathname)) e.respondWith(bildZuerstGespeichert(e));
  else e.respondWith(netzZuerst(e));
});
