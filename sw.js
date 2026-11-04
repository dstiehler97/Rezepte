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
const VERSION = "a574e0866d58";
const DATEIEN = [
  ["./","77cd73de6db1"],
  ["manifest.json","1df84bcab53b"],
  ["assets/app.js","5ed4cd739a67"],
  ["assets/einheiten.js","a59deae8c40f"],
  ["assets/icons.js","f068fc307ec8"],
  ["assets/naehrwerte.js","f4805197cca5"],
  ["assets/style.css","fb371fdbdfb9"],
  ["assets/timer.js","fa9190f4a80c"],
  ["assets/zutaten.js","fb823bf33df7"],
  ["rezepte/apfel-bananen-muffins.js","7ce6e688634b"],
  ["rezepte/chinesische-pilzpfanne-mit-austernsauce-reis.js","c58be9c3a9cf"],
  ["rezepte/cremige-parmesan-kartoffeln-mit-geroesteten-haselnuessen.js","aaafb95d3577"],
  ["rezepte/crunchy-gnocchi-mit-knusprigen-kaese-talern-tomaten-zucchini-pueree.js","cf4f578c193a"],
  ["rezepte/gnocchi-in-salbei-sahne-sauce-mit-knusprigen-gruenkohl-chips.js","5cae45f58941"],
  ["rezepte/guacamole-salat-bowl-mit-knusprigem-brot.js","6ab95dc1e344"],
  ["rezepte/kaspressknoedel.js","c86e8b96d4d2"],
  ["rezepte/koettbullar.js","d43ed6be292f"],
  ["rezepte/linguine-in-paprika-mandel-sauce.js","c3a7fd014a97"],
  ["rezepte/linguine-mit-zitronenbutter-burrata.js","57be84cb2fa2"],
  ["rezepte/low-carb-huehnchen-mit-mozzarella-tomaten-pesto.js","8ebe902bf2de"],
  ["rezepte/mediterraner-salat-mit-geroestetem-pesto-gemuese.js","c1bf24a2a789"],
  ["rezepte/one-pot-hackfleisch-porree-nudeln.js","82a6e2259720"],
  ["rezepte/one-pot-reis-mit-spinat.js","271c80d2a554"],
  ["rezepte/pasta-mit-rotwein-sauce-steak-streifen.js","041c5f508cd0"],
  ["rezepte/pfannkuchen.js","0b739eee58c2"],
  ["rezepte/pfifferlinge-mit-spinatknoedeln-in-salbeibutter.js","ce4cc8c5ad76"],
  ["rezepte/sanshoku-don-vegetarische-drei-farben-reisschale.js","52d2340fdf1c"],
  ["rezepte/semmelknoedel.js","ed7732866b52"],
  ["rezepte/spaghetti-bolognese.js","9a27d3a950cd"],
  ["rezepte/suesskartoffelragout-mit-bulgur-cashewkernen.js","bf33a2e068eb"],
  ["rezepte/tartelettes-mit-feta-creme-geroesteten-cherrytomaten.js","534b5d44b816"],
  ["rezepte/thai-kokos-suesskartoffelsuppe.js","66821e857907"],
  ["rezepte/tofu-scramble-mit-gemuese.js","465ee8c22d0a"],
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
  ["bilder/klein/sanshoku-don-vegetarische-drei-farben-reisschale.jpg","52650398b75b"],
  ["bilder/klein/semmelknoedel.jpg","1361fa4cd5da"],
  ["bilder/klein/spaghetti-bolognese.jpg","17f752177938"],
  ["bilder/klein/suesskartoffelragout-mit-bulgur-cashewkernen.jpg","dc886eca60a4"],
  ["bilder/klein/tartelettes-mit-feta-creme-geroesteten-cherrytomaten.jpg","412bb9b408c4"],
  ["bilder/klein/thai-kokos-suesskartoffelsuppe.jpg","944f23736cf7"],
  ["bilder/klein/tofu-scramble-mit-gemuese.jpg","2558b384b677"],
  ["bilder/klein/wuerziger-couscous-one-pot.jpg","e69df802bd58"],
  ["rezepte/liste.js","9e060d776f10"],
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
  ["bilder/sanshoku-don-vegetarische-drei-farben-reisschale.jpg","6485d0f56415"],
  ["bilder/semmelknoedel.jpg","3386cef47888"],
  ["bilder/spaghetti-bolognese.jpg","851f41190496"],
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
