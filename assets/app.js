/* Rezepte – App (ohne Build, läuft per Doppelklick auf index.html und auf GitHub Pages) */
(function () {
  'use strict';

  const { skalieren, format } = Einheiten;
  const { svg } = Icons;
  const STANDARD_PERSONEN = 4;
  const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const SCHWIERIGKEIT = { einfach: 1, mittel: 2, anspruchsvoll: 3 };
  const APP_STAND = '2026-11-04';   // bei Änderungen an der App anpassen (steht unter „Mehr“)

  const app = document.getElementById('app');
  let rezepte = [];
  let nachId = {};
  const ladefehler = [];

  // ---------------------------------------------------------------- Speicher
  const speicher = {
    lesen(k, std) {
      try { const v = localStorage.getItem('rezepte.' + k); return v ? JSON.parse(v) : std; } catch (e) { return std; }
    },
    schreiben(k, v) {
      try { localStorage.setItem('rezepte.' + k, JSON.stringify(v)); } catch (e) { /* privat-modus */ }
    },
  };
  // Wochenplan: wer = Profil-uids (optional, sonst zählt personen), gekocht = ISO-Datum (Eintrag bleibt, ausgegraut)
  let plan = speicher.lesen('plan', []);           // [{uid, id, personen, tag, wer?: [uid], gekocht?: 'JJJJ-MM-TT'}]
  let abgehakt = speicher.lesen('abgehakt', {});   // {schluessel: true}
  let extras = speicher.lesen('extras', []);       // [{uid, text}]
  let liste = speicher.lesen('liste', []);         // Rezepte direkt auf der Einkaufsliste [{uid, id, personen}]
  let zuhause = speicher.lesen('zuhause', []);     // Was man da hat [{uid, name}]
  let profile = speicher.lesen('profile', []);     // Haushalt [{uid, name, faktor, standard}] – leer = nur Personenzahl
  let ladenfolge = speicher.lesen('ladenfolge', null);   // eigene Reihenfolge der Kategorien [Name] oder null
  let favoriten = speicher.lesen('favoriten', []);  // Rezept-ids mit ♥
  let bewertung = speicher.lesen('bewertung', {});  // {rezeptId: 1–5}
  let notizen = speicher.lesen('notizen', {});      // {rezeptId: 'nächstes Mal weniger Salz'}
  const sichern = () => {
    speicher.schreiben('zuhause', zuhause);
    speicher.schreiben('liste', liste);
    speicher.schreiben('plan', plan);
    speicher.schreiben('abgehakt', abgehakt);
    speicher.schreiben('extras', extras);
    speicher.schreiben('profile', profile);
    speicher.schreiben('ladenfolge', ladenfolge);
    speicher.schreiben('favoriten', favoriten);
    speicher.schreiben('bewertung', bewertung);
    speicher.schreiben('notizen', notizen);
  };
  const uid = () => Math.random().toString(36).slice(2, 9);

  /*
   * „Gekocht“-Verlauf: speicher 'gekocht' = { rezeptId: ['2026-11-04', …] } (lokale Kalendertage, älteste zuerst,
   * je Rezept höchstens GEKOCHT_MAX). Geschrieben beim „Fertig“ im Kochmodus und „Gekocht“ auf der Rezeptseite.
   * Zum Weiterverwenden (Favoriten, Statistik): RezeptApp.gekocht.{merken, vergessen, daten, zuletzt, alle}.
   */
  const GEKOCHT_MAX = 100;
  let gekocht = speicher.lesen('gekocht', {});
  const heuteISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const gekochtHilfe = {
    /** Rezept als gekocht eintragen (Standard: heute) */
    merken(id, datum) {
      const l = (gekocht[id] = gekocht[id] || []);
      l.push(datum || heuteISO()); l.sort();
      if (l.length > GEKOCHT_MAX) l.splice(0, l.length - GEKOCHT_MAX);
      speicher.schreiben('gekocht', gekocht);
    },
    /** Einen Eintrag wieder entfernen (z. B. versehentlich abgehakt) */
    vergessen(id, datum) {
      const l = gekocht[id] || [];
      const i = l.lastIndexOf(datum);
      if (i >= 0) l.splice(i, 1);
      if (!l.length) delete gekocht[id];
      speicher.schreiben('gekocht', gekocht);
    },
    /** Alle Tage, an denen das Rezept gekocht wurde (Kopie, aufsteigend) */
    daten: (id) => (gekocht[id] || []).slice(),
    /** Letzter Tag ('JJJJ-MM-TT') oder null */
    zuletzt: (id) => { const l = gekocht[id]; return l && l.length ? l[l.length - 1] : null; },
    /** Ganzer Verlauf (Kopie) */
    alle: () => JSON.parse(JSON.stringify(gekocht)),
  };
  /** Tage seit einem Datum 'JJJJ-MM-TT' (Infinity = keins) */
  const tageSeit = (iso) => (iso ? Math.round((new Date(heuteISO() + 'T12:00') - new Date(iso + 'T12:00')) / 864e5) : Infinity);
  /** Tage seit dem letzten Kochen (Infinity = nie) */
  const tageSeitGekocht = (id) => tageSeit(gekochtHilfe.zuletzt(id));
  const datumText = (iso) => new Date(iso + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  /** „heute“, „gestern“, „vor 3 Tagen“, „vor 2 Monaten“ */
  function vorText(tage) {
    if (tage <= 0) return 'heute';
    if (tage === 1) return 'gestern';
    if (tage < 45) return 'vor ' + tage + ' Tagen';
    if (tage < 365) return 'vor ' + Math.round(tage / 30) + ' Monaten';
    return 'vor über einem Jahr';
  }

  // ---------------------------------------------------------------- Persönlich: Favoriten, Bewertung, Notizen
  const NOTIZ_MAX = 1000;
  const istFavorit = (id) => favoriten.includes(id);
  const sterneVon = (id) => bewertung[id] || 0;
  const notizVon = (id) => notizen[id] || '';
  function favoritUmschalten(id) {
    favoriten = istFavorit(id) ? favoriten.filter((x) => x !== id) : [...favoriten, id];
    speicher.schreiben('favoriten', favoriten);
    return istFavorit(id);
  }
  /** 1–5 Sterne; 0 (oder dieselbe Zahl nochmal) = zurücksetzen */
  function bewerten(id, n) {
    if (!n || n === sterneVon(id)) delete bewertung[id]; else bewertung[id] = n;
    speicher.schreiben('bewertung', bewertung);
    return sterneVon(id);
  }
  // Notizen: sofort im Speicher, verzögert in localStorage (beim Seitenwechsel/Schließen sofort)
  let notizTakt = 0;
  function notizSetzen(id, text, fertig) {
    text = String(text || '').slice(0, NOTIZ_MAX);
    if (text.trim()) notizen[id] = text; else delete notizen[id];
    clearTimeout(notizTakt);
    notizTakt = setTimeout(() => { notizTakt = 0; speicher.schreiben('notizen', notizen); if (fertig) fertig(); }, 600);
  }
  function notizenJetzt() { if (notizTakt) { clearTimeout(notizTakt); notizTakt = 0; speicher.schreiben('notizen', notizen); } }
  window.addEventListener('pagehide', notizenJetzt);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') notizenJetzt(); });
  /** Textfeld für Notizen: speichert beim Tippen, zeigt „gespeichert“, wächst mit */
  function notizFeldBinden(feld, status, id, nachher) {
    const hoehe = () => { feld.style.height = 'auto'; feld.style.height = feld.scrollHeight + 2 + 'px'; };
    feld.addEventListener('input', () => {
      hoehe();
      status.textContent = '';
      notizSetzen(id, feld.value, () => { status.textContent = '✓ gespeichert'; });
      if (nachher) nachher(feld.value.trim());
    });
    feld.addEventListener('blur', notizenJetzt);
    hoehe();
  }

  // ---------------------------------------------------------------- Haushalt (Portionen pro Person)
  /** Effektive Portionen eines Plan-/Listen-Eintrags: Summe der Profil-Faktoren, sonst Personenzahl */
  const werVon = (e) => (e.wer || []).map((u) => profile.find((p) => p.uid === u)).filter(Boolean);
  const portionen = (e) => { const w = werVon(e); return w.length ? w.reduce((n, p) => n + p.faktor, 0) : e.personen; };
  const portionText = (n) => Einheiten.zahlText(Math.round(n * 4) / 4);
  const standardWer = () => profile.filter((p) => p.standard).map((p) => p.uid);
  /** Neuer Plan-Eintrag; ohne ausdrückliche Personenzahl isst der Standard-Haushalt mit */
  function planEintrag(id, personen, tag) {
    const r = nachId[id];
    const wer = personen || stueckRezept(r) ? [] : standardWer();   // Gebäck nach Stück: ohne Haushalt-Portionen
    const e = { uid: uid(), id, personen: pFuer(r, personen || r.personen || STANDARD_PERSONEN), tag: tag || '' };
    if (wer.length) { e.wer = wer; e.personen = begrenzen(portionen(e)); }
    return e;
  }

  // ---------------------------------------------------------------- Helfer
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fett = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const begrenzen = (n) => Math.min(30, Math.max(1, Math.round(Number(n) || STANDARD_PERSONEN)));
  // Backrezepte nach Stückzahl (ergibt: { menge: 12, einheit: 'Muffins' }): intern bleibt die Personenzahl
  // (Faktor × personen), eingestellt wird in halben Rezepten – bei personen 4 also 2, 4, 6 … = 6, 12, 18 … Muffins.
  const stueckRezept = (r) => !!(r && r.ergibt && r.ergibt.menge > 0);
  const pSchritt = (r) => (stueckRezept(r) ? Math.max(1, (r.personen || STANDARD_PERSONEN) / 2) : 1);
  /** Personenzahl für ein Rezept: begrenzen, bei Stück-Rezepten auf halbe Rezepte runden */
  function pFuer(r, n) {
    const p = begrenzen(n);
    if (!stueckRezept(r)) return p;
    const st = pSchritt(r);
    return Math.min(Math.floor(30 / st) * st, Math.max(st, Math.round(p / st) * st));
  }
  /** Stückzahl bei p (nur Stück-Rezepte) */
  const stueckZahl = (r, p) => Math.round(p / (r.personen || STANDARD_PERSONEN) * r.ergibt.menge * 4) / 4;
  /** „12 Muffins“ bzw. „4 Personen“ (kurz: „4 P.“) */
  function mengeText(r, p, kurz) {
    if (stueckRezept(r)) return Einheiten.zahlText(stueckZahl(r, p)) + ' ' + r.ergibt.einheit;
    return p + ' ' + (kurz ? 'P.' : p === 1 ? 'Person' : 'Personen');
  }

  function dauer(min) {
    if (!min) return '';
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + ' Min.';
    return h + ' Std.' + (m ? ' ' + m + ' Min.' : '');
  }
  function gesamtzeit(z) {
    if (!z) return 0;
    return Object.values(z).reduce((a, b) => a + (Number(b) || 0), 0);
  }
  const ZEIT_NAMEN = { vorbereitung: 'Vorbereitung', ruhen: 'Ruhen', kochen: 'Kochen', backen: 'Backen' };

  function nurZutaten(r) { return (r.zutaten || []).filter((z) => !z.abschnitt); }

  /** Eine Zutat für x Personen als {menge, name} (Text) */
  function zutatText(z, faktor) {
    const info = Zutaten.info(z);
    const m = skalieren(z, faktor);
    if (!m) return { menge: '', name: z.name, info };
    const f = format(m.wert, m.basis, { ganz: info.ganz, einheit: m.einheit, exakt: faktor === 1 });
    const menge = f.zahl + (f.einheit ? ' ' + f.einheit : '');
    // Mehrzahl bei Stück > 1 und bei Gewicht/Volumen („300 g Cherrytomaten“), bei EL, Bund, Dose … die Einzahl
    const plural = z.mehrzahl && (!f.einheit ? f.wert > 1 : ['g', 'kg', 'ml', 'l'].includes(f.einheit));
    return { menge, name: plural ? z.mehrzahl : z.name, info };
  }

  /** Ist eine Zutat zuhause? "Olivenöl" passt zu "Olivenöl", "Meersalz" zu "Salz", "Zwiebeln" zu "Zwiebel". */
  function formen(w) { return [w, w.replace(/n$/, ''), w.replace(/en$/, ''), w.replace(/s$/, ''), w.replace(/e$/, ''), w.replace(/er$/, '')]; }
  function passt(zutatName, vorratName) {
    const z = Zutaten.normal(zutatName), v = Zutaten.normal(vorratName);
    if (!v) return false;
    if (z === v || Zutaten.grundform(zutatName) === Zutaten.grundform(vorratName)) return true;   // Eier ↔ Ei, Äpfel ↔ Apfel
    if (v.includes(' ')) return z.includes(v);
    const vf = formen(v);
    // Wortende nur bei Grundvorrat (Salz -> Meersalz, Öl -> Olivenöl), nicht Zwiebel -> Frühlingszwiebel
    const grund = Zutaten.info({ name: vorratName }).vorrat;
    return z.split(' ').some((w) => formen(w).some((f) => vf.includes(f) || (grund && f.length > v.length + 2 && vf.some((x) => f.endsWith(x)))));
  }
  const istZuhause = (name) => zuhause.find((x) => passt(name, x.name));

  // ---------------------------------------------------------------- Laden
  window.Rezept = function (r) { rezepte.push(r); };

  function laden() {
    const dateien = window.REZEPT_DATEIEN || [];
    return Promise.all(dateien.map((name) => new Promise((fertig) => {
      const s = document.createElement('script');
      s.src = 'rezepte/' + name + '.js';
      s.onload = fertig;
      s.onerror = () => { ladefehler.push(name); fertig(); };
      document.head.appendChild(s);
    }))).then(() => {
      rezepte.sort((a, b) => a.titel.localeCompare(b.titel, 'de'));
      nachId = Object.fromEntries(rezepte.map((r) => [r.id, r]));
      formenSammeln();
      datenPruefen();
    });
  }

  /** Gespeicherte Daten bereinigen (alte Stände, gelöschte Rezepte/Profile) */
  function datenPruefen() {
    if (!Array.isArray(profile)) profile = [];
    profile = profile.filter((p) => p && p.uid).map((p) => Object.assign(p, { name: String(p.name || ''), faktor: faktorBegrenzen(p.faktor) }));
    const ok = (e) => e && nachId[e.id];
    plan = (Array.isArray(plan) ? plan : []).filter(ok).map((e) => {
      e.uid = e.uid || uid(); e.personen = begrenzen(e.personen); e.tag = TAGE.includes(e.tag) ? e.tag : '';
      if (e.wer) e.wer = e.wer.filter((u) => profile.some((p) => p.uid === u));
      if (e.wer && !e.wer.length) delete e.wer;
      if (e.wer) e.personen = begrenzen(portionen(e));   // Rückfall, falls Profile später fehlen
      return e;
    });
    liste = (Array.isArray(liste) ? liste : []).filter(ok).map((e) => Object.assign(e, { uid: e.uid || uid(), personen: begrenzen(e.personen) }));
    if (ladenfolge && !Array.isArray(ladenfolge)) ladenfolge = null;
    if (!istObjekt(gekocht)) gekocht = {};
    gekocht = Object.fromEntries(Object.entries(gekocht).filter(([, l]) => Array.isArray(l))
      .map(([id, l]) => [id, l.filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)).sort()]).filter(([, l]) => l.length));
    if (!istObjekt(abgehakt)) abgehakt = {};
    if (!istObjekt(kochen)) kochen = {};
    extras = (Array.isArray(extras) ? extras : []).filter((x) => x && typeof x.text === 'string');
    zuhause = (Array.isArray(zuhause) ? zuhause : []).filter((x) => x && typeof x.name === 'string').map((x) => Object.assign(x, { uid: x.uid || uid() }));
    // Persönliches: nur gültige Werte; Einträge gelöschter Rezepte weg (nicht, solange eine Rezeptdatei fehlt)
    const gibts = (id) => typeof id === 'string' && (!!nachId[id] || ladefehler.length > 0);
    favoriten = [...new Set((Array.isArray(favoriten) ? favoriten : []).filter(gibts))];
    const pruefen = (o, wert) => Object.fromEntries(Object.entries(istObjekt(o) ? o : {})
      .map(([id, v]) => [id, wert(v)]).filter(([id, v]) => gibts(id) && v != null));
    bewertung = pruefen(bewertung, (v) => { const n = Math.round(Number(v)); return n >= 1 && n <= 5 ? n : null; });
    notizen = pruefen(notizen, (v) => (typeof v === 'string' && v.trim() ? v.slice(0, NOTIZ_MAX) : null));
  }
  const istObjekt = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  /** Alles neu aus localStorage lesen (anderer Tab, Sicherung geladen) */
  function zustandLesen() {
    plan = speicher.lesen('plan', []); abgehakt = speicher.lesen('abgehakt', {}); extras = speicher.lesen('extras', []);
    liste = speicher.lesen('liste', []); zuhause = speicher.lesen('zuhause', []); kochen = speicher.lesen('kochen', {});
    profile = speicher.lesen('profile', []); ladenfolge = speicher.lesen('ladenfolge', null); gekocht = speicher.lesen('gekocht', {});
    favoriten = speicher.lesen('favoriten', []); bewertung = speicher.lesen('bewertung', {}); notizen = speicher.lesen('notizen', {});
  }
  const faktorBegrenzen = (f) => Math.min(4, Math.max(0.25, Math.round((Number(f) || 1) * 4) / 4));

  // ---------------------------------------------------------------- Router
  function route() {
    const [pfad, query] = location.hash.replace(/^#/, '').split('?');
    const teile = pfad.split('/').filter(Boolean);
    const q = new URLSearchParams(query || '');
    return { teile, q };
  }

  // Bereiche = Tabs. Jeder Tab merkt sich seine letzte Adresse (wie in Handy-Apps):
  // Heute → Liste → Rezept → Kochmodus → Einkauf → Tab „Rezepte“ führt zurück zum Kochmodus.
  // Tippen auf den schon aktiven Tab führt zu dessen Startseite („Heute“).
  // Routen: #/ = Heute, #/rezepte?… = Liste mit Filtern (alte Links #/?s=… führen ebenfalls zur Liste)
  const BEREICH = { '': 'rezepte', rezepte: 'rezepte', rezept: 'rezepte', kochen: 'rezepte', plan: 'plan', einkauf: 'einkauf', zuhause: 'zuhause', mehr: 'mehr', kochbuch: 'mehr' };
  const START = { rezepte: '#/', plan: '#/plan', einkauf: '#/einkauf', zuhause: '#/zuhause', mehr: '#/mehr' };
  const LISTEN_PARAMETER = ['s', 'k', 'e', 'z', 'm', 'fav', 'o', 'd'];
  const tabStand = {};          // Bereich -> letzte Adresse
  let letzteUebersicht = '#/';  // Heute oder Liste mit Filtern, für den Zurück-Knopf im Rezept
  let angezeigt = null;         // Adresse der angezeigten Seite (doppeltes Zeichnen bei popstate + hashchange vermeiden)
  const bereichVon = (seite) => BEREICH[seite || ''] || 'rezepte';

  /** Adresse ändern ohne neu zu zeichnen (Filter, Personen, Kochschritt) */
  function adresseSetzen(hash) {
    history.replaceState(null, '', hash);
    angezeigt = location.hash;
    navAktualisieren();
  }
  /** Neue Seite öffnen und sofort zeichnen (im selben Tipp, z. B. damit iOS danach die Tastatur öffnet) */
  function sofortOeffnen(hash) {
    history.pushState(null, '', hash);
    obenStarten = true;
    zeichnen();
  }
  function navAktualisieren() {
    const seite = route().teile[0] || '';
    const b = bereichVon(seite);
    tabStand[b] = location.hash || '#/';
    if (!seite || seite === 'rezepte') letzteUebersicht = location.hash || '#/';
    document.querySelectorAll('[data-bereich]').forEach((a) => {
      const x = a.dataset.bereich;
      a.classList.toggle('aktiv', x === b);
      // Handy-Tabs mit Gedächtnis; PC-Kopfzeile: Rezepte = Übersicht mit letzten Filtern
      const ziel = a.closest('.tabs') ? (x === b ? START[x] : tabStand[x] || START[x]) : (x === 'rezepte' && seite ? letzteUebersicht : START[x]);
      a.setAttribute('href', ziel);
    });
  }

  // Scrollposition je Seite merken: zurück (Tab, Zurück-Knopf, Browser) landet an derselben Stelle,
  // ein neu geöffneter Link (Rezeptkarte, „Kochen“) beginnt oben.
  const scrollStand = {};       // Pfad ohne ?… -> scrollY
  let obenStarten = false;
  let gezeichnet = '';          // Pfad der angezeigten Seite
  const pfadVon = (hash) => (hash || '#/').split('?')[0] || '#/';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('scroll', () => {
    // verspätete Scroll-Ereignisse nach einem Adresswechsel (vor dem Neuzeichnen) nicht der neuen Seite zuschreiben
    if (pfadVon(location.hash) === gezeichnet) scrollStand[gezeichnet] = window.scrollY;
  }, { passive: true });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    if (a.closest('.tabs, .nav, .marke, .nav-mehr') || a.hasAttribute('data-zurueck')) {
      // aktiver Tab auf seiner Startseite: nach oben
      if (a.getAttribute('href') === (location.hash || '#/') || (a.getAttribute('href') === '#/' && !location.hash)) {
        e.preventDefault(); window.scrollTo({ top: 0, behavior: wenigBewegung() ? 'auto' : 'smooth' });
      } else if (a.classList.contains('aktiv')) obenStarten = true;
    } else obenStarten = true;
  });

  // ---------------------------------------------------------------- Kopfleiste & Übergänge (nur Bildschirm)
  // Großer Seitentitel (erstes <h1> in #app); ist er nach oben weggescrollt, blendet die schmale, klebende
  // Kopfleiste (#kopfleiste, Milchglas) den Titel klein ein – im Rezept mit Zurück-Knopf. Am PC per CSS aus.
  const wenigBewegung = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const kopfleiste = document.getElementById('kopfleiste');
  const kopfHoehe = () => (kopfleiste && getComputedStyle(kopfleiste).display !== 'none' ? kopfleiste.offsetHeight : 0);
  let kopfBeobachter = null;
  function kopfleisteBinden() {
    if (!kopfleiste) return;
    if (kopfBeobachter) { kopfBeobachter.disconnect(); kopfBeobachter = null; }
    const seite = document.body.dataset.seite;
    const h1 = seite === 'kochen' ? null : app.querySelector('h1');
    kopfleiste.classList.remove('sichtbar');
    kopfleiste.classList.toggle('aus', !h1);
    if (!h1) return;
    const rezept = seite === 'rezept';
    kopfleiste.querySelector('.kl-titel').textContent = seite === 'start' ? 'Heute' : h1.textContent.trim();
    const z = kopfleiste.querySelector('.kl-zurueck');
    z.hidden = !rezept;
    if (rezept) {
      const text = /^#\/(rezepte|\?)/.test(letzteUebersicht) ? 'Alle Rezepte' : 'Heute';
      z.setAttribute('href', letzteUebersicht);
      z.setAttribute('aria-label', 'Zurück: ' + text);
      z.querySelector('.kl-text').textContent = text;
    }
    if (!('IntersectionObserver' in window)) { kopfleiste.classList.add('sichtbar'); return; }
    const h = kopfHoehe();
    kopfBeobachter = new IntersectionObserver(([e]) => {
      kopfleiste.classList.toggle('sichtbar', !e.isIntersecting && e.boundingClientRect.top < h);
    }, { rootMargin: `-${h}px 0px 0px 0px` });
    kopfBeobachter.observe(h1);
  }
  /** Neuer Inhalt blendet kurz ein (nur Opacity/Transform – Scrollstand und Messungen bleiben unberührt) */
  function seiteEinblenden() {
    if (wenigBewegung()) return;
    app.classList.remove('rein');
    void app.offsetWidth;   // Animation neu starten
    app.classList.add('rein');
  }
  app.addEventListener('animationend', (e) => { if (e.target.parentElement === app) app.classList.remove('rein'); });

  let verlassen = null;         // Aufräumen der aktuellen Seite (z. B. Kochmodus: Wake Lock freigeben)
  function zeichnen() {
    const { teile, q } = route();
    if (verlassen) { verlassen(); verlassen = null; }
    blattZu();
    navAktualisieren();
    zaehlerAktualisieren();
    document.body.dataset.seite = teile[0] || 'start';

    if (teile[0] === 'rezept' && nachId[teile[1]]) {
      const r = nachId[teile[1]];
      if (obenStarten || reiterStand.id !== r.id) Object.assign(reiterStand, { id: r.id, reiter: 'zutaten' });   // neuer Besuch: Zutaten
      seiteRezept(r, pFuer(r, q.get('p') || r.personen || STANDARD_PERSONEN), q.has('p'));
    } else if (teile[0] === 'kochen' && nachId[teile[1]]) seiteKochen(nachId[teile[1]], q);
    else if (teile[0] === 'plan') seitePlan();
    else if (teile[0] === 'einkauf') seiteEinkauf();
    else if (teile[0] === 'zuhause') seiteZuhause();
    else if (teile[0] === 'kochbuch') seiteKochbuch(q);
    else if (teile[0] === 'mehr') seiteMehr();
    else if (teile[0] === 'rezepte' || (!teile[0] && LISTEN_PARAMETER.some((k) => q.has(k)))) { document.body.dataset.seite = 'rezepte'; seiteUebersicht(q); }
    else { document.body.dataset.seite = 'start'; seiteHeute(); }
    angezeigt = location.hash;
    const neueSeite = gezeichnet !== pfadVon(location.hash);
    gezeichnet = pfadVon(location.hash);
    window.scrollTo(0, obenStarten ? 0 : scrollStand[gezeichnet] || 0);
    obenStarten = false;
    Timer.markieren();
    kopfleisteBinden();
    abstaendeMessen();
    if (neueSeite) seiteEinblenden();
    if (nachDemZeichnen) { const f = nachDemZeichnen; nachDemZeichnen = null; f(); }
  }
  let nachDemZeichnen = null;   // einmalig nach dem nächsten Zeichnen (z. B. Dialog nach Seitenwechsel)

  /** Alle Rezepte, deren Zutaten auf die Einkaufsliste kommen: Wochenplan (ohne schon gekochte) + direkt hinzugefügte */
  const planOffen = () => plan.filter((e) => !e.gekocht);
  const fuerEinkauf = () => [...planOffen(), ...liste];
  function zaehlerAktualisieren() {
    document.querySelectorAll('[data-zahl="plan"]').forEach((el) => { el.textContent = planOffen().length || ''; });
    document.querySelectorAll('[data-zahl="einkauf"]').forEach((el) => { el.textContent = fuerEinkauf().length + extras.length || ''; });
    document.querySelectorAll('[data-zahl="zuhause"]').forEach((el) => { el.textContent = zuhause.length || ''; });
  }

  // ---------------------------------------------------------------- Übersicht
  // Filter: Kategorie, Ernährungsform, Merkmale (Nährwerte, Schnell), Suche, Zutaten; dazu Sortierung
  const SCHNELL_MIN = 30;
  const titelVergleich = (a, b) => a.titel.localeCompare(b.titel, 'de');
  /** [id, Name, Wert, Standard-Richtung, Text aufsteigend, Text absteigend, Gruppe]; Wert null = immer ans Ende */
  const SORTIERUNGEN = [
    ['name', 'Name', null, 'auf', 'A–Z', 'Z–A'],
    ['schwierigkeit', 'Schwierigkeit', (r) => SCHWIERIGKEIT[r.schwierigkeit] || 1, 'auf', 'einfach zuerst', 'schwer zuerst'],
    ['zeit', 'Zeit', (r) => gesamtzeit(r.zeit), 'auf', 'schnell zuerst', 'lang zuerst'],
    ['kcal', 'Kalorien', (r) => nwp(r).kcal, 'auf', 'wenig zuerst', 'viel zuerst', 'nw'],
    ['eiweiss', 'Eiweiß', (r) => nwp(r).eiweiss, 'ab', 'wenig zuerst', 'viel zuerst', 'nw'],
    ['fett', 'Fett', (r) => nwp(r).fett, 'auf', 'wenig zuerst', 'viel zuerst', 'nw'],
    ['kh', 'Kohlenhydrate', (r) => nwp(r).kh, 'auf', 'wenig zuerst', 'viel zuerst', 'nw'],
    ['zuhause', 'Am meisten zuhause', (r) => fehlend(r), 'auf'],
    ['bewertung', 'Beste Bewertung', (r) => sterneVon(r.id) || null, 'ab', 'schlechteste zuerst', 'beste zuerst', 'ich'],
    ['zuletzt', 'Zuletzt gekocht', (r) => nullWennNie(tageSeitGekocht(r.id)), 'auf', 'kürzlich zuerst', 'länger her zuerst', 'ich'],
    ['laengst', 'Am längsten nicht gekocht', (r) => Math.min(tageSeitGekocht(r.id), 1e6), 'ab', 'kürzlich zuerst', 'längst zuerst', 'ich'],
    ['haeufig', 'Am häufigsten gekocht', (r) => gekochtHilfe.daten(r.id).length || null, 'ab', 'selten zuerst', 'oft zuerst', 'ich'],
  ];
  const nullWennNie = (t) => (t === Infinity ? null : t);
  const sortierung = (o) => SORTIERUNGEN.find((x) => x[0] === o) || SORTIERUNGEN[0];
  /** Vergleich für Sortierung o in Richtung d ('auf' | 'ab'); bei Gleichstand nach Name */
  function vergleich(o, d) {
    const [, , wert] = sortierung(o);
    const r = d === 'ab' ? -1 : 1;
    if (!wert) return (a, b) => r * titelVergleich(a, b);
    return (a, b) => {
      const wa = wert(a), wb = wert(b);
      if (wa == null || wb == null) return (wa == null) - (wb == null) || titelVergleich(a, b);
      return r * (wa - wb) || (o === 'schwierigkeit' ? gesamtzeit(a.zeit) - gesamtzeit(b.zeit) : 0) || titelVergleich(a, b);
    };
  }
  /** Anzahl Zutaten mit Menge, die nicht zuhause sind (Salz & Co. nach Geschmack zählen nicht) */
  const fehlend = (r) => nurZutaten(r).filter((z) => z.menge != null && !z.optional && !Zutaten.info(z).nie && !istZuhause(z.name)).length;
  const nwCache = new Map();
  // pro Portion, bei Stück-Rezepten (Muffins) pro Stück
  const nwp = (r) => { if (!nwCache.has(r)) { const nw = Naehrwerte.berechnen(r); nwCache.set(r, nw.stueck || nw.portion); } return nwCache.get(r); };
  const proText = (r) => (stueckRezept(r) ? 'pro Stück' : 'pro Portion');
  const kcalText = (r) => nwZahl(nwp(r).kcal, 'kcal') + (stueckRezept(r) ? ' pro Stück' : '');

  // Ernährungsform aus den Zutaten (assets/zutaten.js), im Rezept mit ernaehrung: '…' überschreibbar
  const ERNAEHRUNG = [
    { id: 'vegan', name: 'Vegan', passt: (e) => e.id === 'vegan' },
    { id: 'vegetarisch', name: 'Vegetarisch', passt: (e) => e.id === 'vegan' || e.id === 'vegetarisch' },
    { id: 'fisch', name: 'Mit Fisch', passt: (e) => e.fisch },
    { id: 'fleisch', name: 'Mit Fleisch', passt: (e) => e.fleisch },
    // Austernsauce & Co.: nicht vegetarisch, aber kein Fischgericht – kein eigener Filter-Chip
    { id: 'fischzutat', name: 'Nicht vegetarisch', passt: (e) => e.id === 'fischzutat', versteckt: true },
  ];
  const ernCache = new Map();
  const ernaehrungVon = (r) => { if (!ernCache.has(r)) ernCache.set(r, Zutaten.ernaehrung(r)); return ernCache.get(r); };
  function ernaehrungHTML(r) {
    const e = ernaehrungVon(r);
    const name = ERNAEHRUNG.find((x) => x.id === e.id).name + (e.id === 'fischzutat' && e.gruende.length ? ' (' + e.gruende.join(', ') + ')' : '');
    // Fisch/Fleisch nur am Bildschirm, damit der Druck unverändert bleibt
    return `<span class="merkmal m-${e.id}${e.fisch || e.fleisch ? ' nur-bildschirm' : ''}"${e.gruende.length ? ` title="${esc('Wegen: ' + e.gruende.join(', '))}"` : ''}>${name}</span>`;
  }
  /** Merkmale eines Rezepts als Liste {id, name} */
  function merkmaleVon(r) {
    const m = Naehrwerte.merkmale(r).map((x) => ({ id: x.id, name: x.name }));
    if (gesamtzeit(r.zeit) && gesamtzeit(r.zeit) <= SCHNELL_MIN) m.push({ id: 'schnell', name: 'Schnell' });
    return m;
  }
  const FILTER_MERKMALE = [{ id: 'schnell', name: 'Schnell (≤ 30 Min.)' },
    ...Naehrwerte.MERKMALE.map((m) => ({ id: m.id, name: m.name }))];

  /** Zutaten-Eingabe: "Spinat, Käse, -Pilze" -> mit Spinat UND Käse, ohne Pilze */
  function zutatenFilter(text) {
    const teile = String(text || '').split(/[,;]+/).map((t) => t.trim()).filter(Boolean);
    return {
      mit: teile.filter((t) => !/^(-|ohne )/i.test(t)).map((t) => Zutaten.normal(t)),
      ohne: teile.filter((t) => /^(-|ohne )/i.test(t)).map((t) => Zutaten.normal(t.replace(/^(-|ohne )\s*/i, ''))).filter(Boolean),
    };
  }

  function filtern(f) {
    const n = Zutaten.normal(f.s);
    const zf = zutatenFilter(f.z);
    const ern = ERNAEHRUNG.find((x) => x.id === f.e);
    return rezepte.filter((r) => {
      if (f.fav && !istFavorit(r.id)) return false;
      if (f.k && r.kategorie !== f.k) return false;
      if (ern && !ern.passt(ernaehrungVon(r))) return false;
      if (f.m.length) {
        const ids = merkmaleVon(r).map((x) => x.id);
        if (!f.m.every((m) => ids.includes(m))) return false;
      }
      const namen = nurZutaten(r).map((z) => Zutaten.normal(z.name));
      if (zf.mit.some((w) => !namen.some((nm) => Zutaten.passtSuche(nm, w)))) return false;
      if (zf.ohne.some((w) => namen.some((nm) => Zutaten.passtSuche(nm, w)))) return false;
      if (!n) return true;
      const ernText = ERNAEHRUNG.filter((x) => x.passt(ernaehrungVon(r))).map((x) => x.name).join(' ');
      const text = Zutaten.normal([r.titel, r.beschreibung, r.kategorie, (r.tags || []).join(' '), ernText, namen.join(' ')].join(' '));
      return n.split(' ').every((w) => Zutaten.passtSuche(text, w));
    }).sort(vergleich(f.o, f.d));
  }

  /** Filter aus der Adresse lesen (auch alte Links: #/?…, m=veggie) */
  function filterAusAdresse(q) {
    const m = (q.get('m') || '').split(',').filter(Boolean);
    const f = { s: q.get('s') || '', k: q.get('k') || '', z: q.get('z') || '',
      e: q.get('e') || (m.includes('veggie') ? 'vegetarisch' : ''),   // alte Links: m=veggie
      m: m.filter((x) => x !== 'veggie' && FILTER_MERKMALE.some((y) => y.id === x)), o: sortierung(q.get('o'))[0], d: q.get('d') || '', fav: q.get('fav') === '1' };
    if (!ERNAEHRUNG.some((x) => x.id === f.e)) f.e = '';
    if (!['auf', 'ab'].includes(f.d)) f.d = sortierung(f.o)[3];
    return f;
  }
  /** Teilbare Adresse der Liste: #/rezepte?k=Suppe&o=zeit … */
  function listenAdresse(f) {
    const p = new URLSearchParams();
    if (f.s) p.set('s', f.s);
    if (f.k) p.set('k', f.k);
    if (f.e) p.set('e', f.e);
    if (f.z) p.set('z', f.z);
    if (f.m.length) p.set('m', f.m.join(','));
    if (f.fav) p.set('fav', '1');
    if (f.o !== 'name') p.set('o', f.o);
    if (f.d !== sortierung(f.o)[3]) p.set('d', f.d);
    return '#/rezepte' + (p.toString() ? '?' + p.toString() : '');
  }
  /** „Name A–Z“, „Zeit · schnell zuerst“, „Am meisten zuhause“ */
  function sortText(f) {
    const s = sortierung(f.o);
    if (!s[4]) return s[1];
    const r = f.d === 'ab' ? s[5] : s[4];
    return s[0] === 'name' ? s[1] + ' ' + r : s[1] + ' · ' + r;
  }
  /** Anzahl Filter im Blatt (Eigenschaften, Zutaten) – Zahl am Filter-Knopf */
  const blattFilterZahl = (f) => f.m.length + (f.z ? 1 : 0);

  // Liste: Suche + eine wischbare Chip-Reihe (Favoriten | Ernährung | Kategorie, aktive vorne);
  // Sortierung, Eigenschaften und Zutaten im Blatt „Sortieren & filtern“.
  function seiteUebersicht(q) {
    document.title = 'Alle Rezepte – Rezepte';
    const f = filterAusAdresse(q);
    const kategorien = [...new Set(rezepte.map((r) => r.kategorie).filter(Boolean))].sort();
    let fb = null;               // offenes Filter-Blatt

    app.innerHTML = `
      <section class="kopf-seite liste-kopf nur-bildschirm">
        <h1>Alle Rezepte</h1>
        <div class="filter">
          <div class="such-zeile">
            <label class="suchfeld">${svg('suche')}
              <input id="suche" type="search" placeholder="Suchen: Titel, Zutat, Tag …" value="${esc(f.s)}" autocomplete="off" enterkeyhint="search" aria-label="Rezepte durchsuchen">
            </label>
            <button type="button" class="knopf filter-knopf" id="filter-auf" aria-haspopup="dialog" aria-label="Sortieren und filtern">${svg('filter')} <span>Filter</span><span class="zahl" id="filter-zahl"></span></button>
            <button type="button" class="knopf icon-knopf wuerfel-knopf" id="wuerfel" aria-label="Was koche ich heute? Zufallsrezept" title="Was koche ich heute?">${svg('wuerfel')}</button>
          </div>
          <div class="chips filter-chips" id="filter-chips" role="group" aria-label="Schnellfilter"></div>
        </div>
      </section>
      ${ladefehler.length ? `<p class="hinweis fehler">Nicht geladen: ${ladefehler.map(esc).join(', ')} – Datei in /rezepte prüfen.</p>` : ''}
      <div class="listen-info nur-bildschirm">
        <button type="button" class="listen-sort" id="listen-sort" aria-haspopup="dialog"><span class="treffer" id="treffer"></span><span aria-hidden="true"> · </span><span class="sort-text" id="sort-text"></span>${svg('runter')}</button>
        <span class="aktiv-chips" id="aktiv-chips"></span>
      </div>
      <div class="karten" id="karten"></div>`;

    const $ = (id) => document.getElementById(id);
    /** Chip-Reihe: aktive zuerst, dann Favoriten | Ernährung | Kategorien, getrennt durch einen Strich */
    function chipsZeigen() {
      const chip = (attr, wert, an, inhalt, klasse) => ({ an, html: `<button type="button" class="chip${klasse ? ' ' + klasse : ''}${an ? ' aktiv' : ''}" ${attr}="${esc(wert)}" aria-pressed="${an}">${inhalt}</button>` });
      const gruppen = [
        [chip('data-fav', '1', f.fav, svg('herz', f.fav ? 'voll' : '') + ' Favoriten', 'fav-chip')],
        ERNAEHRUNG.filter((x) => !x.versteckt || f.e === x.id).map((x) => chip('data-e', x.id, f.e === x.id, x.name, 'e-' + x.id)),
        kategorien.map((k) => chip('data-k', k, f.k === k, esc(k))),
      ];
      const teile = [gruppen.flat().filter((c) => c.an), ...gruppen.map((g) => g.filter((c) => !c.an))].filter((g) => g.length);
      $('filter-chips').innerHTML = teile.map((g) => g.map((c) => c.html).join('')).join('<span class="chip-trenner" aria-hidden="true"></span>');
      $('filter-chips').scrollLeft = 0;
    }
    function aktualisieren() {
      adresseSetzen(listenAdresse(f));
      const treffer = filtern(f);
      $('karten').innerHTML = treffer.map((r) => karte(r, f.o)).join('') || (f.fav && !favoriten.length
        ? `<p class="leer">Noch keine Favoriten. Im Rezept auf ${svg('herz')} tippen, um es hier zu sammeln.</p>`
        : '<p class="leer">Keine Rezepte gefunden. Filter lockern?</p>');
      const aktiv = blattFilterZahl(f);
      $('filter-zahl').textContent = aktiv || '';
      $('filter-auf').classList.toggle('an', aktiv > 0);
      $('filter-auf').setAttribute('aria-label', 'Sortieren und filtern' + (aktiv ? ' – ' + aktiv + ' aktiv' : ''));
      const gefiltert = aktiv || f.s || f.k || f.e || f.fav;
      $('treffer').textContent = gefiltert ? treffer.length + ' von ' + rezepte.length : rezepte.length + ' Rezepte';
      $('sort-text').textContent = sortText(f);
      $('listen-sort').setAttribute('aria-label', (gefiltert ? treffer.length + ' von ' + rezepte.length + ' Rezepten' : rezepte.length + ' Rezepte') + ', sortiert: ' + sortText(f) + ' – ändern');
      // aktive Filter aus dem Blatt als entfernbare Mini-Chips
      $('aktiv-chips').innerHTML = [
        ...f.m.map((id) => `<button type="button" class="mini-chip" data-weg-m="${id}" aria-label="${esc(FILTER_MERKMALE.find((x) => x.id === id).name)} entfernen"><span>${esc(FILTER_MERKMALE.find((x) => x.id === id).name)} ${svg('schliessen')}</span></button>`),
        f.z ? `<button type="button" class="mini-chip" data-weg-z aria-label="Zutaten-Filter entfernen"><span>Zutaten: ${esc(f.z)} ${svg('schliessen')}</span></button>` : '',
      ].join('');
      if (fb && blatt === fb) {
        const ok = fb.el.querySelector('#fb-ok');
        if (ok) ok.textContent = treffer.length === 1 ? '1 Rezept anzeigen' : treffer.length + ' Rezepte anzeigen';
      }
    }
    // Suchfeld und Zutaten: verzögert, damit beim Tippen nicht ständig neu gezeichnet wird
    let takt;
    const spaeter = (fn) => { clearTimeout(takt); takt = setTimeout(fn, 150); };
    $('suche').addEventListener('input', (e) => spaeter(() => { f.s = e.target.value; aktualisieren(); }));
    $('suche').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
    $('filter-chips').addEventListener('click', (e) => {
      const c = e.target.closest('button');
      if (!c) return;
      if (c.dataset.fav) f.fav = !f.fav;
      else if (c.dataset.e != null) f.e = f.e === c.dataset.e ? '' : c.dataset.e;
      else if (c.dataset.k != null) f.k = f.k === c.dataset.k ? '' : c.dataset.k;
      chipsZeigen(); aktualisieren();
    });
    $('aktiv-chips').addEventListener('click', (e) => {
      const c = e.target.closest('button');
      if (!c) return;
      if (c.dataset.wegM) f.m = f.m.filter((x) => x !== c.dataset.wegM);
      else if (c.hasAttribute('data-weg-z')) f.z = '';
      aktualisieren();
    });
    $('wuerfel').addEventListener('click', () => wuerfelBlatt(() => wurfAuswahl(filtern(f), f.k)));
    const blattOeffnen = () => { fb = filterBlatt(f, aktualisieren); aktualisieren(); };
    $('filter-auf').addEventListener('click', blattOeffnen);
    $('listen-sort').addEventListener('click', blattOeffnen);
    chipsZeigen();
    aktualisieren();
  }

  /** Blatt „Sortieren & filtern“: wirkt sofort (Liste und Adresse), „Zurücksetzen“ nimmt Sortierung und Blatt-Filter zurück */
  function filterBlatt(f, aktualisieren) {
    const b = blattAuf('Sortieren & filtern', { klasse: 'filter-blatt' });
    const chip = (attr, wert, an, text, f2) => `<button type="button" class="chip${an ? ' aktiv' : ''}" ${attr}="${esc(wert)}" data-f="${f2 || attr + wert}" aria-pressed="${an}">${text}</button>`;
    const sortChips = (liste) => liste.map((x) => chip('data-o', x[0], f.o === x[0], esc(x[1]))).join('');
    function zeigen() {
      const s = sortierung(f.o);
      b.zeigen(`
        <div class="feld"><span>Sortieren nach</span><div class="chips">${sortChips(SORTIERUNGEN.filter((x) => !x[6] && x[0] !== 'zuhause'))}${sortChips([sortierung('zuhause')])}</div></div>
        <div class="feld"><span>Nährwerte pro Portion</span><div class="chips">${sortChips(SORTIERUNGEN.filter((x) => x[6] === 'nw'))}</div></div>
        <div class="feld"><span>Meine Rezepte</span><div class="chips">${sortChips(SORTIERUNGEN.filter((x) => x[6] === 'ich'))}</div></div>
        ${s[4] && s[5] ? `<div class="feld"><span>Reihenfolge</span><div class="chips richtung-chips">
          ${chip('data-d', 'auf', f.d === 'auf', '<span aria-hidden="true">↑</span> ' + esc(s[4]))}${chip('data-d', 'ab', f.d === 'ab', '<span aria-hidden="true">↓</span> ' + esc(s[5]))}
        </div></div>` : ''}
        <div class="feld"><span>Eigenschaften</span><div class="chips merkmal-chips">
          ${FILTER_MERKMALE.map((x) => chip('data-m', x.id, f.m.includes(x.id), esc(x.name))).join('')}
        </div></div>
        <label class="feld"><span>Mit Zutaten</span>
          <input id="zutaten" data-f="zutaten" type="search" placeholder="z. B. Spinat, Käse  ·  ohne: -Pilze" value="${esc(f.z)}" autocomplete="off" enterkeyhint="done">
        </label>
        <p class="klein fb-hilfe">Mehrere mit Komma trennen. „-Pilze“ oder „ohne Pilze“ schließt aus.</p>`,
      `<button type="button" class="knopf leise" id="fb-weg" data-f="fb-weg">Zurücksetzen</button>
       <button type="button" class="knopf haupt" id="fb-ok" data-blatt-zu>Anzeigen</button>`);
    }
    b.el.addEventListener('click', (e) => {
      const t = (sel) => e.target.closest(sel);
      if (t('[data-o]')) { f.o = t('[data-o]').dataset.o; f.d = sortierung(f.o)[3]; }
      else if (t('[data-d]')) f.d = t('[data-d]').dataset.d;
      else if (t('[data-m]')) { const m = t('[data-m]').dataset.m; f.m = f.m.includes(m) ? f.m.filter((x) => x !== m) : [...f.m, m]; }
      else if (t('#fb-weg')) { f.o = 'name'; f.d = 'auf'; f.m = []; f.z = ''; }
      else return;
      zeigen(); aktualisieren();
    });
    let takt;
    b.el.addEventListener('input', (e) => {
      if (e.target.id !== 'zutaten') return;
      clearTimeout(takt);
      takt = setTimeout(() => { f.z = e.target.value; aktualisieren(); }, 200);
    });
    b.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'zutaten') { e.preventDefault(); e.target.blur(); } });
    zeigen();
    return b;
  }

  // ---------------------------------------------------------------- Startseite „Heute“
  // Begrüßung, heute geplant (mit „Jetzt kochen“), laufender Kochmodus, nächste Tage, Einkauf,
  // wischbare Reihen (Favoriten, zuletzt / lange nicht gekocht, passt zum Vorrat, schnell), Suche und alle Rezepte.
  const LANGE_NICHT_TAGE = 21;
  const REIHE_MAX = 12;
  /** Zuletzt benutzter, noch frischer Kochmodus → {r, st, n} oder null */
  function laufendesKochen() {
    const [id, st] = Object.entries(kochen).filter(([id, st]) => nachId[id] && kochFrisch(st))
      .sort((a, b) => b[1].zeit - a[1].zeit)[0] || [];
    if (!id) return null;
    const n = schrittListe(nachId[id]).length;
    return n ? { r: nachId[id], st, n } : null;
  }
  /** Nächste geplante (offene) Gerichte nach heute, höchstens n; danach solche ohne Tag */
  function naechsteGeplant(n) {
    const i = TAGE.indexOf(heuteTag()), l = [];
    for (let d = 1; d < 7; d++) {
      const tag = TAGE[(i + d) % 7];
      planOffen().filter((e) => e.tag === tag).forEach((e) => l.push({ e, wann: d === 1 ? 'Morgen' : tag }));
    }
    planOffen().filter((e) => !e.tag).forEach((e) => l.push({ e, wann: 'Ohne Tag' }));
    return l.slice(0, n);
  }
  /** Offene Posten auf der Einkaufsliste (wie „offen“ auf der Einkaufsseite) */
  const einkaufOffen = () => einkaufsliste().filter((g) => !g.zuhause)
    .reduce((n, g) => n + g.liste.filter((p) => !abgehakt[p.schluessel]).length, 0);

  function heuteReihen() {
    const gk = (r) => tageSeitGekocht(r.id);
    return [
      { id: 'favoriten', titel: 'Favoriten', alle: '#/rezepte?fav=1',
        liste: favoriten.slice().reverse().map((id) => nachId[id]).filter(Boolean),
        info: (r) => (sterneVon(r.id) ? '★ ' + sterneVon(r.id) : gesamtzeit(r.zeit) ? dauer(gesamtzeit(r.zeit)) : '') },
      { id: 'zuletzt', titel: 'Zuletzt gekocht', alle: '#/rezepte?o=zuletzt',
        liste: rezepte.filter((r) => gk(r) < LANGE_NICHT_TAGE).sort((a, b) => gk(a) - gk(b)),
        info: (r) => 'gekocht ' + vorText(gk(r)) },
      { id: 'laengst', titel: 'Lange nicht gekocht', alle: '#/rezepte?o=laengst',
        liste: rezepte.filter((r) => gk(r) >= LANGE_NICHT_TAGE && gk(r) !== Infinity).sort((a, b) => gk(b) - gk(a)),
        info: (r) => 'zuletzt ' + vorText(gk(r)) },
      { id: 'vorrat', titel: 'Passt zu deinem Vorrat', alle: '#/rezepte?o=zuhause',
        liste: zuhause.length ? rezepte.filter((r) => fehlend(r) <= 2).sort((a, b) => fehlend(a) - fehlend(b) || titelVergleich(a, b)) : [],
        info: (r) => (fehlend(r) ? 'fehlt: ' + fehlend(r) : 'alles da') },
      { id: 'schnell', titel: 'Schnell gemacht', alle: '#/rezepte?m=schnell&o=zeit',
        liste: rezepte.filter((r) => merkmaleVon(r).some((m) => m.id === 'schnell')).sort((a, b) => gesamtzeit(a.zeit) - gesamtzeit(b.zeit)),
        info: (r) => dauer(gesamtzeit(r.zeit)) },
    ].filter((x) => x.liste.length);
  }
  const miniKarte = (r, info) => `
    <li><a class="mini-karte" href="#/rezept/${esc(r.id)}">
      <span class="mini-bild">${bildFlaeche(r)}</span>
      <strong>${esc(r.titel)}</strong>
      ${info ? `<small>${esc(info)}</small>` : ''}
    </a></li>`;

  function seiteHeute() {
    document.title = 'Rezepte';
    const jetzt = new Date(), std = jetzt.getHours();
    const gruss = std < 5 ? 'Hallo' : std < 11 ? 'Guten Morgen' : std < 18 ? 'Guten Tag' : 'Guten Abend';
    const datum = jetzt.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const heute = heuteTag();
    const geplant = plan.filter((e) => e.tag === heute && !e.gekocht);
    const erledigt = plan.filter((e) => e.tag === heute && e.gekocht);
    const naechste = naechsteGeplant(3);
    const weiter = laufendesKochen();
    const offen = einkaufOffen();
    const reihen = heuteReihen();

    const gericht = (e) => {
      const r = nachId[e.id], z = gesamtzeit(r.zeit), p = begrenzen(portionen(e));
      const st = kochStand(r.id), fortsetzen = kochFrisch(st) && st.s > 1;
      return `
        <article class="heute-gericht" data-uid="${e.uid}">
          ${r.bild ? `<a class="hg-bild" href="#/rezept/${esc(r.id)}?p=${p}" tabindex="-1" aria-hidden="true">${bildHTML(r, 'auswahl', 'sizes="(min-width: 721px) 520px, 100vw"')}</a>` : ''}
          <div class="hg-text">
            <span class="karte-kat">${esc(r.kategorie || '')}</span>
            <h3><a href="#/rezept/${esc(r.id)}?p=${p}">${esc(r.titel)}</a></h3>
            <p class="hg-meta">${z ? `<span>${svg('uhr')} ${dauer(z)}</span>` : ''}<span>${svg('personen')} ${portionenHTML(e)}</span></p>
            <div class="hg-knoepfe">
              <a class="knopf haupt hg-kochen" href="#/kochen/${esc(r.id)}?p=${p}&amp;s=${fortsetzen ? st.s : 1}">${svg('topf')} <span>${fortsetzen ? 'Weiterkochen' : 'Jetzt kochen'}</span></a>
              <button type="button" class="knopf hg-gekocht" data-gekocht-uid="${e.uid}" title="Als gekocht abhaken">${svg('haken')} <span>Gekocht</span></button>
            </div>
          </div>
        </article>`;
    };

    app.innerHTML = `
      <section class="heute nur-bildschirm">
        <header class="heute-kopf">
          <p class="heute-gruss">${gruss}</p>
          <h1>${esc(datum)}</h1>
        </header>
        ${ladefehler.length ? `<p class="hinweis fehler">Nicht geladen: ${ladefehler.map(esc).join(', ')} – Datei in /rezepte prüfen.</p>` : ''}

        ${weiter ? `
        <a class="heute-weiter heute-zeile" href="#/kochen/${esc(weiter.r.id)}?p=${weiter.st.p || weiter.r.personen || STANDARD_PERSONEN}&amp;s=${weiter.st.s}">
          <span class="hz-icon">${svg('topf')}</span>
          <span class="hz-text"><strong>Weiterkochen: ${esc(weiter.r.titel)}</strong><small>Schritt ${Math.min(weiter.st.s, weiter.n)}/${weiter.n}</small></span>
          <span class="hz-pfeil">${svg('vor')}</span>
        </a>` : ''}

        <section class="heute-abschnitt heute-geplant" aria-labelledby="h-geplant">
          <h2 id="h-geplant">Heute geplant</h2>
          ${geplant.length ? geplant.map(gericht).join('') : `
          <div class="heute-leer">
            <p>${erledigt.length ? 'Für heute ist alles gekocht. Guten Appetit!' : 'Für heute ist noch nichts geplant.'}</p>
            <div class="hl-knoepfe">
              <button type="button" class="knopf haupt" id="heute-wuerfel">${svg('wuerfel')} <span>Was koche ich heute?</span></button>
              <a class="knopf" href="#/plan">${svg('kalender')} <span>Woche planen</span></a>
            </div>
          </div>`}
          ${erledigt.length ? `<p class="klein heute-erledigt">${svg('haken')} Heute gekocht: ${erledigt.map((e) => esc(nachId[e.id].titel)).join(', ')}</p>` : ''}
        </section>

        ${naechste.length ? `
        <section class="heute-abschnitt heute-naechste" aria-labelledby="h-naechste">
          <div class="reihe-kopf"><h2 id="h-naechste">Nächste Tage</h2><a class="reihe-alle" href="#/plan">Plan</a></div>
          <ul class="naechste-liste">${naechste.map(({ e, wann }) => `
            <li><a href="#/rezept/${esc(e.id)}?p=${begrenzen(portionen(e))}">
              <span class="nl-wann">${esc(wann)}</span>
              <span class="nl-titel">${esc(nachId[e.id].titel)}</span>
              <span class="nl-pfeil">${svg('vor')}</span>
            </a></li>`).join('')}</ul>
        </section>` : ''}

        ${offen ? `
        <a class="heute-einkauf heute-zeile" href="#/einkauf">
          <span class="hz-icon">${svg('korb')}</span>
          <span class="hz-text"><strong>${offen === 1 ? '1 Sache' : offen + ' Sachen'} auf der Einkaufsliste</strong></span>
          <span class="hz-pfeil">${svg('vor')}</span>
        </a>` : ''}

        ${reihen.map((x) => `
        <section class="heute-abschnitt reihe reihe-${x.id}" aria-labelledby="h-${x.id}">
          <div class="reihe-kopf"><h2 id="h-${x.id}">${esc(x.titel)}</h2><a class="reihe-alle" href="${esc(x.alle)}" aria-label="Alle: ${esc(x.titel)}">Alle</a></div>
          <ul class="reihe-liste">${x.liste.slice(0, REIHE_MAX).map((r) => miniKarte(r, x.info(r))).join('')}</ul>
        </section>`).join('')}
        ${!favoriten.length && !Object.keys(gekocht).length ? `<p class="klein heute-tipp">Tipp: Mit ${svg('herz')} im Rezept merkst du dir Favoriten – sie erscheinen dann hier.</p>` : ''}

        <section class="heute-abschnitt heute-suchen">
          <button type="button" class="suchfeld heute-suche" id="heute-suche">${svg('suche')}<span>Suchen: Titel, Zutat, Tag …</span></button>
          <a class="knopf heute-alle" href="#/rezepte">${svg('buch')} <span>Alle Rezepte (${rezepte.length})</span>${svg('vor')}</a>
        </section>
      </section>`;

    const w = document.getElementById('heute-wuerfel');
    if (w) w.addEventListener('click', () => wuerfelBlatt(() => wurfAuswahl(rezepte)));
    app.querySelectorAll('[data-gekocht-uid]').forEach((k) => k.addEventListener('click', () => {
      const e = plan.find((x) => x.uid === k.dataset.gekochtUid);
      if (e) kochenAbschliessen(nachId[e.id], e);
    }));
    // Suche: Liste im selben Tipp öffnen und fokussieren (sonst öffnet iOS die Tastatur nicht)
    document.getElementById('heute-suche').addEventListener('click', () => {
      sofortOeffnen('#/rezepte');
      const s = document.getElementById('suche');
      if (s) s.focus();
    });
  }

  /*
   * Rezeptfotos: groß (bilder/<id>.jpg, höchstens 1200 px) für Rezeptkopf und Druck, klein (bilder/klein/<id>.jpg,
   * 600 px) für Karten, Reihen, Würfel und Kalender. Maße und Vorschaubilder stehen in rezepte/liste.js
   * (window.REZEPT_BILDER, von tools/pruefen.js). Fehlt ein Vorschaubild, wird das große Foto genommen.
   * art: 'klein' | 'gross' | 'auswahl' (Browser wählt per srcset; attr sollte dann sizes enthalten)
   */
  const BILDER = window.REZEPT_BILDER || {};
  function bildHTML(r, art, attr) {
    const m = BILDER[r.bild] || {};
    const klein = art !== 'gross' && m.klein;
    const [b, h] = klein ? [m.kb, m.kh] : [m.b, m.h];
    const auswahl = art === 'auswahl' && m.klein && m.b ? ` srcset="${esc(m.klein)} ${m.kb}w, ${esc(r.bild)} ${m.b}w"` : '';
    return `<img src="${esc(klein && !auswahl ? m.klein : r.bild)}"${auswahl}${b && h ? ` width="${b}" height="${h}"` : ''} alt="" decoding="async"${attr ? ' ' + attr : ''}>`;
  }
  /** Bildfläche einer Karte: Foto oder Platzhalter (Farbfläche mit Initiale), Ton aus der id */
  function bildFlaeche(r) {
    if (r.bild) return bildHTML(r, 'klein', 'loading="lazy"');
    let h = 0;
    for (const c of String(r.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `<span class="platzhalter ton-${h % 4}" aria-hidden="true"><span class="ph-initiale">${esc((r.titel || '?').trim().charAt(0).toUpperCase())}</span>${svg('topf')}</span>`;
  }
  /** Ernährungsform als dezentes Abzeichen auf Karten – nur vegan/vegetarisch */
  function kartenAbzeichen(r) {
    const e = ernaehrungVon(r);
    if (e.id !== 'vegan' && e.id !== 'vegetarisch') return '';
    return `<span class="karte-ern e-${e.id}">${e.id === 'vegan' ? 'Vegan' : 'Vegetarisch'}</span>`;
  }
  /** Bildkarte der Liste: Bild (Herz/Sterne darauf), Titel, eine Zeile Meta; der sortierte Wert steht hervorgehoben vorne */
  function karte(r, o) {
    const z = gesamtzeit(r.zeit), sterne = sterneVon(r.id), t = tageSeitGekocht(r.id), n = gekochtHilfe.daten(r.id).length;
    const nw = { eiweiss: 'Eiweiß', fett: 'Fett', kh: 'KH' }[o];
    const hervor = nw ? nwZahl(nwp(r)[o], 'g') + ' ' + nw
      : o === 'schwierigkeit' ? r.schwierigkeit || ''
      : o === 'zuhause' ? (fehlend(r) ? 'fehlt: ' + fehlend(r) : 'alles da')
      : o === 'bewertung' ? (sterne ? '★ ' + sterne : 'unbewertet')
      : o === 'zuletzt' || o === 'laengst' ? (t === Infinity ? 'noch nie gekocht' : 'gekocht ' + vorText(t))
      : o === 'haeufig' ? (n ? n + '× gekocht' : 'noch nie gekocht') : '';
    const teile = [
      hervor ? `<span class="sortwert">${esc(hervor)}</span>` : '',
      z ? `<span${o === 'zeit' ? ' class="sortwert"' : ''}>${dauer(z)}</span>` : '',
      !hervor || o === 'kcal' ? `<span${o === 'kcal' ? ' class="sortwert"' : ''}>${kcalText(r)}</span>` : '',
    ].filter(Boolean);
    return `
      <a class="karte" href="#/rezept/${esc(r.id)}">
        <span class="karte-bild">
          ${bildFlaeche(r)}
          ${istFavorit(r.id) || sterne ? `<span class="karte-marken">${sterne ? `<span class="karte-sterne" title="${sterne} von 5 Sternen">${svg('stern', 'voll')}${sterne}<span class="nur-sr"> von 5 Sternen</span></span>` : ''}${istFavorit(r.id) ? `<span class="karte-fav" title="Favorit">${svg('herz', 'voll')}<span class="nur-sr">Favorit</span></span>` : ''}</span>` : ''}
          ${kartenAbzeichen(r)}
        </span>
        <h2 class="karte-titel">${esc(r.titel)}</h2>
        <span class="karte-meta">${teile.join('<span class="punkt" aria-hidden="true"> · </span>')}</span>
      </a>`;
  }
  function merkmalHTML(r) {
    return `<span class="merkmale">${ernaehrungHTML(r)}${merkmaleVon(r).map((x) => `<span class="merkmal m-${x.id}">${esc(x.name)}</span>`).join('')}</span>`;
  }

  // ---------------------------------------------------------------- Zufallsrezept „Was koche ich heute?“
  // Aus den aktuellen Treffern, gewichtet: Favorit, gute Bewertung, lange nicht gekocht, viel zuhause. Nie zweimal hintereinander dasselbe.
  let letzterWurf = null;
  function wurfGewicht(r) {
    let w = istFavorit(r.id) ? 2.5 : 1;
    const s = sterneVon(r.id);
    if (s) w *= [1, 0.3, 0.6, 1, 1.5, 2][s];
    const t = tageSeitGekocht(r.id);
    w *= t === Infinity ? 1.2 : t < 7 ? 0.3 : t < 21 ? 0.7 : 1 + Math.min(t, 90) / 90 * 0.6;
    if (zuhause.length) {
      const zut = nurZutaten(r).filter((z) => z.menge != null && !z.optional && !Zutaten.info(z).nie);
      w *= 0.6 + (zut.length ? 1 - fehlend(r) / zut.length : 0);
    }
    return w;
  }
  function wuerfeln(treffer) {
    const pool = treffer.length > 1 ? treffer.filter((r) => r.id !== letzterWurf) : treffer;
    const gewichte = pool.map(wurfGewicht);
    let x = Math.random() * gewichte.reduce((a, b) => a + b, 0);
    const r = pool.find((p, i) => (x -= gewichte[i]) <= 0) || pool[pool.length - 1];
    letzterWurf = r.id;
    return r;
  }
  // Für „Was koche ich heute?“ standardmäßig keine Kuchen, Süßes, Frühstück – außer der Filter steht auf dieser Kategorie
  const WURF_OHNE = ['Backen', 'Süßes', 'Frühstück'];
  function wurfAuswahl(treffer, kategorie) {
    const ohne = treffer.filter((r) => !WURF_OHNE.includes(r.kategorie) || r.kategorie === kategorie);
    return ohne.length ? ohne : treffer;
  }
  /** trefferHolen = aktuelle Treffer der Übersicht (bei jedem Wurf neu, falls sich etwas geändert hat) */
  function wuerfelBlatt(trefferHolen) {
    if (!trefferHolen().length) { melden('Keine passenden Rezepte – Filter lockern'); return; }
    const b = blattAuf('Was koche ich heute?', { klasse: 'wf-blatt' });
    function zeigen() {
      const treffer = trefferHolen(), r = wuerfeln(treffer), z = gesamtzeit(r.zeit), t = tageSeitGekocht(r.id);
      const personen = stueckRezept(r) ? r.personen : begrenzen(standardWer().length ? portionen({ wer: standardWer() }) : r.personen || STANDARD_PERSONEN);
      const info = [z ? svg('uhr') + ' ' + dauer(z) : '', kcalText(r),
        zuhause.length ? (fehlend(r) ? 'fehlt: ' + fehlend(r) : 'alles da') : ''].filter(Boolean);
      const ich = [istFavorit(r.id) ? svg('herz', 'voll') + ' Favorit' : '', sterneVon(r.id) ? '★ ' + sterneVon(r.id) : '',
        t === Infinity ? 'noch nie gekocht' : 'gekocht ' + vorText(t)].filter(Boolean);
      b.zeigen(`
        <div class="wf-karte">
          ${r.bild ? bildHTML(r, 'klein') : ''}
          <span class="karte-kat">${esc(r.kategorie || '')}</span>
          <h3>${esc(r.titel)}</h3>
          <p class="wf-info">${info.join('<span aria-hidden="true"> · </span>')}</p>
          <p class="wf-ich klein">${ich.join(' · ')}</p>
          ${merkmalHTML(r)}
          <p class="klein wf-pool">${treffer.length === 1 ? 'Nur dieses Rezept passt zu deinen Filtern.' : `Zufällig aus ${treffer.length} passenden Rezepten – Favoriten, gut Bewertetes und lange nicht Gekochtes kommen öfter.`}</p>
        </div>`,
      `<button type="button" class="knopf" id="wf-nochmal" data-f="wf-nochmal" ${treffer.length > 1 ? '' : 'disabled'}>${svg('wuerfel')} Nochmal würfeln</button>
       <a class="knopf" href="#/rezept/${esc(r.id)}">${svg('buch')} Ansehen</a>
       <button type="button" class="knopf" id="wf-liste" data-f="wf-liste">${svg('korb')} <span>Auf Einkaufsliste</span></button>
       <a class="knopf haupt" href="#/kochen/${esc(r.id)}?p=${personen}&amp;s=1">${svg('topf')} Jetzt kochen</a>`, true);
      b.el.querySelector('#wf-liste').addEventListener('click', (e) => {
        const k = e.currentTarget;
        aufListe(r, personen, () => { k.disabled = true; k.innerHTML = svg('haken') + ' <span>Auf der Liste</span>'; });
      });
    }
    b.el.addEventListener('click', (e) => { if (e.target.closest('#wf-nochmal')) zeigen(); });
    zeigen();
  }

  // ---------------------------------------------------------------- Rezept
  function rezeptHTML(r, personen, interaktiv) {
    const faktor = personen / (r.personen || STANDARD_PERSONEN);
    const zg = gesamtzeit(r.zeit);
    const stufe = SCHWIERIGKEIT[r.schwierigkeit] || 1;
    // Stepper: Personen, bei Backrezepten Stückzahl (in halben Rezepten)
    const sch = pSchritt(r);
    const anzahl = stueckRezept(r) ? Einheiten.zahlText(stueckZahl(r, personen)) : personen;
    const einheitWort = stueckRezept(r) ? r.ergibt.einheit : personen === 1 ? 'Person' : 'Personen';
    const tipps = [...(r.tipps || []), Zutaten.labTipp(r)].filter(Boolean);

    const zutaten = (r.zutaten || []).map((z) => {
      if (z.abschnitt) return `<li class="abschnitt">${esc(z.abschnitt)}</li>`;
      const t = zutatText(z, faktor);
      return `<li class="zutat${z.optional ? ' optional' : ''}${interaktiv && istZuhause(z.name) ? ' da' : ''}">
          <span class="z-icon">${t.info.icon ? svg(t.info.icon) : ''}</span>
          <span class="z-menge">${esc(t.menge)}</span>
          <span class="z-name">${esc(t.name)}${z.optional ? ' <em>(optional)</em>' : ''}${z.hinweis || t.info.trocken ? `<small>${esc([t.info.trocken ? 'Trockengewicht' : '', z.hinweis].filter(Boolean).join(', '))}</small>` : ''}${!t.menge && z.menge == null ? '<small>nach Geschmack</small>' : ''}</span>
        </li>`;
    }).join('');

    let nr = 0;
    const schritte = (r.schritte || []).map((s) => {
      if (typeof s === 'object' && s.abschnitt) return `<h3 class="schritt-abschnitt">${esc(s.abschnitt)}</h3>`;
      nr += 1;
      if (!interaktiv) return `<div class="schritt"><span class="nr">${nr}</span><p>${fett(s)}</p></div>`;
      return `<div class="schritt" ${timerZiel(r, nr, personen)}><span class="nr">${nr}</span><p>${Timer.chips(fett(s))}</p></div>`;
    }).join('');

    const zeitDetail = Object.entries(r.zeit || {}).filter(([, v]) => v)
      .map(([k, v]) => `${ZEIT_NAMEN[k] || k} ${dauer(v)}`).join(' · ');

    return `
      <article class="rezept">
        <header class="r-kopf">
          <div class="r-titelblock">
            <div class="r-kat-zeile">
              <span class="r-kat">${esc([r.kategorie, ...(r.tags || [])].filter(Boolean).join(' · '))}</span>
              ${interaktiv ? favKnopfHTML(r) : ''}
            </div>
            <h1>${esc(r.titel)}</h1>
            ${r.beschreibung ? `<p class="r-beschreibung">${esc(r.beschreibung)}</p>` : ''}
            ${interaktiv ? sterneHTML(r) : ''}
            ${interaktiv ? kochKnopfHTML(r, personen) : ''}
          </div>
          ${r.bild ? bildHTML(r, 'gross', 'class="r-bild"') : ''}
        </header>

        <div class="r-meta">
          <div class="meta-feld">
            ${svg('personen')}
            ${interaktiv ? `
              <span class="stepper nur-bildschirm">
                <button type="button" data-p="${personen - sch}" aria-label="Weniger" ${personen <= sch ? 'disabled' : ''}>${svg('minus')}</button>
                <strong>${anzahl}</strong>
                <button type="button" data-p="${personen + sch}" aria-label="Mehr" ${personen + sch > 30 ? 'disabled' : ''}>${svg('plus')}</button>
              </span>
              <span class="nur-druck"><strong>${anzahl}</strong></span>` : `<strong>${anzahl}</strong>`}
            <span>${einheitWort}</span>
          </div>
          ${zg ? `<div class="meta-feld">${svg('uhr')}<span><strong>${dauer(zg)}</strong>${zeitDetail ? `<small>${esc(zeitDetail)}</small>` : ''}</span></div>` : ''}
          <div class="meta-feld">
            <span class="muetzen" title="${esc(r.schwierigkeit || '')}">${[1, 2, 3].map((i) => svg('muetze', i <= stufe ? 'an' : 'aus')).join('')}</span>
            <span>${esc(r.schwierigkeit || '')}</span>
          </div>
        </div>

        ${naehrwertHTML(r, personen)}
        ${interaktiv ? nwKurzHTML(r) : ''}
        ${merkmalHTML(r)}
        ${interaktiv ? reiterHTML() : ''}

        <div class="r-inhalt">
          <div class="r-links">
            <section class="r-zutaten">
              <h2>Zutaten</h2>
              <ul>${zutaten}</ul>
            </section>
            ${tipps.length ? `<section class="r-tipps"><h2>Tipps</h2><ul>${tipps.map((t) => `<li>${fett(t)}</li>`).join('')}</ul></section>` : ''}
            ${notizHTML(r, interaktiv)}
            ${interaktiv ? verlaufHTML(r) : ''}
          </div>
          <section class="r-schritte">
            <h2>Zubereitung</h2>
            ${schritte}
          </section>
        </div>

      </article>`;
  }

  // Handy: Reiter unter dem Kopf (Zutaten | Zubereitung | Notizen); am PC und im Druck ist alles sichtbar.
  // Welcher Reiter offen ist, steht in <article data-reiter="…"> (CSS blendet aus); Standard je Besuch: Zutaten.
  const REITER = [['zutaten', 'Zutaten'], ['zubereitung', 'Zubereitung'], ['notizen', 'Notizen']];
  const reiterStand = { id: null, reiter: 'zutaten' };
  const reiterHTML = () => `
    <span class="r-reiter-anker" aria-hidden="true"></span>
    <nav class="r-reiter nur-bildschirm" role="tablist" aria-label="Rezeptteile">
      ${REITER.map(([id, name]) => `<button type="button" role="tab" class="r-reiter-knopf" data-reiter-knopf="${id}" aria-selected="false">${name}</button>`).join('')}
      <span class="r-reiter-strich" aria-hidden="true"></span>
    </nav>`;
  /** Nährwerte in einer Zeile für den Kopf am Handy (Details im Reiter „Zutaten“) */
  function nwKurzHTML(r) {
    const p = nwp(r);
    return `<p class="r-nw-kurz nur-bildschirm"><strong>${nwZahl(p.kcal, 'kcal')}</strong><span>${nwZahl(p.eiweiss, 'g')} Eiweiß</span><span>${nwZahl(p.kh, 'g')} KH</span><span>${nwZahl(p.fett, 'g')} Fett</span><small>${proText(r)}</small></p>`;
  }
  /** „Zuletzt gekocht“ und „Gekocht“-Knopf im Reiter „Notizen“ (am PC stehen sie im Kopf) */
  function verlaufHTML(r) {
    const zuletzt = gekochtHilfe.zuletzt(r.id), oft = gekochtHilfe.daten(r.id).length;
    return `
      <section class="r-verlauf nur-bildschirm">
        <h2>Gekocht</h2>
        <p>${zuletzt ? `Zuletzt ${vorText(tageSeit(zuletzt))} (${datumText(zuletzt)}) · ${oft}× gekocht` : 'Noch nie gekocht.'}</p>
        <div class="rv-knoepfe">
          <button type="button" class="knopf" data-gekocht-knopf title="Als gekocht merken, Verbrauchtes aus „Zuhause“ nehmen">${svg('haken')} Heute gekocht</button>
          ${zuletzt ? '<button type="button" class="knopf leise" data-gekocht-verlauf>Verlauf ansehen</button>' : ''}
        </div>
      </section>`;
  }

  // Favorit, Sterne, Notizen (nur Bildschirm; Notizen werden mitgedruckt, wenn vorhanden)
  const favKnopfHTML = (r) => {
    const an = istFavorit(r.id);
    return `<button type="button" class="knopf leise icon-knopf fav-knopf nur-bildschirm${an ? ' an' : ''}" id="fav" aria-pressed="${an}" aria-label="Favorit" title="${an ? 'Favorit – antippen zum Entfernen' : 'Als Favorit merken'}">${svg('herz', an ? 'voll' : '')}</button>`;
  };
  const STERN_TEXT = ['Noch nicht bewertet', 'geht so', 'okay', 'gut', 'sehr gut', 'großartig'];
  function sterneHTML(r) {
    const n = sterneVon(r.id);
    return `
      <div class="r-sterne nur-bildschirm">
        <span class="sterne" role="group" aria-label="Bewertung">${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="stern${i <= n ? ' an' : ''}" data-stern="${i}" aria-pressed="${i === n}" aria-label="${i} von 5 Sternen${i === n ? ' – nochmal antippen zum Zurücksetzen' : ''}">${svg('stern', i <= n ? 'voll' : '')}</button>`).join('')}</span>
        <span class="klein" id="sterne-text">${STERN_TEXT[n]}</span>
      </div>`;
  }
  function notizHTML(r, interaktiv) {
    const t = notizVon(r.id);
    if (!interaktiv) return t ? `<section class="r-notizen"><h2>Notizen</h2><p class="r-notiz-text">${esc(t)}</p></section>` : '';
    return `
      <section class="r-notizen${t ? '' : ' ohne-notiz'}">
        <h2><span class="nur-bildschirm">Meine </span>Notizen</h2>
        <textarea class="notiz-feld nur-bildschirm" id="notiz" rows="2" maxlength="${NOTIZ_MAX}" placeholder="z. B. nächstes Mal weniger Salz" aria-label="Meine Notizen">${esc(t)}</textarea>
        <span class="notiz-status klein nur-bildschirm" id="notiz-status" aria-live="polite"></span>
        <p class="r-notiz-text nur-druck">${esc(t)}</p>
      </section>`;
  }

  const NW_ZEILEN = [
    ['kcal', 'Kalorien', 'kcal'], ['eiweiss', 'Eiweiß', 'g'], ['kh', 'Kohlenhydrate', 'g'],
    ['zucker', 'davon Zucker', 'g'], ['fett', 'Fett', 'g'], ['ballast', 'Ballaststoffe', 'g'],
  ];
  function nwZahl(wert, einheit) {
    if (einheit === 'kcal') return (wert < 100 ? Math.round(wert / 5) * 5 : Math.round(wert / 10) * 10).toLocaleString('de-DE') + ' kcal';
    if (wert > 0 && wert < 1) return '< 1 g';
    return Math.round(wert).toLocaleString('de-DE') + ' g';
  }
  function naehrwertHTML(r, personen) {
    const nw = Naehrwerte.berechnen(r);
    const hinweis = 'Berechnete Richtwerte' + ((r.zutaten || []).some((z) => z.optional) ? ', ohne optionale Zutaten' : '') +
      (nw.fehlend.length ? '. Ohne: ' + nw.fehlend.join(', ') : '');
    return `
      <section class="r-naehrwerte" aria-label="Nährwerte" title="${esc(hinweis)}">
        <div class="nw-titel"><strong>Nährwerte</strong><span>${proText(r)}</span><span class="nw-ges">gesamt ${esc(mengeText(r, personen, true))}</span></div>
        ${NW_ZEILEN.map(([k, name, e]) => `
          <div class="nw-wert${k === 'kcal' ? ' kcal' : ''}">
            <span class="nw-name">${name}</span>
            <strong>${nwZahl((nw.stueck || nw.portion)[k], e)}</strong>
            <span class="nw-ges">${nwZahl(nw.gesamt[k] * personen / (r.personen || STANDARD_PERSONEN), e)}</span>
          </div>`).join('')}
      </section>`;
  }

  /** gewaehlt = Personenzahl in der Adresse/am Stepper gewählt (sonst Standard des Rezepts) */
  function seiteRezept(r, personen, gewaehlt) {
    document.title = r.titel + ' – Rezepte';
    const zurueckText = /^#\/(rezepte|\?)/.test(letzteUebersicht) ? 'Alle Rezepte' : 'Heute';
    app.innerHTML = `
      <div class="werkzeuge r-werkzeuge nur-bildschirm${r.bild ? ' ueber-bild' : ''}">
        <a class="knopf leise zurueck" href="${esc(letzteUebersicht)}" data-zurueck aria-label="Zurück: ${zurueckText}">${svg('zurueck')} <span>${zurueckText}</span></a>
        <span class="abstand"></span>
        <button class="knopf haupt" id="zur-liste" data-zur-liste>${svg('korb')} <span>Auf Einkaufsliste</span></button>
        <button class="knopf" id="zum-plan" aria-label="Zum Wochenplan" title="Zum Wochenplan">${svg('kalender')} <span>Wochenplan</span></button>
        <button class="knopf icon-knopf" onclick="window.print()" aria-label="Drucken" title="Drucken">${svg('drucker')}</button>
      </div>
      ${rezeptHTML(r, personen, true)}
      ${aktionHTML(r, personen)}`;

    const artikel = app.querySelector('.rezept');
    const notizFeld = document.getElementById('notiz');
    function reiterWaehlen(neu, fokus) {
      if (!REITER.some((x) => x[0] === neu)) neu = 'zutaten';
      const anker = artikel.querySelector('.r-reiter-anker');
      const vorher = artikel.dataset.reiter;
      reiterStand.reiter = neu;
      artikel.dataset.reiter = neu;
      artikel.querySelectorAll('[data-reiter-knopf]').forEach((k) => {
        const an = k.dataset.reiterKnopf === neu;
        k.classList.toggle('aktiv', an);
        k.setAttribute('aria-selected', String(an));
        k.tabIndex = an ? 0 : -1;
        if (an && fokus) k.focus({ preventScroll: true });
      });
      if (vorher && vorher !== neu && !wenigBewegung()) {
        const ri = artikel.querySelector('.r-inhalt');
        ri.classList.remove('rein'); void ri.offsetWidth; ri.classList.add('rein');
      }
      if (neu === 'notizen' && notizFeld) { notizFeld.style.height = 'auto'; notizFeld.style.height = notizFeld.scrollHeight + 2 + 'px'; }
      // schon unter die Reiter gescrollt: neuen Reiter von oben zeigen (Leiste bleibt kleben)
      if (vorher && vorher !== neu && anker) {
        const y = anker.getBoundingClientRect().top + window.scrollY - kopfHoehe();   // unter der kompakten Kopfleiste
        if (window.scrollY > y) window.scrollTo(0, y);
      }
    }
    reiterWaehlen(reiterStand.reiter);
    const reiterLeiste = artikel.querySelector('.r-reiter');
    reiterLeiste.addEventListener('click', (e) => { const k = e.target.closest('[data-reiter-knopf]'); if (k) reiterWaehlen(k.dataset.reiterKnopf); });
    reiterLeiste.addEventListener('keydown', (e) => {
      const i = REITER.findIndex((x) => x[0] === reiterStand.reiter);
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); reiterWaehlen(REITER[(i + d + REITER.length) % REITER.length][0], true); }
    });
    // Wischen zwischen den Reitern (nur Handy; waagerecht deutlich mehr als senkrecht)
    let start = null;
    const inhalt = artikel.querySelector('.r-inhalt');
    inhalt.addEventListener('touchstart', (e) => {
      start = e.touches.length === 1 && !e.target.closest('textarea, input') ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    inhalt.addEventListener('touchend', (e) => {
      if (!start || getComputedStyle(reiterLeiste).display === 'none') { start = null; return; }
      const t = e.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
      const i = REITER.findIndex((x) => x[0] === reiterStand.reiter) + (dx < 0 ? 1 : -1);
      if (i >= 0 && i < REITER.length) reiterWaehlen(REITER[i][0]);
    }, { passive: true });

    app.querySelectorAll('.stepper button').forEach((b) => b.addEventListener('click', () => {
      notizenJetzt();
      adresseSetzen('#/rezept/' + r.id + '?p=' + pFuer(r, b.dataset.p));
      seiteRezept(r, pFuer(r, b.dataset.p), true);
      Timer.markieren();
      kopfleisteBinden();
      abstaendeMessen();
    }));
    app.querySelectorAll('[data-gekocht-knopf]').forEach((k) => k.addEventListener('click', () => kochenAbschliessen(r)));
    app.querySelectorAll('[data-gekocht-verlauf]').forEach((k) => k.addEventListener('click', () => gekochtBlatt(r)));
    document.getElementById('fav').addEventListener('click', (e) => {
      const an = favoritUmschalten(r.id), k = e.currentTarget;
      k.classList.toggle('an', an); k.setAttribute('aria-pressed', String(an));
      k.title = an ? 'Favorit – antippen zum Entfernen' : 'Als Favorit merken';
      k.innerHTML = svg('herz', an ? 'voll' : '');
      melden(an ? 'Zu den Favoriten hinzugefügt' : 'Aus den Favoriten entfernt');
    });
    app.querySelector('.sterne').addEventListener('click', (e) => {
      const b = e.target.closest('[data-stern]');
      if (!b) return;
      const n = bewerten(r.id, Number(b.dataset.stern));
      // an Ort und Stelle aktualisieren (Fokus bleibt auf dem Stern)
      app.querySelectorAll('[data-stern]').forEach((s) => {
        const i = Number(s.dataset.stern);
        s.classList.toggle('an', i <= n);
        s.setAttribute('aria-pressed', String(i === n));
        s.setAttribute('aria-label', i + ' von 5 Sternen' + (i === n ? ' – nochmal antippen zum Zurücksetzen' : ''));
        s.innerHTML = svg('stern', i <= n ? 'voll' : '');
      });
      document.getElementById('sterne-text').textContent = STERN_TEXT[n];
    });
    notizFeldBinden(notizFeld, document.getElementById('notiz-status'), r.id, (text) => {
      notizFeld.closest('.r-notizen').classList.toggle('ohne-notiz', !text);
      notizFeld.parentElement.querySelector('.r-notiz-text').textContent = notizFeld.value;
    });
    verlassen = notizenJetzt;
    document.getElementById('zum-plan').addEventListener('click', (e) => {
      // Personenzahl selbst gewählt → so übernehmen, sonst isst der Standard-Haushalt mit (falls angelegt)
      const k = e.currentTarget;
      einplanen(r.id, gewaehlt ? personen : 0, '', () => { k.innerHTML = svg('haken') + ' <span>Im Plan</span>'; });
    });
    app.querySelectorAll('[data-zur-liste]').forEach((k) => k.addEventListener('click', () => {
      aufListe(r, personen, () => app.querySelectorAll('[data-zur-liste]').forEach((x) => { x.innerHTML = svg('haken') + ' <span>Auf der Liste</span>'; }));
    }));
  }

  // ---------------------------------------------------------------- Kein doppeltes Hinzufügen
  /** Rezept direkt auf die Einkaufsliste. Steht es schon drauf: Rückfrage (Portionen zusammenzählen, ändern, abbrechen). */
  function aufListe(r, personen, fertig) {
    const da = liste.find((x) => x.id === r.id);
    const gemerkt = (n) => {
      sichern(); zaehlerAktualisieren();
      if (fertig) fertig();
      melden('Auf der Einkaufsliste · ' + mengeText(r, n, true), '#/einkauf', 'Ansehen');
    };
    personen = pFuer(r, personen);
    if (!da) { liste.push({ uid: uid(), id: r.id, personen }); gemerkt(personen); return; }
    const summe = pFuer(r, da.personen + personen);
    const m = (n) => esc(mengeText(r, n, true));
    const b = blattAuf('Schon auf der Einkaufsliste');
    b.zeigen(`
      <p><strong>${esc(r.titel)}</strong> steht schon mit <strong>${m(da.personen)}</strong> auf der Einkaufsliste.</p>
      <div class="sg-wahl">
        ${summe > da.personen ? `<button type="button" class="knopf wahl-knopf" data-al="summe">${svg('plus')}<span><strong>Auf ${m(summe)} erhöhen</strong>
          <small>${m(da.personen)} + ${m(personen)} – zum Beispiel für zwei Mahlzeiten</small></span></button>` : ''}
        ${personen !== da.personen ? `<button type="button" class="knopf wahl-knopf" data-al="ersetzen">${svg('personen')}<span><strong>Auf ${m(personen)} ändern</strong>
          <small>Statt ${m(da.personen)}</small></span></button>` : ''}
      </div>`,
    '<button type="button" class="knopf leise" data-blatt-zu>So lassen</button><a class="knopf" href="#/einkauf">Einkaufsliste</a>');
    b.el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-al]');
      if (!k) return;
      da.personen = k.dataset.al === 'summe' ? summe : personen;
      b.schliessen();
      gemerkt(da.personen);
    });
  }
  /**
   * Rezept in den Wochenplan (tag '' = ohne Tag). Steht es dort am selben Tag schon offen: Rückfrage mit Tageswahl
   * (an anderen Tagen ist dasselbe Rezept erlaubt). fertig(eintrag) nach dem Einplanen; still = ohne Meldung.
   */
  function einplanen(id, personen, tag, fertig, still) {
    const r = nachId[id];
    const amTag = (t) => plan.filter((e) => e.id === id && !e.gekocht && (e.tag || '') === t);
    const hinzu = (t) => {
      const e = planEintrag(id, personen, t);
      plan.push(e);
      sichern(); zaehlerAktualisieren();
      if (fertig) fertig(e);
      if (!still) melden(r.titel + ' für ' + portionenHTML(e, true).replace(/<[^>]+>/g, '') + ' eingeplant' + (t ? ' (' + t + ')' : ''), '#/plan', 'Plan');
    };
    if (!amTag(tag || '').length) { hinzu(tag || ''); return; }
    const daten = wocheDaten(), heute = heuteTag();
    const schon = amTag(tag || '')[0];
    const b = blattAuf('Schon im Wochenplan', { klasse: 'tag-blatt' });
    b.zeigen(`
      <p class="klein"><strong>${esc(r.titel)}</strong> steht schon im Plan (${esc(tag || 'ohne Tag')}, ${portionenHTML(schon, true)}).
        An welchem Tag zusätzlich einplanen?</p>
      <div class="tag-wahl">${[...TAGE, ''].map((t, i) => {
        const n = amTag(t).length;
        const unter = [t ? daten[i].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : 'noch offen', t === heute ? 'heute' : '', n ? 'schon geplant' : ''].filter(Boolean).join(' · ');
        return `<button type="button" class="knopf tag-knopf${n ? ' schon' : ''}" data-tag-wahl="${t}"><strong>${t || 'Ohne Tag'}</strong><small>${esc(unter)}</small></button>`;
      }).join('')}</div>`,
    '<button type="button" class="knopf leise" data-blatt-zu>Abbrechen</button>');
    b.el.addEventListener('click', (ev) => {
      const k = ev.target.closest('[data-tag-wahl]');
      if (!k) return;
      b.schliessen();
      hinzu(k.dataset.tagWahl);
    });
  }

  // ---------------------------------------------------------------- Kochbuch (alles drucken)
  function seiteKochbuch(q) {
    document.title = 'Kochbuch – Rezepte';
    const personen = begrenzen(q.get('p') || STANDARD_PERSONEN);
    app.innerHTML = `
      <div class="werkzeuge nur-bildschirm">
        <h1>Kochbuch drucken</h1>
        <span class="abstand"></span>
        <label class="inline">Für <input id="kb-p" type="number" min="1" max="30" value="${personen}"> Personen</label>
        <button class="knopf haupt" onclick="window.print()">${svg('drucker')} Alle ${rezepte.length} drucken</button>
      </div>
      <p class="hinweis nur-bildschirm">Jedes Rezept beginnt auf einer neuen Seite.</p>
      ${rezepte.map((r) => rezeptHTML(r, stueckRezept(r) ? r.personen : personen, false)).join('')}`;
    document.getElementById('kb-p').addEventListener('change', (e) => {
      location.hash = '#/kochbuch?p=' + begrenzen(e.target.value);
    });
  }

  // ---------------------------------------------------------------- Mehr (Einstellungen & Seltenes)
  /*
   * Abschnitte und Einträge der Seite #/mehr. Erweiterungen melden sich hier an, statt die Seite umzubauen:
   *
   *   mehrEintrag('darstellung', {
   *     id: 'dunkel',                      // eindeutig; die Zeile bekommt id="mehr-dunkel"
   *     titel: 'Dunkler Modus',
   *     text: 'Folgt sonst dem System',    // optional, kleine Zeile darunter (Text oder Funktion → Text)
   *     icon: 'zahnrad',                   // optional, Name aus assets/icons.js
   *     // a) Link-Zeile mit Pfeil …
   *     href: '#/…',
   *     // b) … oder eigenes Bedienelement rechts (Schalter, Auswahl, Knöpfe):
   *     html: () => '<select>…</select>',  // wird bei jedem Öffnen der Seite neu erzeugt
   *     binden: (zeile) => { … },          // danach aufgerufen; zeile = <li> des Eintrags
   *   });
   *
   * Reihenfolge = Reihenfolge der Anmeldung; gleiche id ersetzt den Eintrag. Leere Abschnitte bleiben unsichtbar.
   * Neuer Abschnitt: mehrAbschnitt('einkauf', 'Einkaufen') – steht vor „Daten“ (immer zuletzt).
   * Von außen (eigene Datei, nach app.js geladen): RezeptApp.mehrEintrag(…).
   */
  const MEHR = [
    { id: 'drucken', titel: 'Drucken', eintraege: [] },
    { id: 'kochen', titel: 'Kochen', eintraege: [] },
    { id: 'darstellung', titel: 'Darstellung', eintraege: [] },
    { id: 'daten', titel: 'Daten', eintraege: [] },
  ];
  function mehrAbschnitt(id, titel) {
    if (!MEHR.some((a) => a.id === id)) MEHR.splice(MEHR.findIndex((a) => a.id === 'daten'), 0, { id, titel, eintraege: [] });
  }
  function mehrEintrag(abschnitt, eintrag) {
    const a = MEHR.find((x) => x.id === abschnitt);
    if (!a) throw new Error('Unbekannter Abschnitt in „Mehr“: ' + abschnitt);
    const i = a.eintraege.findIndex((e) => e.id === eintrag.id);
    if (i >= 0) a.eintraege[i] = eintrag; else a.eintraege.push(eintrag);
    if (document.body.dataset.seite === 'mehr') zeichnen();
  }

  mehrEintrag('drucken', {
    id: 'kochbuch', titel: 'Kochbuch drucken', icon: 'drucker', href: '#/kochbuch',
    text: () => `Alle ${rezepte.length} Rezepte, jedes auf einer eigenen Seite`,
  });
  mehrEintrag('kochen', {
    id: 'timer-ton', titel: 'Timer-Ton testen', icon: 'glocke', text: 'Am iPhone: Stummschalter aus, Lautstärke hoch',
    html: () => `<button type="button" class="knopf">${svg('start')} Abspielen</button>`,
    binden: (zeile) => zeile.querySelector('button').addEventListener('click', () => Timer.testen()),
  });
  mehrAbschnitt('einkauf', 'Einkaufen');
  mehrEintrag('einkauf', {
    id: 'ladenfolge', titel: 'Reihenfolge im Laden', icon: 'korb',
    text: () => (ladenfolge ? 'Eigene: ' : 'Standard: ') + kategorienFolge().slice(0, 3).join(' → ') + ' …',
    html: () => `<button type="button" class="knopf">Ändern</button>`,
    binden: (zeile) => zeile.querySelector('button').addEventListener('click', ladenfolgeBlatt),
  });
  mehrAbschnitt('haushalt', 'Haushalt');
  mehrEintrag('haushalt', {
    id: 'profile', titel: 'Personen & Portionen', icon: 'personen', text: () => haushaltText(),
    html: () => `<button type="button" class="knopf">${profile.length ? 'Ändern' : 'Anlegen'}</button>`,
    binden: (zeile) => zeile.querySelector('button').addEventListener('click', haushaltBlatt),
  });

  // ---------------------------------------------------------------- Darstellung (hell / dunkel)
  // speicher 'darstellung' = 'auto' | 'hell' | 'dunkel'; angewendet vom kleinen Script im <head> (index.html)
  const DARSTELLUNGEN = [['auto', 'Automatisch (System)', 'Folgt der Einstellung des Geräts'], ['hell', 'Hell', 'Immer hell'], ['dunkel', 'Dunkel', 'Immer dunkel']];
  const darstellung = () => { const w = speicher.lesen('darstellung', 'auto'); return DARSTELLUNGEN.some((d) => d[0] === w) ? w : 'auto'; };
  const darstellungAnwenden = () => { if (window.darstellungAnwenden) window.darstellungAnwenden(); };
  mehrEintrag('darstellung', {
    id: 'farbschema', titel: 'Farbschema', icon: 'mond',
    text: () => DARSTELLUNGEN.find((d) => d[0] === darstellung())[2] + ' · Druck immer hell',
    html: () => `<select id="farbschema" aria-label="Farbschema">${DARSTELLUNGEN.map(([id, name]) => `<option value="${id}"${id === darstellung() ? ' selected' : ''}>${name}</option>`).join('')}</select>`,
    binden: (zeile) => zeile.querySelector('select').addEventListener('change', (e) => {
      speicher.schreiben('darstellung', e.target.value);
      darstellungAnwenden();
      zeile.querySelector('small').textContent = DARSTELLUNGEN.find((d) => d[0] === darstellung())[2] + ' · Druck immer hell';
    }),
  });

  // ---------------------------------------------------------------- Daten sichern / wiederherstellen
  // Sicherung = JSON mit allen localStorage-Schlüsseln 'rezepte.*' (ohne laufende Timer und das Sicherungsdatum).
  // speicher 'sicherung' = {zuletzt: 'JJJJ-MM-TT' | undefined, seit: erster Start mit dieser Funktion}
  const SICHERUNG_VERSION = 1;
  const NICHT_SICHERN = ['rezepte.timer', 'rezepte.sicherung'];
  const SICHERUNG_ERINNERN_TAGE = 30;
  const sicherungStand = () => { const v = speicher.lesen('sicherung', {}); return istObjekt(v) ? v : {}; };
  if (!sicherungStand().seit) speicher.schreiben('sicherung', Object.assign(sicherungStand(), { seit: heuteISO() }));
  /** Gibt es überhaupt eigene Daten, die verloren gehen könnten? */
  const hatDaten = () => !!(plan.length || liste.length || extras.length || zuhause.length || favoriten.length || profile.length ||
    Object.keys(bewertung).length || Object.keys(notizen).length || Object.keys(gekocht).length);
  const sicherungFaellig = () => { const s = sicherungStand(); return hatDaten() && tageSeit(s.zuletzt || s.seit) >= SICHERUNG_ERINNERN_TAGE; };

  /** Alle eigenen Daten aus localStorage: {'rezepte.plan': […], …} */
  function eigeneDaten() {
    const d = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('rezepte.') || NICHT_SICHERN.includes(k)) continue;
        try { d[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { /* kein JSON: nicht von uns */ }
      }
    } catch (e) { /* kein Zugriff */ }
    return d;
  }
  async function sicherungErstellen() {
    notizenJetzt(); sichern();
    const text = JSON.stringify({ app: 'Rezepte', version: SICHERUNG_VERSION, erstellt: new Date().toISOString(), appStand: APP_STAND, daten: eigeneDaten() }, null, 1);
    const name = 'rezepte-sicherung-' + heuteISO() + '.json';
    const fertig = () => {
      speicher.schreiben('sicherung', Object.assign(sicherungStand(), { zuletzt: heuteISO() }));
      if (document.body.dataset.seite === 'mehr') zeichnen();
    };
    // iPhone/iPad: Teilen-Menü („In Dateien sichern“, Nachricht, Mail …); sonst normaler Download
    let datei = null;
    try { datei = new File([text], name, { type: 'application/json' }); } catch (e) { /* alter Browser */ }
    const beruehrung = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (datei && beruehrung && navigator.canShare && navigator.canShare({ files: [datei] })) {
      try { await navigator.share({ files: [datei], title: 'Rezepte – Sicherung' }); fertig(); melden('Sicherung erstellt'); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }   // abgebrochen; andere Fehler: Download versuchen
    }
    herunterladen(name, text, 'application/json');
    fertig();
    melden('Sicherung „' + name + '“ heruntergeladen');
  }

  /** Text einer Sicherungsdatei prüfen → {daten, erstellt, verworfen}; wirft Error mit verständlicher Meldung */
  const SICHERUNG_TYPEN = { plan: 'liste', liste: 'liste', extras: 'liste', zuhause: 'liste', profile: 'liste', favoriten: 'liste',
    abgehakt: 'objekt', gekocht: 'objekt', bewertung: 'objekt', notizen: 'objekt', kochen: 'objekt', vorschlag: 'objekt' };
  function sicherungPruefen(text) {
    let j;
    try { j = JSON.parse(text); } catch (e) { throw new Error('Die Datei lässt sich nicht lesen – ist es wirklich eine Sicherung (.json) dieser App?'); }
    if (!istObjekt(j) || j.app !== 'Rezepte' || !istObjekt(j.daten)) throw new Error('Diese Datei ist keine Sicherung der Rezepte-App.');
    if (Number(j.version) > SICHERUNG_VERSION) throw new Error('Die Sicherung stammt aus einer neueren Version der App. Bitte die App neu laden und es nochmal versuchen.');
    const daten = {};
    let verworfen = 0;
    for (const [k, v] of Object.entries(j.daten)) {
      if (!k.startsWith('rezepte.') || NICHT_SICHERN.includes(k)) continue;
      const typ = SICHERUNG_TYPEN[k.slice(8)];
      if ((typ === 'liste' && !Array.isArray(v)) || (typ === 'objekt' && !istObjekt(v))) { verworfen++; continue; }
      daten[k] = v;
    }
    if (!Object.keys(daten).length) throw new Error('Die Sicherung enthält keine Daten.');
    return { daten, erstellt: j.erstellt, verworfen };
  }
  /** Kurzer Inhalt für die Vorschau: ['Wochenplan 5', 'Zuhause 14', …] */
  function inhaltText(d) {
    const n = (k) => { const v = d['rezepte.' + k]; return Array.isArray(v) ? v.length : istObjekt(v) ? Object.keys(v).length : 0; };
    const gk = istObjekt(d['rezepte.gekocht']) ? Object.values(d['rezepte.gekocht']).reduce((a, l) => a + (Array.isArray(l) ? l.length : 0), 0) : 0;
    const teile = [['Wochenplan', n('plan')], ['Einkaufsliste', n('liste'), n('liste') === 1 ? ' Rezept' : ' Rezepte'], ['eigene Einträge', n('extras')],
      ['Zuhause', n('zuhause')], ['Favoriten', n('favoriten')], ['Bewertungen', n('bewertung')], ['Notizen', n('notizen')],
      ['gekocht', gk, '×'], ['Haushalt', n('profile'), n('profile') === 1 ? ' Person' : ' Personen']]
      .filter((t) => t[1]).map(([name, zahl, einheit]) => name + ' ' + zahl + (einheit || ''));
    if (d['rezepte.ladenfolge'] || d['rezepte.darstellung']) teile.push('Einstellungen');
    return teile.length ? teile : ['keine eigenen Daten'];
  }

  // Zusammenführen: Listen ohne Doppelte vereinigen; bei Werten je Rezept (Bewertung, Notiz …) gilt der vorhandene
  const vereinigen = (a, b, ...schluessel) => {
    const l = Array.isArray(a) ? a.slice() : [];
    for (const x of Array.isArray(b) ? b : []) if (!l.some((y) => schluessel.some((s) => s(x) != null && s(x) === s(y)))) l.push(x);
    return l;
  };
  const ergaenzen = (a, b) => Object.assign({}, istObjekt(b) ? b : {}, istObjekt(a) ? a : {});
  const ZUSAMMEN = {
    plan: (a, b) => vereinigen(a, b, (e) => e && e.uid, (e) => e && [e.id, e.tag, e.gekocht || ''].join('|')),
    liste: (a, b) => vereinigen(a, b, (e) => e && e.uid, (e) => e && e.id + '|' + e.personen),
    extras: (a, b) => vereinigen(a, b, (x) => x && x.uid, (x) => x && Zutaten.normal(x.text)),
    zuhause: (a, b) => vereinigen(a, b, (x) => x && Zutaten.normal(x.name)),
    profile: (a, b) => vereinigen(a, b, (p) => p && p.uid, (p) => p && p.name),
    favoriten: (a, b) => vereinigen(a, b, (id) => id),
    abgehakt: ergaenzen, bewertung: ergaenzen, notizen: ergaenzen, kochen: ergaenzen,
    gekocht: (a, b) => {
      const g = ergaenzen(a, {});
      for (const [id, l] of Object.entries(istObjekt(b) ? b : {})) {
        if (!Array.isArray(l)) continue;
        const hier = (g[id] || []).slice();
        // je Tag die größere Anzahl behalten (zweimal am selben Tag gekocht bleibt zweimal)
        for (const d of new Set(l)) {
          const fehlt = l.filter((x) => x === d).length - hier.filter((x) => x === d).length;
          for (let i = 0; i < fehlt; i++) hier.push(d);
        }
        g[id] = hier.sort().slice(-GEKOCHT_MAX);
      }
      return g;
    },
    vorschlag: (a, b) => {
      a = istObjekt(a) ? a : {}; b = istObjekt(b) ? b : {};
      const verlauf = vereinigen(a.verlauf, b.verlauf, (x) => x && x.id + '|' + x.datum).sort((x, y) => String(x.datum).localeCompare(String(y.datum)));
      return { wuensche: a.wuensche || b.wuensche || {}, verlauf: verlauf.slice(-VS_VERLAUF_MAX) };
    },
  };
  function zusammenfuehren(alt, neu) {
    const d = Object.assign({}, alt);
    for (const [k, v] of Object.entries(neu)) {
      const f = ZUSAMMEN[k.slice(8)];
      d[k] = f ? f(alt[k], v) : alt[k] != null ? alt[k] : v;
    }
    return d;
  }
  /** art = 'ersetzen' | 'zusammen' */
  function sicherungEinspielen(daten, art) {
    notizenJetzt(); sichern();
    const alt = eigeneDaten();
    const neu = art === 'ersetzen' ? daten : zusammenfuehren(alt, daten);
    try {
      Object.keys(alt).forEach((k) => localStorage.removeItem(k));
      Object.entries(neu).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
    } catch (e) {
      // Speicher voll o. Ä.: alten Stand zurückschreiben
      try { Object.entries(alt).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v))); } catch (e2) { /* nichts mehr zu retten */ }
      melden('Laden fehlgeschlagen – der Speicher des Browsers ist voll oder gesperrt');
      return;
    }
    zustandLesen();
    datenPruefen();
    sichern();
    darstellungAnwenden();
    zeichnen();
    melden(art === 'ersetzen' ? 'Sicherung geladen – Daten ersetzt' : 'Sicherung mit deinen Daten zusammengeführt');
  }
  function sicherungLadenBlatt(text) {
    const b = blattAuf('Sicherung laden');
    let s;
    try { s = sicherungPruefen(text); } catch (e) {
      b.zeigen(`<p class="hinweis fehler">${esc(e.message)}</p><p class="klein">Es wurde nichts verändert.</p>`,
        '<button type="button" class="knopf haupt" data-blatt-zu>OK</button>');
      return;
    }
    const vom = s.erstellt && !isNaN(new Date(s.erstellt)) ? new Date(s.erstellt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    b.zeigen(`
      <p>Sicherung${vom ? ' vom <strong>' + esc(vom) + '</strong>' : ''} enthält:</p>
      <p class="sg-inhalt">${inhaltText(s.daten).map(esc).join(' · ')}</p>
      <p class="klein">Auf diesem Gerät jetzt: ${inhaltText(eigeneDaten()).map(esc).join(' · ')}</p>
      ${s.verworfen ? `<p class="klein hinweis fehler">${s.verworfen} beschädigte Einträge werden übersprungen.</p>` : ''}
      <div class="sg-wahl">
        <button type="button" class="knopf wahl-knopf" data-art="zusammen">${svg('plus')}<span><strong>Zusammenführen</strong>
          <small>Beides behalten: Listen vereinigen, Doppeltes weglassen. Bei Bewertungen und Notizen gilt, was hier schon steht.</small></span></button>
        <button type="button" class="knopf wahl-knopf" data-art="ersetzen">${svg('hochladen')}<span><strong>Ersetzen</strong>
          <small>Alles auf diesem Gerät durch die Sicherung überschreiben.</small></span></button>
      </div>`,
    '<button type="button" class="knopf leise" data-blatt-zu>Abbrechen</button>');
    b.el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-art]');
      if (!k) return;
      b.schliessen();
      sicherungEinspielen(s.daten, k.dataset.art);
    });
  }
  const dateiLesen = (f) => (f.text ? f.text() : new Promise((ok, fehler) => {
    const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = fehler; r.readAsText(f);
  }));
  mehrEintrag('daten', {
    id: 'sichern', titel: 'Sicherung erstellen', icon: 'download',
    text: () => {
      const s = sicherungStand();
      const stand = s.zuletzt ? 'Zuletzt gesichert ' + vorText(tageSeit(s.zuletzt)) : 'Noch nie gesichert';
      return 'Daten liegen nur auf diesem Gerät – regelmäßig sichern. ' + stand + (sicherungFaellig() ? ' – Zeit für eine neue Sicherung.' : '.');
    },
    html: () => `<button type="button" class="knopf${sicherungFaellig() ? ' haupt' : ''}">Sichern</button>`,
    binden: (zeile) => {
      zeile.classList.toggle('faellig', sicherungFaellig());
      zeile.querySelector('button').addEventListener('click', sicherungErstellen);
    },
  });
  mehrEintrag('daten', {
    id: 'laden', titel: 'Sicherung laden', icon: 'hochladen', text: 'Aus einer Datei: ersetzen oder zusammenführen',
    html: () => '<label class="knopf datei-knopf">Laden …<input type="file" accept="application/json,.json"></label>',
    binden: (zeile) => zeile.querySelector('input').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (f) dateiLesen(f).then(sicherungLadenBlatt, () => melden('Datei konnte nicht gelesen werden'));
    }),
  });

  function seiteMehr() {
    document.title = 'Mehr – Rezepte';
    const text = (e) => (typeof e.text === 'function' ? e.text() : e.text);
    const zeile = (e) => {
      const inhalt = `${e.icon ? `<span class="mehr-icon">${svg(e.icon)}</span>` : ''}
        <span class="mehr-text"><strong>${esc(e.titel)}</strong>${text(e) ? `<small>${esc(text(e))}</small>` : ''}</span>`;
      return `<li id="mehr-${esc(e.id)}">${e.href
        ? `<a class="mehr-zeile" href="${esc(e.href)}">${inhalt}<span class="mehr-pfeil">${svg('vor')}</span></a>`
        : `<div class="mehr-zeile">${inhalt}<span class="mehr-steuer">${e.html ? e.html() : ''}</span></div>`}</li>`;
    };
    const stand = new Date(APP_STAND + 'T12:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    app.innerHTML = `
      <div class="werkzeuge"><h1>Mehr</h1></div>
      ${MEHR.filter((a) => a.eintraege.length).map((a) => `
        <section class="mehr-abschnitt" data-abschnitt="${a.id}">
          <h2>${esc(a.titel)}</h2>
          <ul class="mehr-liste">${a.eintraege.map(zeile).join('')}</ul>
        </section>`).join('')}
      <p class="mehr-info klein">${rezepte.length} Rezepte · Version vom ${stand}<br>
        <span class="mehr-offline${navigator.onLine === false ? ' aus' : ''}">${esc(offlineText())}</span><br>
        Wochenplan, Einkaufsliste, Zuhause, Favoriten und Notizen werden nur auf diesem Gerät gespeichert.</p>`;
    MEHR.forEach((a) => a.eintraege.forEach((e) => { if (e.binden) e.binden(document.getElementById('mehr-' + e.id)); }));
  }

  // ---------------------------------------------------------------- Kochmodus
  // #/kochen/<id>?p=<Personen>&s=<Schritt ab 1>: ein Schritt pro Bildschirm, blättern per Wischen, Knöpfen, Pfeiltasten.
  // Fortschritt je Rezept in speicher 'kochen': {id: {s, p, haken: {zutatIndex: true}, zeit}}
  let kochen = speicher.lesen('kochen', {});
  const KOCH_MERKEN = 10;                 // so viele Rezepte behalten ihren Fortschritt
  const KOCH_FRISCH_MS = 24 * 3600e3;     // älterer Fortschritt gilt als erledigt

  const kochStand = (id) => kochen[id] || { s: 1, p: 0, haken: {}, zeit: 0 };
  const kochFrisch = (st) => st.zeit && Date.now() - st.zeit < KOCH_FRISCH_MS;
  function kochenSichern(id, stand) {
    kochen[id] = Object.assign(stand, { zeit: Date.now() });
    Object.keys(kochen).sort((a, b) => kochen[b].zeit - kochen[a].zeit).slice(KOCH_MERKEN).forEach((k) => delete kochen[k]);
    speicher.schreiben('kochen', kochen);
  }

  /** Schritte ohne Abschnitts-Einträge: [{text, abschnitt, nr}] */
  function schrittListe(r) {
    let abschnitt = '';
    const liste = [];
    for (const s of r.schritte || []) {
      if (typeof s === 'object' && s.abschnitt) abschnitt = s.abschnitt;
      else liste.push({ text: String(s), abschnitt, nr: liste.length + 1 });
    }
    return liste;
  }
  /** Attribute für Timer-Chips eines Schritts: Name in der Timer-Leiste und Ziel beim Antippen */
  const timerZiel = (r, nr, personen) =>
    `data-timer-name="${esc(r.titel)}" data-timer-zusatz="Schritt ${nr}" data-timer-link="#/kochen/${esc(r.id)}?p=${personen}&amp;s=${nr}"`;

  // Zutaten ↔ Schritt per Namensabgleich: Wortformen (Zwiebeln/Zwiebel, Walnüsse/Walnusskerne), Zusammensetzungen
  // (Zwiebelwürfel, Salzwasser → Salz), Oberbegriffe (Öl → Pflanzenöl, Brühe → Rinderbrühe) und Wortanfänge
  // (Sesam → Sesamsaat, aber nicht Sesamöl). „ohne Öl“ zählt nicht.
  // Kommt eine Zutat mehrfach vor (Teilmengen: Butter zum Braten / Butter für die Sauce), entscheidet
  //   1. ein Stichwort aus Abschnitt oder Hinweis der Zutat direkt neben der Erwähnung („Sojasauce zum Ablöschen“),
  //   2. sonst der Abschnitt des Schritts („Rahmsauce“ ↔ „Für die Rahmsauce“),
  //   3. sonst die Reihenfolge: das nächste Vorkommen nach dem zuletzt benutzten („restliche Butter“).
  const OBERBEGRIFF_NICHT = ['sauce', 'soße', 'masse', 'teig', 'wasser', 'mischung', 'flüssigkeit'];
  const ohneUmlaut = (w) => w.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
  const woerter = (t) => ohneUmlaut(Zutaten.normal(String(t).replace(/\*\*/g, ''))).replace(/[^a-zß0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  /** Kopfwörter eines Namens: „Rote Linsen“ → linsen, „Haselnusskerne“ → haselnusskerne, haselnuss */
  const kopfwoerter = (name) => {
    const w = woerter(name), k = w[w.length - 1] || '';
    const ohneKerne = k.replace(/kerne?$/, '');
    return ohneKerne !== k && ohneKerne.length >= 4 ? [k, ohneKerne] : [k];
  };
  const gleich = (w, kopf) => { const b = formen(kopf); return formen(w).some((x) => x.length > 1 && b.includes(x)); };
  function zusammengesetzt(w, kopf) {
    if (kopf.length >= 4 && [kopf, kopf.replace(/n$/, '')].some((f) => f.length >= 4 && w.startsWith(f))) return true;
    return (w.length >= 4 || w === 'ol') && !OBERBEGRIFF_NICHT.includes(w) && kopf.length > w.length && kopf.endsWith(w);
  }
  // Wortanfang: „Sesam“ passt zu Sesamsaat, nicht zu Sesamöl (der Rest „öl“ ist selbst eine Zutat)
  let zutatWoerter = null;
  function wortanfang(w, kopf) {
    if (w.length < 5 || kopf.length <= w.length || !kopf.startsWith(w)) return false;
    if (!zutatWoerter) zutatWoerter = new Set(Object.keys(Zutaten.LEXIKON).filter((k) => !k.includes(' ')).map(ohneUmlaut));
    return !zutatWoerter.has(kopf.slice(w.length));
  }
  const STICH_NICHT = new Set(['fur', 'zum', 'zur', 'den', 'die', 'das', 'dem', 'der', 'und', 'oder', 'mit', 'etwas', 'plus', 'nach',
    'belieben', 'frisch', 'fein', 'grob', 'ganz', 'aus', 'vom', 'von', 'auf', 'beim', 'nicht', 'dose', 'glas']);
  const stichwoerter = (t) => woerter(t || '').filter((w) => w.length >= 4 && !STICH_NICHT.has(w));
  const passtStich = (a, b) => gleich(a, b) || (Math.min(a.length, b.length) >= 5 && (a.endsWith(b) || b.endsWith(a)));
  function schrittZutaten(r, schritte) {
    let abschnitt = '';
    const zut = [];
    (r.zutaten || []).forEach((z, i) => {
      if (z.abschnitt) abschnitt = z.abschnitt;
      else zut.push({ z, i, k: Zutaten.normal(z.name), stich: [...stichwoerter(abschnitt), ...stichwoerter(z.hinweis)] });
    });
    const koepfe = zut.map((x) => [x.z.name, x.z.mehrzahl].filter(Boolean).flatMap(kopfwoerter));
    const gruppe = {};
    zut.forEach((x) => { (gruppe[x.k] = gruppe[x.k] || []).push(x); });
    // Stichwörter, die alle Vorkommen einer Zutat haben, unterscheiden nichts
    for (const g of Object.values(gruppe)) {
      if (g.length < 2) continue;
      const gemeinsam = g[0].stich.filter((w) => g.every((x) => x.stich.includes(w)));
      g.forEach((x) => { x.stich = x.stich.filter((w) => !gemeinsam.includes(w)); });
    }
    const zuletzt = {};
    return schritte.map((s) => {
      const ws = woerter(s.text), abs = stichwoerter(s.abschnitt);
      const treffer = new Map();     // k -> {fest: Set(i), offen}
      for (const [n, w] of ws.entries()) {
        if (ws[n - 1] === 'ohne') continue;
        let gef = zut.filter((x, j) => koepfe[j].some((k) => gleich(w, k)));
        // Zusammensetzungen nur, wenn das Wort nicht selbst eine Zutat ist (Tomatenmark ≠ Tomaten)
        if (!gef.length) gef = zut.filter((x, j) => koepfe[j].some((k) => zusammengesetzt(w, k)));
        if (!gef.length) gef = zut.filter((x, j) => koepfe[j].some((k) => wortanfang(w, k)));
        const umgebung = [...ws.slice(Math.max(0, n - 3), n), ...ws.slice(n + 1, n + 5)];
        for (const k of new Set(gef.map((x) => x.k))) {
          const alle = gruppe[k];
          const t = treffer.get(k) || { fest: new Set(), offen: false };
          treffer.set(k, t);
          if (alle.length === 1) { t.fest.add(alle[0].i); continue; }
          const nah = alle.filter((x) => x.stich.some((sw) => umgebung.some((u) => passtStich(u, sw))));
          const imAbschnitt = alle.filter((x) => x.stich.some((sw) => abs.some((u) => passtStich(u, sw))));
          const wahl = nah.length ? nah : imAbschnitt;
          if (wahl.length) wahl.forEach((x) => t.fest.add(x.i)); else t.offen = true;
        }
      }
      const ergebnis = [];
      for (const [k, t] of treffer) {
        const alle = gruppe[k];
        let ids = [...t.fest];
        if (!ids.length) ids = [alle[Math.min((zuletzt[k] == null ? -1 : zuletzt[k]) + 1, alle.length - 1)].i];
        zuletzt[k] = Math.max(...ids.map((i) => alle.findIndex((x) => x.i === i)));
        ergebnis.push(...ids);
      }
      return [...new Set(ergebnis)].sort((a, b) => a - b);
    });
  }

  // Bildschirm anlassen (Screen Wake Lock API); ohne Unterstützung still ignorieren
  const wach = {
    an: false, sperre: null,
    async anfordern() {
      if (!this.an || this.sperre || document.visibilityState !== 'visible' || !navigator.wakeLock) return;
      try {
        this.sperre = await navigator.wakeLock.request('screen');
        this.sperre.addEventListener('release', () => { this.sperre = null; });
        if (!this.an) this.freigeben();   // inzwischen verlassen
      } catch (e) { this.sperre = null; }
    },
    starten() { this.an = true; this.anfordern(); },
    freigeben() { if (this.sperre) { this.sperre.release().catch(() => {}); this.sperre = null; } },
    beenden() { this.an = false; this.freigeben(); },
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wach.anfordern(); });

  /** Ziel für „Jetzt kochen“ / „Weiterkochen“: {href, weiter, s, n} (n = 0: Rezept ohne Schritte) */
  function kochZiel(r, personen) {
    const st = kochStand(r.id);
    const weiter = kochFrisch(st) && st.s > 1;
    return { href: `#/kochen/${esc(r.id)}?p=${personen}&amp;s=${weiter ? st.s : 1}`, weiter, s: st.s, n: schrittListe(r).length };
  }
  function kochKnopfHTML(r, personen) {
    const k = kochZiel(r, personen);
    if (!k.n) return '';
    const zuletzt = gekochtHilfe.zuletzt(r.id), oft = gekochtHilfe.daten(r.id).length;
    return `
      <div class="koch-zeile nur-bildschirm">
        <a class="knopf haupt koch-knopf" href="${k.href}">${svg('topf')} <span>${k.weiter ? 'Weiterkochen' : 'Jetzt kochen'}</span></a>
        <span class="klein">${k.weiter ? `bei Schritt ${k.s} von ${k.n}` : `Schritt für Schritt · ${k.n} Schritte · Bildschirm bleibt an`}</span>
        <span class="koch-gekocht">
          ${zuletzt ? `<button type="button" class="link-knopf klein gekocht-verlauf" data-gekocht-verlauf title="Koch-Verlauf ansehen">Zuletzt gekocht: ${vorText(tageSeit(zuletzt))} · ${oft}× gekocht</button>` : ''}
          <button type="button" class="knopf leise" data-gekocht-knopf title="Als gekocht merken, Verbrauchtes aus „Zuhause“ nehmen">${svg('haken')} Gekocht</button>
        </span>
      </div>`;
  }
  /** Fester Knopf unten am Handy: „Jetzt kochen“ + „Auf Einkaufsliste“ (über Tab- und Timer-Leiste) */
  function aktionHTML(r, personen) {
    const k = kochZiel(r, personen);
    return `
      <div class="r-aktion nur-bildschirm">
        ${k.n ? `<a class="knopf haupt koch-knopf ra-kochen" href="${k.href}">${svg('topf')} <span>${k.weiter ? 'Weiterkochen' : 'Jetzt kochen'}</span>${k.weiter ? `<small>Schritt ${k.s}/${k.n}</small>` : ''}</a>` : ''}
        <button type="button" class="knopf ra-liste" data-zur-liste aria-label="Zutaten auf die Einkaufsliste">${svg('korb')} <span>Einkaufsliste</span></button>
      </div>`;
  }

  function seiteKochen(r, q) {
    const schritte = schrittListe(r);
    const alt = kochStand(r.id);
    const frisch = kochFrisch(alt);
    const stand = {
      p: pFuer(r, q.get('p') || (frisch && alt.p) || r.personen || STANDARD_PERSONEN),
      s: Math.min(schritte.length, Math.max(1, Math.round(Number(q.get('s'))) || (frisch && alt.s) || 1)),
      haken: frisch ? alt.haken || {} : {},
    };
    const zuSchritt = schrittZutaten(r, schritte);
    const zutatenAlle = (r.zutaten || []).map((z, i) => ({ z, i }));
    const anzahlZutaten = zutatenAlle.filter((x) => !x.z.abschnitt).length;
    const zurueck = () => '#/rezept/' + r.id + '?p=' + stand.p;
    document.title = 'Kochen: ' + r.titel + ' – Rezepte';

    app.innerHTML = `
      <section class="kochmodus" aria-label="Kochmodus">
        <header class="km-kopf">
          <a class="knopf leise icon-knopf km-zu" id="km-zu" href="${zurueck()}" data-zurueck aria-label="Kochmodus beenden">${svg('schliessen')}</a>
          <strong class="km-titel">${esc(r.titel)}</strong>
          <button type="button" class="knopf leise icon-knopf km-notiz-knopf" id="km-notiz" aria-label="Meine Notizen" title="Meine Notizen">${svg('notiz')}<span class="punkt" hidden></span></button>
          <button type="button" class="knopf km-zut-knopf" id="km-zut-auf" aria-expanded="false" aria-controls="km-zutaten">${svg('liste')} <span>Zutaten</span> <span class="km-zut-zahl" id="km-zut-zahl"></span></button>
        </header>
        <div class="km-fortschritt" aria-hidden="true"><span id="km-balken"></span></div>
        <div class="km-buehne" id="km-buehne" aria-live="polite"></div>
        <nav class="km-fuss" aria-label="Schritte">
          <button type="button" class="knopf km-zurueck" id="km-zurueck">${svg('zurueck')} Zurück</button>
          <button type="button" class="knopf haupt km-weiter" id="km-weiter"></button>
        </nav>
        <div class="km-zutaten" id="km-zutaten" hidden></div>
      </section>`;

    const $ = (id) => document.getElementById(id);
    const faktor = () => stand.p / (r.personen || STANDARD_PERSONEN);
    const zutatKnopf = (i, klasse) => {
      const z = r.zutaten[i], t = zutatText(z, faktor());
      return `<button type="button" class="${klasse}${stand.haken[i] ? ' an' : ''}" data-z="${i}" aria-pressed="${!!stand.haken[i]}">
          <span class="box">${svg('haken')}</span>
          <span class="km-z-menge">${esc(t.menge)}</span>
          <span class="km-z-name">${esc(t.name)}${z.optional ? ' <em>(optional)</em>' : ''}${z.hinweis ? `<small>${esc(z.hinweis)}</small>` : ''}</span>
        </button>`;
    };

    function zeigen(richtung) {
      const sch = schritte[stand.s - 1];
      const zut = zuSchritt[stand.s - 1];
      $('km-buehne').innerHTML = `
        <div class="km-schritt${richtung ? ' km-' + richtung : ''}" ${timerZiel(r, sch.nr, stand.p)}>
          <div class="km-ort"><span class="km-abschnitt">${esc(sch.abschnitt)}</span><span class="km-zaehler">${sch.nr} / ${schritte.length}</span></div>
          ${stand.s === 1 && notizVon(r.id) ? `<button type="button" class="km-notiz" data-notiz-auf>${svg('notiz')}<span><strong>Meine Notiz</strong>${esc(notizVon(r.id))}</span></button>` : ''}
          <p class="km-text">${Timer.chips(fett(sch.text))}</p>
          ${zut.length ? `<div class="km-dafuer"><h3>Dafür</h3><ul>${zut.map((i) => `<li>${zutatKnopf(i, 'km-z')}</li>`).join('')}</ul></div>` : ''}
        </div>`;
      if (richtung) $('km-buehne').scrollTop = 0;
      $('km-balken').style.width = (stand.s / schritte.length * 100) + '%';
      $('km-zurueck').disabled = stand.s <= 1;
      const letzter = stand.s >= schritte.length;
      $('km-weiter').innerHTML = letzter ? svg('haken') + ' Fertig' : 'Weiter ' + svg('vor');
      $('km-weiter').classList.toggle('fertig', letzter);
      zahlZeigen();
      app.querySelector('#km-notiz .punkt').hidden = !notizVon(r.id);
      adresseSetzen('#/kochen/' + r.id + '?p=' + stand.p + '&s=' + stand.s);
      kochenSichern(r.id, stand);
      Timer.markieren();
    }
    function zahlZeigen() {
      const n = Object.keys(stand.haken).filter((i) => r.zutaten[i] && !r.zutaten[i].abschnitt).length;
      $('km-zut-zahl').textContent = n + '/' + anzahlZutaten;
    }
    function blaettern(d) {
      const neu = stand.s + d;
      if (neu < 1 || neu > schritte.length) return;
      stand.s = neu;
      zeigen(d > 0 ? 'vor' : 'rueck');
    }
    function fertig() {
      delete kochen[r.id];
      speicher.schreiben('kochen', kochen);
      nachDemZeichnen = () => kochenAbschliessen(r, null, 'Guten Appetit!');
      location.hash = zurueck();
    }

    // Gesamt-Zutatenliste zum Abhaken („schon im Topf“), mit Personenzahl
    function listeZeigen() {
      $('km-zutaten').innerHTML = `
        <div class="km-zl-kopf">
          <h2>Zutaten</h2>
          <span class="stepper">
            <button type="button" data-kp="-1" aria-label="Weniger" ${stand.p <= pSchritt(r) ? 'disabled' : ''}>${svg('minus')}</button>
            <strong>${stueckRezept(r) ? Einheiten.zahlText(stueckZahl(r, stand.p)) : stand.p}</strong>
            <button type="button" data-kp="1" aria-label="Mehr" ${stand.p + pSchritt(r) > 30 ? 'disabled' : ''}>${svg('plus')}</button>
          </span>
          <span class="klein">${stueckRezept(r) ? esc(r.ergibt.einheit) : stand.p === 1 ? 'Person' : 'Personen'}</span>
          <span class="abstand"></span>
          <button type="button" class="knopf leise icon-knopf" data-zl-zu aria-label="Zutatenliste schließen">${svg('schliessen')}</button>
        </div>
        <p class="klein">Antippen, was schon im Topf ist. <button type="button" class="link-knopf" data-zl-reset>Haken zurücksetzen</button></p>
        <ul class="km-zl">${zutatenAlle.map((x) => x.z.abschnitt
          ? `<li class="abschnitt">${esc(x.z.abschnitt)}</li>`
          : `<li>${zutatKnopf(x.i, 'km-zl-z')}</li>`).join('')}</ul>`;
    }
    function listeAuf(auf) {
      if (auf) listeZeigen();
      $('km-zutaten').hidden = !auf;
      $('km-zut-auf').setAttribute('aria-expanded', String(auf));
      $('km-zut-auf').classList.toggle('an', auf);
    }

    $('km-zurueck').addEventListener('click', () => blaettern(-1));
    $('km-weiter').addEventListener('click', () => (stand.s >= schritte.length ? fertig() : blaettern(1)));
    $('km-zut-auf').addEventListener('click', () => listeAuf($('km-zutaten').hidden));
    let offen = true;              // false nach dem Verlassen (Blatt schließt evtl. erst danach)
    const notizAuf = () => notizBlatt(r, () => { if (offen) zeigen(); });
    $('km-notiz').addEventListener('click', notizAuf);
    app.querySelector('.kochmodus').addEventListener('click', (e) => {
      const z = e.target.closest('[data-z]');
      if (z) {
        const i = z.dataset.z;
        if (stand.haken[i]) delete stand.haken[i]; else stand.haken[i] = true;
        app.querySelectorAll(`[data-z="${i}"]`).forEach((b) => { b.classList.toggle('an', !!stand.haken[i]); b.setAttribute('aria-pressed', String(!!stand.haken[i])); });
        kochenSichern(r.id, stand); zahlZeigen();
      } else if (e.target.closest('[data-notiz-auf]')) notizAuf();
      else if (e.target.closest('[data-zl-zu]')) listeAuf(false);
      else if (e.target.closest('[data-zl-reset]')) { stand.haken = {}; kochenSichern(r.id, stand); listeZeigen(); zeigen(); }
      else if (e.target.closest('[data-kp]')) {
        stand.p = pFuer(r, stand.p + Number(e.target.closest('[data-kp]').dataset.kp) * pSchritt(r));
        $('km-zu').setAttribute('href', zurueck());
        listeZeigen(); zeigen();
      }
    });

    // Wischen: waagerecht deutlich mehr als senkrecht
    let start = null;
    const buehne = $('km-buehne');
    buehne.addEventListener('touchstart', (e) => {
      start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    buehne.addEventListener('touchend', (e) => {
      if (!start) return;
      const t = e.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) blaettern(dx < 0 ? 1 : -1);
    }, { passive: true });

    const tasten = (e) => {
      if (blatt || e.target.closest('input, select, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); blaettern(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); blaettern(-1); }
      else if (e.key === 'Escape') { if (!$('km-zutaten').hidden) listeAuf(false); else location.hash = zurueck(); }
    };
    document.addEventListener('keydown', tasten);
    wach.starten();
    verlassen = () => { offen = false; document.removeEventListener('keydown', tasten); wach.beenden(); };
    zeigen();
  }

  /** Notizen im Kochmodus ansehen/ändern */
  function notizBlatt(r, nachher) {
    const b = blattAuf('Meine Notizen', { zu: () => { notizenJetzt(); if (nachher) nachher(); } });
    b.zeigen(`
      <p class="klein">${esc(r.titel)} – was du dir fürs nächste Mal merken willst. Wird automatisch gespeichert.</p>
      <textarea class="notiz-feld" id="notiz-blatt" rows="4" maxlength="${NOTIZ_MAX}" placeholder="z. B. nächstes Mal weniger Salz" aria-label="Meine Notizen">${esc(notizVon(r.id))}</textarea>
      <span class="notiz-status klein" id="notiz-blatt-status" aria-live="polite"></span>`,
    '<button type="button" class="knopf haupt" data-blatt-zu>Fertig</button>');
    notizFeldBinden(b.el.querySelector('#notiz-blatt'), b.el.querySelector('#notiz-blatt-status'), r.id);
  }

  // ---------------------------------------------------------------- Gekocht → Verbrauch aus „Zuhause“
  const gleicherName = (a, b) => { a = Zutaten.normal(a); b = Zutaten.normal(b); return a.startsWith(b) || b.startsWith(a); };
  /** Plan-Eintrag, der beim Kochen abgehakt wird: offener Eintrag des Rezepts, bevorzugt von heute */
  function planFuerGekocht(id) {
    const offen = plan.filter((e) => e.id === id && !e.gekocht);
    return offen.find((e) => e.tag === heuteTag()) || offen.find((e) => !e.tag) || offen[0] || null;
  }
  /** Rezept als gekocht merken, im Plan abhaken (eintrag = bestimmter Plan-Eintrag) und nach Verbrauchtem fragen */
  function kochenAbschliessen(r, eintrag, gruss) {
    gekochtHilfe.merken(r.id);
    const e = eintrag || planFuerGekocht(r.id);
    if (e) e.gekocht = heuteISO();
    sichern();
    zeichnen();
    const text = (gruss ? gruss + ' ' : '') + 'Als gekocht gemerkt' + (e ? ', im Wochenplan abgehakt' : '');
    // Zuhause-Einträge, die zu Zutaten des Rezepts passen (jeder nur einmal); Grundvorrat nicht vorab angehakt
    const treffer = [];
    for (const z of nurZutaten(r)) {
      const x = !Zutaten.info(z).nie && istZuhause(z.name);
      if (!x || treffer.some((t) => t.x === x)) continue;
      const vorrat = Zutaten.info(z).vorrat || Zutaten.info({ name: x.name }).vorrat;
      treffer.push({ x, z, vorrat });
    }
    if (!treffer.length) { melden(text); return; }
    const b = blattAuf('Verbrauchte Zutaten aus Zuhause entfernen?');
    b.zeigen(`
      <p class="klein">${esc(text)}. Angehakte Zutaten werden aus deiner Zuhause-Liste genommen –
        Grundvorrat wie Salz, Öl und Gewürze ist nicht angehakt.</p>
      <ul class="vb-liste">${treffer.map((t, i) => `
        <li><label class="haken-zeile"><input type="checkbox" data-i="${i}" ${t.vorrat ? '' : 'checked'}><span class="box">${svg('haken')}</span>
          <span>${esc(t.x.name)}${!gleicherName(t.x.name, t.z.name) ? `<small>für ${esc(t.z.name)}</small>` : ''}</span>
          ${t.vorrat ? '<span class="merkmal">Vorrat</span>' : ''}</label></li>`).join('')}</ul>`,
    `<button type="button" class="knopf leise" data-blatt-zu>Nichts entfernen</button>
     <button type="button" class="knopf haupt" id="vb-ok">${svg('muell')} <span>Entfernen</span></button>`);
    const knopf = b.el.querySelector('#vb-ok');
    const zaehlen = () => {
      const n = b.el.querySelectorAll('.vb-liste input:checked').length;
      knopf.querySelector('span').textContent = n ? n + ' entfernen' : 'Entfernen';
      knopf.disabled = !n;
    };
    b.el.addEventListener('change', zaehlen);
    knopf.addEventListener('click', () => {
      const weg = new Set([...b.el.querySelectorAll('.vb-liste input:checked')].map((c) => treffer[Number(c.dataset.i)].x));
      zuhause = zuhause.filter((x) => !weg.has(x));
      sichern();
      b.schliessen();
      zeichnen();
      melden(weg.size + (weg.size === 1 ? ' Zutat' : ' Zutaten') + ' aus „Zuhause“ entfernt');
    });
    zaehlen();
  }

  /** Verlauf „gekocht“ eines Rezepts, einzelne Tage löschbar */
  function gekochtBlatt(r) {
    let geaendert = false;
    const b = blattAuf('Gekocht', { zu: () => { if (geaendert) zeichnen(); } });
    const zeigen = () => {
      const tage = gekochtHilfe.daten(r.id).reverse();
      b.zeigen(`
        <p class="klein">${esc(r.titel)} – ${tage.length ? tage.length + '× gekocht' : 'noch nie gekocht'}. Versehentlich eingetragen? Mit ${svg('muell')} entfernen.</p>
        <ul class="gk-liste">${tage.map((d, i) => `
          <li><span>${new Date(d + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            <small>${vorText(tageSeit(d))}</small></span>
            <button type="button" class="knopf leise icon-knopf" data-vergessen="${d}" data-f="g${i}" aria-label="Eintrag vom ${datumText(d)} entfernen">${svg('muell')}</button></li>`).join('')}</ul>`,
      '<button type="button" class="knopf haupt" data-blatt-zu>Fertig</button>');
    };
    b.el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-vergessen]');
      if (!k) return;
      gekochtHilfe.vergessen(r.id, k.dataset.vergessen);
      geaendert = true;
      zeigen();
    });
    zeigen();
  }

  // ---------------------------------------------------------------- Wochenplan
  const heuteTag = () => TAGE[(new Date().getDay() + 6) % 7];
  /** „3½ Portionen (Anna, Ben)“ bzw. „4 Personen“ */
  function portionenHTML(e, kurz) {
    const w = werVon(e);
    if (!w.length || stueckRezept(nachId[e.id])) return nachId[e.id] ? esc(mengeText(nachId[e.id], e.personen, kurz)) : `${e.personen} ${kurz ? 'P.' : e.personen === 1 ? 'Person' : 'Personen'}`;
    const n = portionen(e);
    return `${portionText(n)} ${kurz ? 'P.' : n === 1 ? 'Portion' : 'Portionen'}${kurz ? '' : ` <span class="klein">(${w.map((p) => esc(p.name || 'ohne Namen')).join(', ')})</span>`}`;
  }
  /** Chips „Wer isst mit“ (nur mit Profilen) */
  const werChipsHTML = (gewaehlt) => profile.map((p) => `<button type="button" class="chip wer-chip${gewaehlt.includes(p.uid) ? ' aktiv' : ''}" data-wer="${p.uid}" data-f="wer${p.uid}" aria-pressed="${gewaehlt.includes(p.uid)}">${esc(p.name || 'ohne Namen')} <span class="klein">${portionText(p.faktor)}</span></button>`).join('');

  // Kalenderstreifen: Mo–So der laufenden Woche (der Plan selbst kennt nur Wochentage + „Ohne Tag“).
  // Antippen eines Tages zeigt nur dessen Einträge; nochmal antippen oder „Ganze Woche“ zeigt alle.
  let planAuswahl = '';                    // '' = ganze Woche, sonst Tag aus TAGE oder 'ohne'
  /** Datum je Wochentag der laufenden Woche (Mo zuerst) */
  const wocheDaten = () => {
    const d = new Date(), wt = (d.getDay() + 6) % 7;
    return TAGE.map((t, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - wt + i));
  };
  const tagSchluessel = (tag) => tag || 'ohne';
  const tagName = (s) => (s === 'ohne' ? 'Ohne Tag' : s);

  function kalenderHTML() {
    const daten = wocheDaten(), heute = heuteTag();
    const bildchen = (e) => {
      const r = nachId[e.id];
      return `<span class="kal-bild${e.gekocht ? ' gekocht' : ''}">${r.bild ? bildHTML(r, 'klein', 'loading="lazy"') : esc(r.titel.slice(0, 1))}</span>`;
    };
    const ohne = plan.filter((e) => !e.tag);
    const von = daten[0].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
    const bis = daten[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
    return `
      <div class="kal nur-bildschirm">
        <div class="kal-streifen" role="group" aria-label="Diese Woche">
          ${TAGE.map((t, i) => {
            const es = plan.filter((e) => e.tag === t), offen = es.filter((e) => !e.gekocht).length;
            return `<button type="button" class="kal-tag${t === heute ? ' heute' : ''}${planAuswahl === t ? ' aktiv' : ''}${es.length ? ' belegt' : ''}" data-kal="${t}" aria-pressed="${planAuswahl === t}"
              aria-label="${t}${t === heute ? ' (heute)' : ''}: ${es.length ? es.length + (es.length === 1 ? ' Gericht' : ' Gerichte') + (offen < es.length ? ', ' + (es.length - offen) + ' gekocht' : '') : 'nichts geplant'}">
              <span class="kal-name">${t.slice(0, 2)}</span>
              <span class="kal-datum">${daten[i].getDate()}</span>
              <span class="kal-bilder">${es.slice(0, 2).map(bildchen).join('')}${es.length > 2 ? `<span class="kal-mehr">+${es.length - 2}</span>` : ''}</span>
            </button>`;
          }).join('')}
        </div>
        <div class="kal-unter">
          <span class="klein kal-woche">${planAuswahl ? esc(tagName(planAuswahl)) : 'Woche ' + esc(von) + ' – ' + esc(bis)}</span>
          ${ohne.length ? `<button type="button" class="chip${planAuswahl === 'ohne' ? ' aktiv' : ''}" data-kal="ohne" aria-pressed="${planAuswahl === 'ohne'}">Ohne Tag · ${ohne.length}</button>` : ''}
          ${planAuswahl ? '<button type="button" class="chip" data-kal="">Ganze Woche</button>' : ''}
        </div>
      </div>`;
  }

  /** Blatt: Eintrag einem anderen Tag zuordnen */
  function verschiebenBlatt(e) {
    const r = nachId[e.id], daten = wocheDaten(), heute = heuteTag();
    const b = blattAuf('Verschieben', { klasse: 'tag-blatt' });
    b.zeigen(`
      <p class="klein">${esc(r.titel)} – an welchem Tag?</p>
      <div class="tag-wahl">${[...TAGE, ''].map((t, i) => {
        const n = plan.filter((x) => x !== e && (x.tag || '') === t && !x.gekocht).length;
        const unter = [t ? daten[i].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : 'noch offen', t === heute ? 'heute' : '', n ? n + ' geplant' : ''].filter(Boolean).join(' · ');
        const an = (e.tag || '') === t;
        return `<button type="button" class="knopf tag-knopf${an ? ' an' : ''}" data-tag-wahl="${t}" aria-pressed="${an}"><strong>${t || 'Ohne Tag'}</strong><small>${esc(unter)}</small></button>`;
      }).join('')}</div>`,
    '<button type="button" class="knopf leise" data-blatt-zu>Abbrechen</button>');
    b.el.addEventListener('click', (ev) => {
      const k = ev.target.closest('[data-tag-wahl]');
      if (!k) return;
      const neu = k.dataset.tagWahl;
      b.schliessen();
      if ((e.tag || '') === neu) return;
      e.tag = neu;
      sichern(); zeichnen();
      melden(r.titel + (neu ? ' → ' + neu : ' → ohne Tag'));
    });
  }

  function seitePlan() {
    document.title = 'Wochenplan – Rezepte';
    if (planAuswahl === 'ohne' && !plan.some((e) => !e.tag)) planAuswahl = '';
    const gruppen = [...TAGE, ''].map((tag) => ({ tag, eintraege: plan.filter((e) => (e.tag || '') === tag) }))
      .filter((g) => g.eintraege.length);
    const ausgewaehlt = planAuswahl && gruppen.find((g) => tagSchluessel(g.tag) === planAuswahl);

    const zeile = (e) => {
      const r = nachId[e.id];
      const w = werVon(e);
      return `
        <li class="plan-eintrag${e.gekocht ? ' gekocht' : ''}" data-uid="${e.uid}">
          <div class="pe-kopf">
            <button type="button" class="pe-haken nur-bildschirm" data-gekocht aria-pressed="${!!e.gekocht}" aria-label="${e.gekocht ? 'Doch nicht gekocht' : 'Als gekocht abhaken'}" title="${e.gekocht ? 'Doch nicht gekocht' : 'Gekocht'}"><span class="box">${svg('haken')}</span></button>
            ${r.bild ? bildHTML(r, 'klein', 'class="pe-bild nur-bildschirm" loading="lazy"') : ''}
            <a href="#/rezept/${esc(r.id)}?p=${begrenzen(portionen(e))}"><span class="pe-titel">${esc(r.titel)}</span>${e.gekocht ? `<small>gekocht am ${datumText(e.gekocht)}</small>` : ''}</a>
            <button type="button" class="knopf leise icon-knopf pe-weg nur-bildschirm" data-weg aria-label="Entfernen" title="Aus dem Plan nehmen">${svg('muell')}</button>
          </div>
          <div class="pe-steuer">
            <button type="button" class="knopf leise pe-verschieben nur-bildschirm" data-verschieben aria-label="Verschieben – jetzt: ${e.tag || 'ohne Tag'}" title="Anderem Tag zuordnen">${svg('verschieben')} <span>${e.tag ? 'Verschieben' : 'Tag wählen'}</span></button>
            ${w.length && !stueckRezept(r) ? `<span class="pe-portionen">${portionenHTML(e)}</span>` : `
            <span class="stepper">
              <button type="button" data-schritt="-1" aria-label="Weniger" ${e.personen <= pSchritt(r) ? 'disabled' : ''}>${svg('minus')}</button>
              <strong>${stueckRezept(r) ? Einheiten.zahlText(stueckZahl(r, e.personen)) : e.personen}</strong>
              <button type="button" data-schritt="1" aria-label="Mehr" ${e.personen + pSchritt(r) > 30 ? 'disabled' : ''}>${svg('plus')}</button>
            </span>
            <span class="klein">${stueckRezept(r) ? esc(r.ergibt.einheit) : 'Pers.'}</span>`}
          </div>
          ${profile.length && !stueckRezept(r) ? `<div class="chips pe-wer nur-bildschirm" aria-label="Wer isst mit">${werChipsHTML(e.wer || [])}</div>` : ''}
        </li>`;
    };
    const neuFuer = planAuswahl && planAuswahl !== 'ohne' ? planAuswahl : '';

    app.innerHTML = `
      <div class="werkzeuge">
        <h1>Wochenplan</h1>
        <span class="abstand"></span>
        ${plan.length ? `<button class="knopf leise nur-bildschirm" id="plan-leeren">${svg('muell')} Leeren</button>
        <button class="knopf nur-bildschirm" onclick="window.print()">${svg('drucker')} Drucken</button>
        <a class="knopf haupt nur-bildschirm" href="#/einkauf">${svg('korb')} Einkaufsliste</a>` : ''}
      </div>
      ${kalenderHTML()}
      <div class="nur-bildschirm plan-neu">
        <select id="plan-rezept" aria-label="Rezept wählen">
          <option value="">${neuFuer ? 'Rezept für ' + neuFuer + ' hinzufügen …' : 'Rezept hinzufügen …'}</option>
          ${rezepte.map((r) => `<option value="${esc(r.id)}">${esc(r.titel)}</option>`).join('')}
        </select>
        <button type="button" class="knopf${plan.length ? '' : ' haupt'}" id="plan-vorschlag">${svg('funke')} Woche vorschlagen</button>
      </div>
      ${planAuswahl && !ausgewaehlt ? `<p class="leer plan-tag-leer nur-bildschirm">${planAuswahl === heuteTag() ? 'Für heute' : 'Für ' + esc(tagName(planAuswahl))} ist noch nichts geplant – oben ein Rezept auswählen oder <button type="button" class="link-knopf" data-kal="">ganze Woche zeigen</button>.</p>` : ''}
      ${gruppen.length ? gruppen.map((g) => `
        <section class="plan-tag${planAuswahl && tagSchluessel(g.tag) !== planAuswahl ? ' ausgeblendet' : ''}" data-tag="${tagSchluessel(g.tag)}">
          <h2>${g.tag || 'Ohne Tag'}${g.tag === heuteTag() ? ' <span class="klein nur-bildschirm">· heute</span>' : ''}</h2>
          <ul>${g.eintraege.map(zeile).join('')}</ul>
        </section>`).join('') : '<p class="leer">Noch nichts geplant. Rezept oben auswählen, „Woche vorschlagen“ antippen oder in einem Rezept auf „Zum Wochenplan“ tippen.</p>'}
      ${profile.length || !plan.length ? '' : '<p class="klein nur-bildschirm">Tipp: Unter <a href="#/mehr">Mehr → Haushalt</a> Personen mit Portionsgröße anlegen (z. B. Kind ½) – dann hier wählen, wer mitisst.</p>'}`;

    const finde = (el) => plan.find((e) => e.uid === el.closest('[data-uid]').dataset.uid);
    app.querySelectorAll('[data-kal]').forEach((k) => k.addEventListener('click', () => {
      const t = k.dataset.kal;
      planAuswahl = planAuswahl === t ? '' : t;
      zeichnen();
    }));
    app.querySelectorAll('[data-verschieben]').forEach((b) => b.addEventListener('click', () => verschiebenBlatt(finde(b))));
    app.querySelectorAll('[data-schritt]').forEach((b) => b.addEventListener('click', () => {
      const e = finde(b), r = nachId[e.id];
      e.personen = pFuer(r, e.personen + Number(b.dataset.schritt) * pSchritt(r)); sichern(); zeichnen();
    }));
    app.querySelectorAll('[data-weg]').forEach((b) => b.addEventListener('click', () => {
      const e = finde(b); plan = plan.filter((x) => x !== e); sichern(); zeichnen();
    }));
    app.querySelectorAll('[data-wer]').forEach((b) => b.addEventListener('click', () => {
      const e = finde(b), u = b.dataset.wer;
      const vorher = portionen(e);
      e.wer = (e.wer || []).includes(u) ? e.wer.filter((x) => x !== u) : [...(e.wer || []), u];
      if (!werVon(e).length) { delete e.wer; e.personen = begrenzen(vorher); }   // zurück zur Personenzahl
      else e.personen = begrenzen(portionen(e));
      sichern(); zeichnen();
    }));
    app.querySelectorAll('[data-gekocht]').forEach((b) => b.addEventListener('click', () => {
      const e = finde(b);
      if (e.gekocht) { gekochtHilfe.vergessen(e.id, e.gekocht); delete e.gekocht; sichern(); zeichnen(); }
      else kochenAbschliessen(nachId[e.id], e);
    }));
    document.getElementById('plan-rezept').addEventListener('change', (ev) => {
      const r = nachId[ev.target.value];
      ev.target.value = '';
      if (r) einplanen(r.id, 0, neuFuer, zeichnen, true);
    });
    document.getElementById('plan-vorschlag').addEventListener('click', vorschlagBlatt);
    const leeren = document.getElementById('plan-leeren');
    if (leeren) leeren.addEventListener('click', () => {
      if (confirm('Wochenplan wirklich leeren?')) { plan = []; abgehakt = {}; sichern(); zeichnen(); }
    });
  }

  // ---------------------------------------------------------------- Wochenplan-Vorschlag
  // Wünsche (zuletzt benutzte) und angenommene Vorschläge: speicher 'vorschlag' = {wuensche, verlauf: [{id, datum}]}
  const VS_KATEGORIEN = ['Hauptgericht', 'Suppe', 'Salat'];       // Frühstück, Backen, Beilage … nur auf Wunsch
  const VS_ZEITEN = [0, 30, 45, 60];
  const VS_VERLAUF_MAX = 40;
  const vsSpeicher = () => {
    const v = speicher.lesen('vorschlag', {});
    return { wuensche: v.wuensche || {}, verlauf: Array.isArray(v.verlauf) ? v.verlauf : [] };
  };
  const istVeg = (r) => ['vegan', 'vegetarisch'].includes(ernaehrungVon(r).id);
  const istFisch = (r) => ernaehrungVon(r).fisch;
  /** Rollen eines Platzes: welche Rezepte dort passen */
  const ROLLEN = { fisch: istFisch, veg: istVeg, frei: () => true };

  function vsKandidaten(w) {
    return rezepte.filter((r) => {
      const e = ernaehrungVon(r), z = gesamtzeit(r.zeit);
      if (!w.kat.includes(r.kategorie)) return false;
      if (w.zeit && z && z > w.zeit) return false;
      if (w.ohne.includes('fleisch') && e.fleisch) return false;
      if (w.ohne.includes('fisch') && (e.fisch || e.fischzutat)) return false;
      return true;
    });
  }
  /** Je höher, desto lieber: viel zuhause, nicht im Plan, länger nicht gekocht/vorgeschlagen, etwas Zufall */
  function vsWertung(r, verlauf) {
    const zut = nurZutaten(r).filter((z) => z.menge != null && !z.optional && !Zutaten.info(z).nie);
    let w = (zut.length ? 1 - fehlend(r) / zut.length : 0) * 2 + Math.random() * 1.5;
    if (planOffen().some((e) => e.id === r.id)) w -= 10;
    const t = tageSeitGekocht(r.id);
    if (t < 21) w -= 2 * (21 - t) / 21;
    const v = verlauf.filter((x) => x.id === r.id).map((x) => x.datum).sort().pop();
    if (v && (new Date(heuteISO()) - new Date(v)) / 864e5 < 14) w -= 1;
    return w;
  }
  /** Bestes Rezept für eine Rolle; ohne Treffer für die Rolle irgendein passendes (gemerkt als fehl) */
  function vsWaehlen(pool, rolle, ausschluss, verlauf) {
    const frei = pool.filter((r) => !ausschluss.has(r.id));
    const bewertet = (l) => l.map((r) => ({ r, w: vsWertung(r, verlauf) })).sort((a, b) => b.w - a.w)[0];
    const treffer = bewertet(frei.filter(ROLLEN[rolle]));
    if (treffer) return { r: treffer.r, rolle };
    const ersatz = bewertet(frei);
    return ersatz ? { r: ersatz.r, rolle, fehl: true } : null;
  }
  /** Nächste freie Tage ab heute (am Wochenende: ab Montag); ohne freien Tag „kein Tag“ */
  function freieTage(n) {
    const heute = (new Date().getDay() + 6) % 7;
    const start = heute >= 5 ? 0 : heute;
    const belegt = new Set(planOffen().map((e) => e.tag).filter(Boolean));
    const frei = TAGE.map((t, i) => TAGE[(start + i) % 7]).filter((t) => !belegt.has(t));
    return Array.from({ length: n }, (x, i) => frei[i] || '');
  }

  function vorschlagBlatt() {
    const sp = vsSpeicher();
    const kats = [...new Set(rezepte.map((r) => r.kategorie).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    const w = Object.assign({ anzahl: 5, personen: STANDARD_PERSONEN, wer: null, veg: 0, fisch: 0, ohne: [], zeit: 0, kat: VS_KATEGORIEN.slice() }, sp.wuensche);
    w.wer = (w.wer || standardWer()).filter((u) => profile.some((p) => p.uid === u));
    w.kat = w.kat.filter((k) => kats.includes(k));
    if (!w.kat.length) w.kat = VS_KATEGORIEN.filter((k) => kats.includes(k));
    let auswahl = null;                 // [{r, rolle, tag, fehl, gezeigt: Set}]
    const b = blattAuf('Woche vorschlagen', { klasse: 'vs-blatt' });
    const grenzen = () => {
      w.anzahl = Math.min(7, Math.max(1, w.anzahl));
      if (w.ohne.includes('fisch')) w.fisch = 0;
      w.fisch = Math.min(w.fisch, w.anzahl);
      w.veg = Math.min(w.veg, w.anzahl - w.fisch);
    };
    const wer = () => werVon({ wer: w.wer });
    const fuerText = () => (wer().length ? portionenHTML({ wer: w.wer, personen: w.personen }) : w.personen + (w.personen === 1 ? ' Person' : ' Personen'));
    const chip = (attr, wert, an, text) => `<button type="button" class="chip${an ? ' aktiv' : ''}" ${attr}="${esc(wert)}" data-f="${attr}${esc(wert)}" aria-pressed="${an}">${esc(text)}</button>`;

    function formZeigen(neu) {
      grenzen();
      const n = vsKandidaten(w).length;
      b.zeigen(`
        <div class="vs-form">
          <div class="vs-feld"><span>Gerichte</span>${stepperHTML('anzahl', w.anzahl, w.anzahl > 1, w.anzahl < 7, 'Anzahl Gerichte')}</div>
          ${profile.length ? `<div class="feld"><span>Wer isst mit</span><div class="chips">${werChipsHTML(w.wer)}</div></div>` : ''}
          ${wer().length ? `<p class="klein vs-fuer">${fuerText()}</p>` : `<div class="vs-feld"><span>Personen</span>${stepperHTML('personen', w.personen, w.personen > 1, w.personen < 30, 'Personen')}</div>`}
          <div class="vs-feld"><span>mind. vegetarisch</span>${stepperHTML('veg', w.veg, w.veg > 0, w.veg < w.anzahl - w.fisch, 'Mindestens vegetarisch')}</div>
          <div class="vs-feld${w.ohne.includes('fisch') ? ' aus' : ''}"><span>mind. mit Fisch</span>${stepperHTML('fisch', w.fisch, w.fisch > 0, !w.ohne.includes('fisch') && w.fisch < w.anzahl - w.veg, 'Mindestens mit Fisch')}</div>
          <div class="feld"><span>Nicht vorschlagen</span><div class="chips">
            ${chip('data-ohne', 'fleisch', w.ohne.includes('fleisch'), 'ohne Fleisch')}${chip('data-ohne', 'fisch', w.ohne.includes('fisch'), 'ohne Fisch')}
          </div></div>
          <div class="feld"><span>Zeit höchstens</span><div class="chips">
            ${VS_ZEITEN.map((z) => chip('data-zeit', z, w.zeit === z, z ? z + ' Min.' : 'egal')).join('')}
          </div></div>
          <div class="feld"><span>Kategorien</span><div class="chips">${kats.map((k) => chip('data-kat', k, w.kat.includes(k), k)).join('')}</div></div>
          <p class="klein">${n} passende Rezepte. Bevorzugt wird, was du größtenteils <a href="#/zuhause">zuhause</a> hast; was schon im Plan steht oder kürzlich gekocht wurde, kommt seltener.</p>
        </div>`,
      `<button type="button" class="knopf leise" data-blatt-zu>Abbrechen</button>
       <button type="button" class="knopf haupt" id="vs-los" ${n ? '' : 'disabled'}>${svg('funke')} Vorschlagen</button>`, neu);
    }

    function erzeugen() {
      speicher.schreiben('vorschlag', Object.assign(vsSpeicher(), { wuensche: w }));
      const pool = vsKandidaten(w);
      const rollen = [...Array(w.fisch).fill('fisch'), ...Array(w.veg).fill('veg')];
      while (rollen.length < w.anzahl) rollen.push('frei');
      const genommen = new Set();
      const tage = freieTage(w.anzahl);
      auswahl = [];
      for (const rolle of rollen) {
        const v = vsWaehlen(pool, rolle, genommen, sp.verlauf);
        if (!v) break;
        genommen.add(v.r.id);
        auswahl.push(Object.assign(v, { gezeigt: new Set([v.r.id]) }));
      }
      // Tage in Plan-Reihenfolge vergeben, Rezepte dabei mischen (Fisch nicht immer am Montag)
      auswahl.sort(() => Math.random() - 0.5).forEach((v, i) => { v.tag = tage[i]; });
      vorschauZeigen(true);
    }
    function wuerfeln(i) {
      const v = auswahl[i];
      const pool = vsKandidaten(w);
      const andere = new Set(auswahl.filter((x) => x !== v).map((x) => x.r.id));
      let neu = vsWaehlen(pool, v.rolle, new Set([...andere, ...v.gezeigt]), sp.verlauf);
      if (!neu || (neu.fehl && !v.fehl)) {          // alles schon gezeigt: von vorn, nur nicht das aktuelle
        v.gezeigt = new Set([v.r.id]);
        neu = vsWaehlen(pool, v.rolle, new Set([...andere, v.r.id]), sp.verlauf) || neu;
      }
      if (!neu) { melden('Kein weiteres passendes Rezept'); return; }
      v.gezeigt.add(neu.r.id);
      Object.assign(v, { r: neu.r, fehl: neu.fehl });
      vorschauZeigen();
    }
    const ROLLEN_TEXT = { fisch: 'mit Fisch', veg: 'vegetarisch' };
    function vorschauZeigen(neu) {
      const fehl = auswahl.filter((v) => v.fehl);
      b.zeigen(`
        <p class="klein">${auswahl.length} Gerichte für ${fuerText()}. ${svg('wuerfel')} tauscht ein Gericht aus.</p>
        ${auswahl.length < w.anzahl ? `<p class="hinweis fehler klein">Nur ${auswahl.length} passende Rezepte – Wünsche lockern für mehr.</p>` : ''}
        ${fehl.length ? `<p class="hinweis fehler klein">Nicht genug passende Rezepte für: ${[...new Set(fehl.map((v) => ROLLEN_TEXT[v.rolle]))].join(', ')}.</p>` : ''}
        <ul class="vs-liste">${auswahl.map((v, i) => {
          const r = v.r, z = gesamtzeit(r.zeit), f = fehlend(r);
          const ern = ERNAEHRUNG.find((x) => x.id === ernaehrungVon(r).id).name;
          return `
          <li class="vs-zeile">
            <select class="vs-tag" data-tag="${i}" aria-label="Tag für ${esc(r.titel)}">
              <option value="">– kein Tag –</option>
              ${TAGE.map((t) => `<option ${t === v.tag ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <div class="vs-text"><strong>${esc(r.titel)}</strong>
              <small>${[r.kategorie, z ? dauer(z) : '', ern, zuhause.length ? (f ? 'fehlt: ' + f : 'alles da') : ''].filter(Boolean).map(esc).join(' · ')}</small></div>
            <button type="button" class="knopf icon-knopf vs-wuerfeln" data-wuerfeln="${i}" data-f="w${i}" aria-label="Neu würfeln: ${esc(r.titel)}" title="Anderes Gericht">${svg('wuerfel')}</button>
          </li>`; }).join('')}</ul>`,
      `<button type="button" class="knopf leise" id="vs-aendern">${svg('zurueck')} Wünsche</button>
       <button type="button" class="knopf" data-blatt-zu>Verwerfen</button>
       <button type="button" class="knopf haupt" id="vs-ok" ${auswahl.length ? '' : 'disabled'}>${svg('haken')} Übernehmen</button>`, neu);
    }
    function uebernehmen() {
      const heute = heuteISO();
      for (const v of auswahl) {
        const e = { uid: uid(), id: v.r.id, personen: begrenzen(w.personen), tag: v.tag || '' };
        if (stueckRezept(v.r)) e.personen = pFuer(v.r, v.r.personen);   // Gebäck: ein ganzes Rezept
        else if (wer().length) { e.wer = w.wer.slice(); e.personen = begrenzen(portionen(e)); }
        plan.push(e);
      }
      const verlauf = [...vsSpeicher().verlauf, ...auswahl.map((v) => ({ id: v.r.id, datum: heute }))].slice(-VS_VERLAUF_MAX);
      speicher.schreiben('vorschlag', { wuensche: w, verlauf });
      sichern();
      const n = auswahl.length;
      b.schliessen();
      zeichnen();
      melden(n + (n === 1 ? ' Gericht' : ' Gerichte') + ' eingeplant', '#/einkauf', 'Einkaufsliste');
    }

    b.el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-stepper] button');
      const t = (sel) => e.target.closest(sel);
      if (s) {
        const feld = s.closest('[data-stepper]').dataset.stepper;
        w[feld] += Number(s.dataset.d);
        if (feld === 'personen') w.personen = begrenzen(w.personen);
        formZeigen();
      } else if (t('[data-wer]')) {
        const u = t('[data-wer]').dataset.wer;
        w.wer = w.wer.includes(u) ? w.wer.filter((x) => x !== u) : [...w.wer, u];
        formZeigen();
      } else if (t('[data-ohne]')) {
        const o = t('[data-ohne]').dataset.ohne;
        w.ohne = w.ohne.includes(o) ? w.ohne.filter((x) => x !== o) : [...w.ohne, o];
        formZeigen();
      } else if (t('[data-zeit]')) { w.zeit = Number(t('[data-zeit]').dataset.zeit); formZeigen(); }
      else if (t('[data-kat]')) {
        const k = t('[data-kat]').dataset.kat;
        w.kat = w.kat.includes(k) ? w.kat.filter((x) => x !== k) : [...w.kat, k];
        formZeigen();
      } else if (t('#vs-los')) erzeugen();
      else if (t('[data-wuerfeln]')) wuerfeln(Number(t('[data-wuerfeln]').dataset.wuerfeln));
      else if (t('#vs-aendern')) formZeigen(true);
      else if (t('#vs-ok')) uebernehmen();
    });
    b.el.addEventListener('change', (e) => {
      const s = e.target.closest('[data-tag]');
      if (s) auswahl[Number(s.dataset.tag)].tag = s.value;
    });
    formZeigen();
  }

  // ---------------------------------------------------------------- Einkaufsliste
  // Gleiche Zutaten stehen in einer Zeile: Schlüssel ist die Grundform (Zutaten.grundform: Ei/Eier, Cherrytomate/
  // Cherrytomaten zusammen; „rote Zwiebel“ bleibt neben „Zwiebel“ eigener Posten). Verschiedene Einheiten werden über
  // Gewicht umgerechnet (assets/naehrwerte.js: Dichte, Stückgewicht): natürliche Einkaufseinheit (Lexikon „kauf“:
  // Eier, Zwiebeln, Zitronen … in Stück, Petersilie in Bund) aufgerundet, Flüssiges in ml, sonst g.
  // Lässt sich etwas nicht umrechnen, steht es zusammen in einer Zeile: „1 kg + 2 Stück Zucchini“.
  // Schlüssel eines Postens (für abgehakt): 'z|' + Grundform; eigene Einträge 'extra|' + uid.
  let namensFormen = {};          // Grundform -> {einzahl, mehrzahl} (Anzeige), aus allen Rezepten
  function formenSammeln() {
    namensFormen = {};
    for (const r of rezepte) for (const z of nurZutaten(r)) Zutaten.formenLernen(z.name, z.mehrzahl);
    for (const r of rezepte) for (const z of nurZutaten(r)) {
      const f = namensFormen[Zutaten.grundform(z.name)] = namensFormen[Zutaten.grundform(z.name)] || {};
      if (z.mehrzahl && Zutaten.normal(z.mehrzahl) !== Zutaten.normal(z.name)) f.mehrzahl = f.mehrzahl || z.mehrzahl;
      if (Zutaten.istEinzahl(z.name)) f.einzahl = f.einzahl || z.name;
      else f.mehrzahl = f.mehrzahl || z.name;
    }
  }
  const TEIL_FOLGE = ['g', 'ml', 'TL'];
  const LOEFFEL_MAX = 30;         // TL (= 10 EL)
  const FLUESSIG_KATEGORIEN = ['Gewürze & Öle', 'Getränke'];
  const mengeVon = (f) => f.zahl + (f.einheit ? ' ' + f.einheit : '');
  /** Umgerechnete Summe auf die Stufe von Einheiten.format aufrunden (280 g → 300 g, nicht 275 g) */
  const aufStufe = (x) => { const st = x < 10 ? 1 : x < 250 ? 5 : x < 975 ? 25 : 100; return Math.max(st, Math.ceil(x / st - 1e-9) * st); };
  /** Menge eines Postens: {menge, art: 'stueck' | 'mass' (g/ml) | 'einheit' (EL, Bund …) | 'gemischt', wert} */
  function postenMenge(p) {
    const teile = [...p.teile].sort((a, b) => (TEIL_FOLGE.indexOf(a[0]) + 1 || 9) - (TEIL_FOLGE.indexOf(b[0]) + 1 || 9));
    const art = (basis, f) => (!f.einheit ? 'stueck' : ['g', 'ml'].includes(basis) ? 'mass' : 'einheit');
    if (teile.length === 1) {
      const [basis, t] = teile[0];
      // ab 10 EL: Öle, Saucen in ml (so steht es auf der Flasche), anderes in g
      if (basis === 'TL' && t.wert >= LOEFFEL_MAX) {
        if (FLUESSIG_KATEGORIEN.includes(p.kategorie)) return { menge: mengeVon(format(t.wert * 5, 'ml')), art: 'mass', wert: 2 };
        if (p.gramm != null) return { menge: mengeVon(format(p.gramm, 'g')), art: 'mass', wert: 2 };
      }
      const f = format(t.wert, basis, { ganz: p.ganz, einheit: t.einheit, aufrunden: true });
      return { menge: mengeVon(f), art: art(basis, f), wert: f.wert };
    }
    if (p.gramm != null) {
      const proEinheit = p.kauf && Naehrwerte.gramm({ name: p.name, menge: 1, einheit: p.kauf });
      if (proEinheit) {
        const f = format(Math.max(1, Math.ceil(p.gramm / proEinheit - 0.05)), p.kauf, { ganz: true, aufrunden: true });
        return { menge: mengeVon(f), art: art(p.kauf, f), wert: f.wert };
      }
      // Gewürzmengen (größter Teil in Löffeln, zusammen wenig) in TL/EL
      const groesster = teile.slice().sort((a, b) => b[1].gramm - a[1].gramm)[0][0];
      const proTL = Naehrwerte.gramm({ name: p.name, menge: 1, einheit: 'TL' });
      if (groesster === 'TL' && p.gramm < 30 && proTL) {
        const f = format(p.gramm / proTL, 'TL', { einheit: p.teile.get('TL').einheit });
        return { menge: mengeVon(f), art: 'einheit', wert: f.wert };
      }
      // Flüssiges (ein Teil in ml, größter Teil ml oder Löffel) in ml, sonst g
      if (p.teile.has('ml') && ['ml', 'TL'].includes(groesster)) {
        const dichte = Naehrwerte.gramm({ name: p.name, menge: 1, einheit: 'ml' }) || 1;
        const f = format(aufStufe(p.gramm / dichte), 'ml', { exakt: true });
        return { menge: mengeVon(f), art: 'mass', wert: f.wert };
      }
      const f = format(aufStufe(p.gramm), 'g', { exakt: true });
      return { menge: mengeVon(f), art: 'mass', wert: f.wert };
    }
    const menge = teile.map(([basis, t]) => {
      const f = format(t.wert, basis, { ganz: p.ganz, einheit: t.einheit, aufrunden: true });
      return mengeVon(f) + (f.einheit ? '' : ' Stück');
    }).join(' + ');
    return { menge, art: 'gemischt', wert: 2 };
  }
  function einkaufsliste() {
    const map = new Map();
    for (const e of fuerEinkauf()) {
      const r = nachId[e.id];
      const faktor = portionen(e) / (r.personen || STANDARD_PERSONEN);
      for (const z of nurZutaten(r)) {
        const info = Zutaten.info(z);
        if (info.nie) continue;
        const m = skalieren(z, faktor);
        const grund = Zutaten.grundform(z.name);
        let p = map.get(grund);
        if (!p) {
          p = { schluessel: 'z|' + grund, grund, name: z.name, teile: new Map(), gramm: 0, mitMenge: false,
            kategorie: info.kategorie, vorrat: info.vorrat, ganz: info.ganz, icon: info.icon, kauf: info.kauf, optional: true, rezepte: new Set() };
          map.set(grund, p);
        }
        if (m) {
          const t = p.teile.get(m.basis) || { wert: 0, einheit: m.einheit, gramm: 0 };
          t.wert += m.wert;
          if (t.einheit !== m.einheit) t.einheit = null;
          const gr = Naehrwerte.gramm(z);
          if (gr == null || p.gramm == null) p.gramm = null;
          else { p.gramm += gr * (z.fix ? 1 : faktor); t.gramm += gr * (z.fix ? 1 : faktor); }
          p.teile.set(m.basis, t);
          p.mitMenge = true;
        }
        p.optional = p.optional && !!z.optional;
        p.rezepte.add(r.titel);
      }
    }
    // "Salz" ohne Menge steht in derselben Zeile wie Salz mit Menge (gleiche Grundform) und zeigt dann die Menge
    const posten = [...map.values()].map((p) => {
      const fo = namensFormen[p.grund] || {};
      let menge = '', name = p.name;
      if (p.mitMenge) {
        const m = postenMenge(p);
        menge = m.menge;
        // Mehrzahl auch bei g/ml („300 g Cherrytomaten“); bei EL, Bund, Dose … die Einzahl
        name = m.art === 'stueck' ? (m.wert > 1 ? fo.mehrzahl || p.name : fo.einzahl || p.name)
          : m.art === 'einheit' ? fo.einzahl || p.name : fo.mehrzahl || p.name;
      }
      return Object.assign(p, { menge, anzeigeName: name });
    });

    // Kategorien in der Reihenfolge im Laden (Mehr → Einkaufen); unbekannte Kategorien zählen als „Sonstiges“
    const gruppen = [];
    for (const k of kategorienFolge()) {
      const liste = posten.filter((p) => !p.vorrat && (p.kategorie === k || (k === 'Sonstiges' && !Zutaten.KATEGORIEN.includes(p.kategorie))));
      if (liste.length) gruppen.push({ titel: k, liste: liste.sort((a, b) => a.anzeigeName.localeCompare(b.anzeigeName, 'de')) });
    }
    const eigene = extras.map((x) => ({ schluessel: 'extra|' + x.uid, uid: x.uid, anzeigeName: x.text, menge: '', rezepte: new Set(), extra: true }));
    if (eigene.length) gruppen.push({ titel: 'Eigene Einträge', liste: eigene, eigene: true });
    const vorrat = posten.filter((p) => p.vorrat).sort((a, b) => a.anzeigeName.localeCompare(b.anzeigeName, 'de'));
    if (vorrat.length) gruppen.push({ titel: 'Vorrat prüfen', liste: vorrat, vorrat: true });
    // Was zuhause ist, aus allen Gruppen in "Schon zuhause" verschieben
    const da = [];
    for (const g of gruppen) {
      if (g.eigene) continue;
      g.liste = g.liste.filter((p) => (istZuhause(p.name) ? (da.push(p), false) : true));
    }
    const ergebnis = gruppen.filter((g) => g.liste.length);
    if (da.length) ergebnis.push({ titel: 'Schon zuhause', liste: da.sort((a, b) => a.anzeigeName.localeCompare(b.anzeigeName, 'de')), zuhause: true });
    return ergebnis;
  }

  function alsText(gruppen, markdown) {
    const datum = new Date().toLocaleDateString('de-DE');
    const fuer = fuerEinkauf().map((e) => `${nachId[e.id].titel} (${stueckRezept(nachId[e.id]) ? mengeText(nachId[e.id], e.personen, true) : portionText(portionen(e)) + ' P.'})`).join(', ');
    const box = markdown ? '- [ ] ' : '☐ ';
    let t = (markdown ? '# ' : '') + 'Einkaufsliste – ' + datum + '\n';
    if (fuer) t += (markdown ? '\n_Für: ' + fuer + '_\n' : 'Für: ' + fuer + '\n');
    for (const g of gruppen.filter((x) => !x.zuhause)) {
      t += '\n' + (markdown ? '## ' + g.titel : g.titel.toUpperCase()) + '\n';
      for (const p of g.liste) {
        if (abgehakt[p.schluessel]) continue;
        t += box + (p.menge ? p.menge + ' ' : '') + p.anzeigeName + (p.optional ? ' (optional)' : '') + '\n';
      }
    }
    return t;
  }

  function seiteEinkauf() {
    document.title = 'Einkaufsliste – Rezepte';
    const gruppen = einkaufsliste();
    const quellen = fuerEinkauf();
    const leer = !quellen.length && !extras.length;
    const an = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };

    app.innerHTML = `
      <div class="werkzeuge">
        <h1>Einkaufsliste</h1>
        <span class="abstand"></span>
        ${leer ? '' : `
        <div class="ek-export nur-bildschirm">
          ${navigator.share ? `<button class="knopf haupt" id="ek-teilen">${svg('teilen')} Teilen</button>` : ''}
          <button class="knopf" id="ek-kopieren">${svg('kopieren')} Kopieren</button>
          <button class="knopf" id="ek-txt">${svg('download')} .txt</button>
          <button class="knopf" id="ek-md">${svg('download')} .md</button>
          <button class="knopf${navigator.share ? '' : ' haupt'}" onclick="window.print()">${svg('drucker')} Drucken</button>
        </div>`}
      </div>
      ${quellen.length ? `<div class="ek-fuer"><span class="nur-druck">Für: </span>${quellen.map((e) => `
        <span class="ek-chip">${esc(nachId[e.id].titel)} <span class="klein">${portionenHTML(e, true)}</span>${plan.includes(e) ? ' <span class="klein nur-bildschirm">· Plan</span>' : `<button type="button" class="nur-bildschirm" data-weg-liste="${e.uid}" aria-label="Von der Liste nehmen">×</button>`}</span>`).join('<span class="nur-druck">, </span>')}</div>` : ''}
      ${leer ? `<p class="leer">Noch leer. Öffne ein Rezept und tippe auf <strong>„Auf Einkaufsliste“</strong> – oder plane Rezepte im <a href="#/plan">Wochenplan</a> ein.</p>` : ''}
      <form class="ek-neu nur-bildschirm" id="ek-neu">
        <input id="ek-text" placeholder="Eigener Eintrag, z. B. Spülmittel" autocomplete="off">
        <button class="knopf" type="submit">${svg('plus')} Hinzufügen</button>
      </form>
      <div class="ek-gruppen">
        ${gruppen.map((g) => `
          <section class="ek-gruppe${g.vorrat ? ' vorrat' : ''}${g.zuhause ? ' zuhause nur-bildschirm' : ''}">
            <h2>${esc(g.titel)}</h2>
            ${g.vorrat ? '<p class="klein">Meist im Haus – kurz nachsehen. Mit ' + svg('haus') + ' als „zuhause“ merken.</p>' : ''}
            ${g.zuhause ? '<p class="klein">Laut deiner <a href="#/zuhause">Zuhause-Liste</a> da – wird nicht exportiert.</p>' : ''}
            <ul>
              ${g.liste.map((p) => `
                <li class="ek-posten${abgehakt[p.schluessel] ? ' erledigt' : ''}" data-k="${esc(p.schluessel)}" title="${esc([...p.rezepte].join(', '))}">
                  <span class="box">${svg('haken')}</span>
                  <span class="ek-icon">${p.icon ? svg(p.icon) : ''}</span>
                  <span class="ek-menge">${esc(p.menge)}</span>
                  <span class="ek-name">${esc(p.anzeigeName)}${p.optional ? ' <em>(optional)</em>' : ''}</span>
                  ${p.extra ? `<button type="button" class="knopf leise icon-knopf nur-bildschirm" data-extra="${p.uid}" aria-label="Entfernen">${svg('muell')}</button>`
                    : g.zuhause ? `<button type="button" class="knopf leise icon-knopf nur-bildschirm haus-an" data-nicht-da="${esc(p.name)}" aria-label="Doch nicht zuhause" title="Doch nicht zuhause">${svg('haus')}</button>`
                    : `<button type="button" class="knopf leise icon-knopf nur-bildschirm" data-da="${esc(p.anzeigeName)}" aria-label="Hab ich zuhause" title="Hab ich zuhause">${svg('haus')}</button>`}
                </li>`).join('')}
            </ul>
          </section>`).join('')}
      </div>
      ${leer ? '' : `
      <div class="ek-fertig nur-bildschirm">
        <button type="button" class="knopf haupt" id="ek-erledigt">${svg('haus')} <span>Einkauf erledigt</span></button>
        <span class="klein" id="ek-erledigt-text"></span>
      </div>
      <p class="nur-bildschirm klein"><span id="ek-offen"></span> · Antippen zum Abhaken · <a href="#" id="ek-zuruecksetzen">Haken zurücksetzen</a>${liste.length || extras.length ? ' · <a href="#" id="ek-leeren">Liste leeren</a>' : ''}</p>`}`;

    // Zähler „offen“ und Knopf „Einkauf erledigt“ ohne Neuzeichnen aktuell halten
    const zaehlen = () => {
      if (leer) return;
      const offen = gruppen.filter((g) => !g.zuhause).reduce((n, g) => n + g.liste.filter((p) => !abgehakt[p.schluessel]).length, 0);
      const n = gekauftePosten(gruppen).length;
      document.getElementById('ek-offen').textContent = offen + ' offen';
      document.getElementById('ek-erledigt').disabled = !n && !gekaufteExtras().length;
      document.getElementById('ek-erledigt-text').textContent = n ? n + ' abgehakte ' + (n === 1 ? 'Zutat kommt' : 'Zutaten kommen') + ' nach „Zuhause“' : 'Abgehaktes kommt danach nach „Zuhause“';
    };
    app.querySelectorAll('.ek-posten').forEach((li) => li.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-extra], [data-da], [data-nicht-da]')) return;
      const k = li.dataset.k;
      if (abgehakt[k]) delete abgehakt[k]; else abgehakt[k] = true;
      sichern();
      li.classList.toggle('erledigt');
      zaehlen();
    }));
    zaehlen();
    an('ek-erledigt', () => einkaufErledigt(gruppen));
    app.querySelectorAll('[data-da]').forEach((b) => b.addEventListener('click', () => {
      zuhause.push({ uid: uid(), name: b.dataset.da }); sichern(); zeichnen(); melden(b.dataset.da + ' als zuhause gemerkt');
    }));
    app.querySelectorAll('[data-nicht-da]').forEach((b) => b.addEventListener('click', () => {
      zuhause = zuhause.filter((x) => !passt(b.dataset.nichtDa, x.name)); sichern(); zeichnen();
    }));
    app.querySelectorAll('[data-weg-liste]').forEach((b) => b.addEventListener('click', () => {
      liste = liste.filter((x) => x.uid !== b.dataset.wegListe); sichern(); zeichnen();
    }));
    app.querySelectorAll('[data-extra]').forEach((b) => b.addEventListener('click', () => {
      extras = extras.filter((x) => x.uid !== b.dataset.extra); sichern(); zeichnen();
    }));
    document.getElementById('ek-neu').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const text = document.getElementById('ek-text').value.trim();
      if (text) { extras.push({ uid: uid(), text }); sichern(); zeichnen(); document.getElementById('ek-text').focus(); }
    });
    an('ek-zuruecksetzen', (ev) => { ev.preventDefault(); abgehakt = {}; sichern(); zeichnen(); });
    an('ek-leeren', (ev) => {
      ev.preventDefault();
      if (confirm('Einkaufsliste leeren? (Der Wochenplan bleibt erhalten.)')) { liste = []; extras = []; abgehakt = {}; sichern(); zeichnen(); }
    });
    an('ek-kopieren', () => kopieren(alsText(einkaufsliste(), false)));
    an('ek-txt', () => herunterladen('einkaufsliste.txt', alsText(einkaufsliste(), false), 'text/plain'));
    an('ek-md', () => herunterladen('einkaufsliste.md', alsText(einkaufsliste(), true), 'text/markdown'));
    an('ek-teilen', () => navigator.share({ title: 'Einkaufsliste', text: alsText(einkaufsliste(), false) }).catch(() => {}));
  }

  // ---------------------------------------------------------------- Einkauf erledigt → Zuhause
  /** Abgehakte Zutaten (ohne eigene Einträge und ohne „Schon zuhause“) */
  const gekauftePosten = (gruppen) => gruppen.filter((g) => !g.zuhause && !g.eigene).flatMap((g) => g.liste).filter((p) => abgehakt[p.schluessel]);
  const gekaufteExtras = () => extras.filter((x) => abgehakt['extra|' + x.uid]);
  function einkaufErledigt(gruppen) {
    const namen = [];
    for (const p of gekauftePosten(gruppen)) {
      if (!namen.some((n) => Zutaten.grundform(n) === p.grund)) namen.push(p.anzeigeName);
    }
    const eigene = gekaufteExtras();
    const b = blattAuf('Einkauf erledigt');
    b.zeigen(`
      ${namen.length ? `<p>${namen.length === 1 ? 'Diese Zutat kommt' : `Diese ${namen.length} Zutaten kommen`} in deine Zuhause-Liste:</p>
      <div class="ek-uebernahme">${namen.map((n) => `<span class="ek-chip">${esc(n)}</span>`).join('')}</div>` : ''}
      ${eigene.length ? `<p class="klein">${eigene.length === 1 ? 'Ein abgehakter eigener Eintrag wird' : eigene.length + ' abgehakte eigene Einträge werden'} von der Liste genommen.</p>` : ''}
      ${liste.length ? `<label class="haken-zeile"><input type="checkbox" id="ee-liste" checked><span class="box">${svg('haken')}</span>
        <span>Rezepte direkt auf der Liste entfernen<small>${liste.map((e) => esc(nachId[e.id].titel)).join(', ')}</small></span></label>` : ''}
      ${planOffen().length ? '<p class="klein">Rezepte im Wochenplan bleiben – ihre Zutaten stehen dann unter „Schon zuhause“.</p>' : ''}`,
    `<button type="button" class="knopf leise" data-blatt-zu>Abbrechen</button>
     <button type="button" class="knopf haupt" id="ee-ok">${svg('haken')} Übernehmen</button>`);
    b.el.querySelector('#ee-ok').addEventListener('click', () => {
      const listeWeg = b.el.querySelector('#ee-liste');
      namen.forEach((name) => { if (!istZuhause(name)) zuhause.push({ uid: uid(), name }); });
      extras = extras.filter((x) => !eigene.includes(x));
      if (listeWeg && listeWeg.checked) liste = [];
      abgehakt = {};
      sichern();
      b.schliessen();
      zeichnen();
      melden(namen.length + (namen.length === 1 ? ' Zutat' : ' Zutaten') + ' nach „Zuhause“ übernommen', '#/zuhause', 'Ansehen');
    });
  }

  // ---------------------------------------------------------------- Reihenfolge im Laden
  /** Kategorien in der eigenen Reihenfolge; neue Kategorien (aus zutaten.js) an ihrer Standardstelle */
  function kategorienFolge() {
    const alle = Zutaten.KATEGORIEN;
    if (!ladenfolge) return alle.slice();
    const f = ladenfolge.filter((k, i) => alle.includes(k) && ladenfolge.indexOf(k) === i);
    alle.forEach((k, i) => { if (!f.includes(k)) f.splice(Math.min(i, f.length), 0, k); });
    return f;
  }
  function ladenfolgeBlatt() {
    const b = blattAuf('Reihenfolge im Laden', { zu: () => { if (document.body.dataset.seite === 'mehr') zeichnen(); } });
    const zeigen = () => {
      const f = kategorienFolge();
      b.zeigen(`
        <p class="klein">So ist die Einkaufsliste sortiert – am besten in der Reihenfolge deines Wegs durch den Laden.
          „Eigene Einträge“, „Vorrat prüfen“ und „Schon zuhause“ stehen immer am Ende.</p>
        <ol class="lf-liste">${f.map((k, i) => `
          <li data-k="${esc(k)}">
            <span class="lf-nr">${i + 1}</span>
            <span class="lf-name">${esc(k)}</span>
            <button type="button" class="knopf icon-knopf" data-lf="-1" data-f="${esc(k)}-" aria-label="${esc(k)} nach oben" ${i ? '' : 'disabled'}>${svg('hoch')}</button>
            <button type="button" class="knopf icon-knopf" data-lf="1" data-f="${esc(k)}+" aria-label="${esc(k)} nach unten" ${i < f.length - 1 ? '' : 'disabled'}>${svg('runter')}</button>
          </li>`).join('')}</ol>`,
      `<button type="button" class="knopf leise" id="lf-zurueck" ${ladenfolge ? '' : 'disabled'}>Zurücksetzen</button>
       <button type="button" class="knopf haupt" data-blatt-zu>Fertig</button>`);
    };
    b.el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-lf]');
      if (k) {
        const f = kategorienFolge(), i = f.indexOf(k.closest('[data-k]').dataset.k), j = i + Number(k.dataset.lf);
        if (j < 0 || j >= f.length) return;
        [f[i], f[j]] = [f[j], f[i]];
        ladenfolge = f.join() === Zutaten.KATEGORIEN.join() ? null : f;
        sichern(); zeigen();
      } else if (e.target.closest('#lf-zurueck')) { ladenfolge = null; sichern(); zeigen(); }
    });
    zeigen();
  }

  // ---------------------------------------------------------------- Haushalt (Profile)
  const PROFIL_VORLAGEN = [['Erwachsen', 1], ['Kind', 0.5], ['Großer Hunger', 1.5]];
  function haushaltText() {
    if (!profile.length) return 'Noch keine Personen – der Wochenplan rechnet mit der Personenzahl';
    const std = profile.filter((p) => p.standard);
    return profile.map((p) => (p.name || 'ohne Namen') + ' ' + portionText(p.faktor)).join(', ') +
      (std.length ? ' · meist ' + portionText(std.reduce((n, p) => n + p.faktor, 0)) + ' Portionen' : '');
  }
  function haushaltBlatt() {
    const b = blattAuf('Haushalt', { zu: () => {
      profile.forEach((p, i) => { p.name = p.name.trim() || 'Person ' + (i + 1); });
      datenPruefen(); sichern(); zeichnen();   // gelöschte Profile aus dem Plan nehmen, Seite aktualisieren
    } });
    const zeigen = () => {
      b.zeigen(`
        <p class="klein">Personen mit ihrer Portionsgröße (1 = normale Portion). Im Wochenplan wählst du dann, wer mitisst –
          die Einkaufsliste rechnet mit der Summe, z. B. 1 + 1 + ½ = 2½ Portionen. „Isst meist mit“ ist die Vorauswahl für neue Einträge.</p>
        ${profile.length ? `<ul class="hh-liste">${profile.map((p) => `
          <li class="hh-profil" data-uid="${p.uid}">
            <div class="hh-zeile">
              <input class="hh-name" value="${esc(p.name)}" placeholder="Name" aria-label="Name" maxlength="30" autocomplete="off" data-f="n${p.uid}">
              <button type="button" class="knopf leise icon-knopf" data-hh-weg aria-label="${esc(p.name || 'Person')} entfernen">${svg('muell')}</button>
            </div>
            <div class="hh-zeile">
              <span class="klein">Portion</span>
              ${stepperHTML('faktor', portionText(p.faktor), p.faktor > 0.25, p.faktor < 4, 'Portionsgröße').replace(/data-f="faktor/g, `data-f="${p.uid}`)}
              <label class="hh-std"><input type="checkbox" data-hh-std ${p.standard ? 'checked' : ''}><span class="box">${svg('haken')}</span> isst meist mit</label>
            </div>
          </li>`).join('')}</ul>` : ''}
        <div class="feld"><span>Person hinzufügen</span><div class="chips">
          ${PROFIL_VORLAGEN.map(([n, f]) => `<button type="button" class="chip" data-hh-neu="${esc(n)}" data-faktor="${f}" data-f="neu${esc(n)}">+ ${esc(n)} ${portionText(f)}</button>`).join('')}
        </div></div>`,
      `<button type="button" class="knopf haupt" data-blatt-zu>Fertig</button>`);
    };
    const finde = (el) => profile.find((p) => p.uid === el.closest('[data-uid]').dataset.uid);
    b.el.addEventListener('click', (e) => {
      const t = (sel) => e.target.closest(sel);
      if (t('[data-stepper] button')) {
        const p = finde(e.target); p.faktor = faktorBegrenzen(p.faktor + 0.25 * Number(t('[data-stepper] button').dataset.d)); sichern(); zeigen();
      } else if (t('[data-hh-weg]')) {
        const p = finde(e.target);
        if (!p.name.trim() || confirm(p.name + ' entfernen?')) { profile = profile.filter((x) => x !== p); datenPruefen(); sichern(); zeigen(); }
      } else if (t('[data-hh-neu]')) {
        const v = t('[data-hh-neu]'), basis = v.dataset.hhNeu;
        let name = basis, n = 1;
        while (profile.some((p) => p.name === name)) name = basis + ' ' + ++n;
        const p = { uid: uid(), name, faktor: Number(v.dataset.faktor), standard: true };
        profile.push(p); sichern(); zeigen();
        const feld = b.el.querySelector(`[data-uid="${p.uid}"] .hh-name`);
        if (feld) { feld.scrollIntoView({ block: 'nearest' }); }
      }
    });
    b.el.addEventListener('input', (e) => { if (e.target.matches('.hh-name')) { finde(e.target).name = e.target.value; sichern(); } });
    b.el.addEventListener('change', (e) => { if (e.target.matches('[data-hh-std]')) { finde(e.target).standard = e.target.checked; sichern(); } });
    zeigen();
  }

  // ---------------------------------------------------------------- Zuhause
  const GRUNDVORRAT = ['Salz', 'Pfeffer', 'Olivenöl', 'Pflanzenöl', 'Zucker', 'Mehl', 'Butter', 'Eier', 'Milch', 'Zwiebeln',
    'Knoblauch', 'Gemüsebrühe', 'Sojasauce', 'Reis', 'Spaghetti', 'Currypulver', 'Paprikapulver', 'Tomatenmark'];
  function seiteZuhause() {
    document.title = 'Zuhause – Rezepte';
    const alleZutaten = [...new Set(rezepte.flatMap((r) => nurZutaten(r).map((z) => z.name)))].sort((x, y) => x.localeCompare(y, 'de'));
    const vorschlaege = GRUNDVORRAT.filter((n) => !istZuhause(n));
    const gruppen = new Map();
    for (const x of [...zuhause].sort((a, b) => a.name.localeCompare(b.name, 'de'))) {
      const k = Zutaten.info({ name: x.name }).kategorie;
      if (!gruppen.has(k)) gruppen.set(k, []);
      gruppen.get(k).push(x);
    }
    const folge = kategorienFolge();
    const reihenfolge = [...gruppen.keys()].sort((a, b) => folge.indexOf(a) - folge.indexOf(b));

    app.innerHTML = `
      <div class="werkzeuge">
        <h1>Zuhause</h1>
        <span class="abstand"></span>
        ${zuhause.length ? `<button class="knopf leise nur-bildschirm" id="zh-leeren">${svg('muell')} Leeren</button>` : ''}
      </div>
      <p class="hinweis">Was du da hast, landet auf der Einkaufsliste unter „Schon zuhause“ statt auf dem Zettel.
        In der Rezeptübersicht kannst du nach <a href="#/rezepte?o=zuhause">„Am meisten zuhause“</a> sortieren.</p>
      <form class="ek-neu nur-bildschirm" id="zh-neu">
        <input id="zh-text" list="zh-vorschlag" placeholder="z. B. Basmatireis" autocomplete="off">
        <datalist id="zh-vorschlag">${alleZutaten.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
        <button class="knopf" type="submit">${svg('plus')} Hinzufügen</button>
      </form>
      ${vorschlaege.length ? `<div class="feld zh-schnell nur-bildschirm"><span>Schnell hinzufügen</span>
        <div class="chips">${vorschlaege.map((n) => `<button type="button" class="chip" data-neu="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div></div>` : ''}
      ${zuhause.length ? `<div class="ek-gruppen">${reihenfolge.map((k) => `
        <section class="ek-gruppe">
          <h2>${esc(k)}</h2>
          <ul>${gruppen.get(k).map((x) => {
            const icon = Zutaten.info({ name: x.name }).icon;
            return `<li class="ek-posten zh-posten">
              <span class="ek-icon">${icon ? svg(icon) : ''}</span>
              <span class="ek-name">${esc(x.name)}</span>
              <button type="button" class="knopf leise icon-knopf" data-weg-zh="${x.uid}" aria-label="Entfernen">${svg('muell')}</button>
            </li>`; }).join('')}</ul>
        </section>`).join('')}</div>` : '<p class="leer">Noch nichts eingetragen.</p>'}`;

    const hinzu = (name) => {
      name = name.trim();
      if (!name || zuhause.some((x) => Zutaten.normal(x.name) === Zutaten.normal(name))) return;
      zuhause.push({ uid: uid(), name }); sichern(); zeichnen();
      const f = document.getElementById('zh-text'); if (f) f.focus();
    };
    document.getElementById('zh-neu').addEventListener('submit', (e) => { e.preventDefault(); hinzu(document.getElementById('zh-text').value); });
    app.querySelectorAll('[data-neu]').forEach((b) => b.addEventListener('click', () => hinzu(b.dataset.neu)));
    app.querySelectorAll('[data-weg-zh]').forEach((b) => b.addEventListener('click', () => {
      zuhause = zuhause.filter((x) => x.uid !== b.dataset.wegZh); sichern(); zeichnen();
    }));
    const leeren = document.getElementById('zh-leeren');
    if (leeren) leeren.addEventListener('click', () => { if (confirm('Zuhause-Liste leeren?')) { zuhause = []; sichern(); zeichnen(); } });
  }

  function kopieren(text) {
    const fallback = () => {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); melden('Kopiert'); } catch (e) { melden('Kopieren nicht möglich'); }
      t.remove();
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => melden('In die Zwischenablage kopiert'), fallback);
    } else fallback();
  }

  function herunterladen(name, text, typ) {
    const url = URL.createObjectURL(new Blob([text], { type: typ + ';charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Kurze Meldung (Toast). Liegt über Tab-, Timer- und Aktionsleiste (CSS: --tabs-h, --timer-h, --aktion-h, --fuss-h),
   * bei offenem Blatt oben am Bildschirm – nie über Knöpfen: ist ein Blatt so hoch, dass es darunter reichen würde,
   * rückt es für die Dauer der Meldung nach unten (meldungPlatz).
   * opt: { knopf: 'Aktualisieren', aktion: () => …, dauer: ms }
   */
  function melden(text, link, linkText, opt) {
    opt = opt || {};
    const el = document.getElementById('meldung');
    el.innerHTML = `<span class="m-text">${esc(text)}</span>` + (link ? `<a href="${link}">${esc(linkText)}</a>` : '') +
      (opt.knopf ? `<button type="button">${esc(opt.knopf)}</button>` : '');
    el.onclick = opt.aktion || null;
    el.classList.toggle('mit-aktion', !!opt.aktion);
    el.classList.add('sichtbar');
    meldungPlatz();
    clearTimeout(melden.t);
    melden.t = setTimeout(() => { el.classList.remove('sichtbar'); el.onclick = null; meldungPlatz(); }, opt.dauer || (link || opt.knopf ? 4000 : 2200));
  }
  function meldungPlatz() {
    if (!blatt) return;
    const el = document.getElementById('meldung'), h = blatt.hinter;
    h.style.paddingTop = ''; blatt.el.style.maxHeight = '';
    if (!el.classList.contains('sichtbar')) return;
    const unten = el.offsetTop + el.offsetHeight + 8;     // ohne Einblend-Verschiebung
    if (blatt.el.getBoundingClientRect().top >= unten) return;
    h.style.paddingTop = unten + 'px';
    if (getComputedStyle(h).display !== 'flex') blatt.el.style.maxHeight = Math.max(200, innerHeight - unten - 16) + 'px';   // PC: Dialog in der Mitte
  }

  // ---------------------------------------------------------------- Blatt (Dialog)
  // Am Handy ein Bottom-Sheet über der Tab-Leiste, am PC ein Dialog in der Mitte. Immer nur eines offen;
  // Seitenwechsel, Escape, Tippen daneben und × schließen es.
  //   const b = blattAuf('Titel', { zu: () => … });   b.zeigen(inhaltHTML, fussHTML); b.inhalt / b.el; b.schliessen()
  let blatt = null;
  function blattAuf(titel, opt) {
    blattZu();
    const hinter = document.createElement('div');
    hinter.className = 'blatt-hinter nur-bildschirm';
    hinter.innerHTML = `
      <section class="blatt${opt && opt.klasse ? ' ' + opt.klasse : ''}" role="dialog" aria-modal="true" aria-labelledby="blatt-titel">
        <header class="blatt-kopf">
          <h2 id="blatt-titel" tabindex="-1">${esc(titel)}</h2>
          <button type="button" class="knopf leise icon-knopf" data-blatt-zu aria-label="Schließen">${svg('schliessen')}</button>
        </header>
        <div class="blatt-inhalt"></div>
        <footer class="blatt-fuss" hidden></footer>
      </section>`;
    document.body.appendChild(hinter);
    document.body.classList.add('blatt-an');
    const el = hinter.querySelector('.blatt');
    const b = blatt = {
      hinter, el, inhalt: el.querySelector('.blatt-inhalt'), fuss: el.querySelector('.blatt-fuss'), zu: opt && opt.zu,
      /** Inhalt (neu) setzen; Scrollstand und Fokus (Element mit data-f) bleiben erhalten, außer neueAnsicht */
      zeigen(inhalt, fuss, neueAnsicht) {
        const a = document.activeElement, f = a && el.contains(a) && a.dataset.f, oben = neueAnsicht ? 0 : b.inhalt.scrollTop;
        b.inhalt.innerHTML = inhalt;
        b.fuss.innerHTML = fuss || '';
        b.fuss.hidden = !fuss;
        b.inhalt.scrollTop = oben;
        const neu = f && el.querySelector(`[data-f="${CSS.escape(f)}"]`);
        if (neu && !neu.disabled) neu.focus({ preventScroll: true });
      },
      schliessen: () => { if (blatt === b) blattZu(); },
    };
    hinter.addEventListener('click', (e) => {
      if (e.target === hinter || e.target.closest('[data-blatt-zu]')) b.schliessen();
    });
    el.querySelector('h2').focus({ preventScroll: true });
    requestAnimationFrame(meldungPlatz);
    return b;
  }
  function blattZu() {
    if (!blatt) return;
    const b = blatt;
    blatt = null;
    b.hinter.remove();
    document.body.classList.remove('blatt-an');
    if (b.zu) b.zu();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && blatt) { e.stopImmediatePropagation(); blattZu(); } }, true);

  /** Stepper-HTML für Blätter: data-stepper = Feldname, Wert als Text */
  const stepperHTML = (feld, text, minus, plus, label) => `
    <span class="stepper" data-stepper="${feld}" role="group" aria-label="${esc(label)}">
      <button type="button" data-d="-1" data-f="${feld}-" aria-label="Weniger" ${minus ? '' : 'disabled'}>${svg('minus')}</button>
      <strong>${text}</strong>
      <button type="button" data-d="1" data-f="${feld}+" aria-label="Mehr" ${plus ? '' : 'disabled'}>${svg('plus')}</button>
    </span>`;

  // ---------------------------------------------------------------- Druck
  // Vor dem Drucken das Druckbild aktivieren und jedes Rezept ausmessen:
  // Ist es nur etwas zu lang, wird es leicht verkleinert (bis 85 %), damit es auf eine A4-Seite passt.
  // Bräuchte es mehr, bleibt es in normaler Größe und läuft sauber auf eine zweite Seite.
  const SEITE_MM = 297 - 15 - 14 - 3;   // A4 minus Ränder minus Sicherheit
  const BREITE_MM = 180;
  const PX_JE_MM = 96 / 25.4;
  const MIN_ZOOM = 0.85;
  /** Tipps und Notizen (in dieser Reihenfolge) unter den Zutaten bzw. in der Spalte el */
  const zusatzVon = (el, auchLeer) => [el.querySelector('.r-tipps'), el.querySelector(auchLeer ? '.r-notizen' : '.r-notizen:not(.ohne-notiz)')].filter(Boolean);
  function druckVorbereiten() {
    notizenJetzt();
    document.documentElement.setAttribute('data-theme', 'light');   // Druck immer hell
    document.body.classList.add('druck');
    document.querySelectorAll('.rezept').forEach((el) => {
      el.style.zoom = ''; el.style.width = ''; el.classList.remove('zweiseitig');
      // Tipps und Notizen in die kürzere Spalte (meist unter die Zubereitung, wenn die Zutatenliste lang ist).
      // Bevorzugt beide zusammen; Notizen wandern nur in die andere Spalte, wenn das Rezept dadurch kürzer wird.
      const zusatz = zusatzVon(el), links = el.querySelector('.r-links'), rechts = el.querySelector('.r-schritte');
      if (zusatz.length && links && rechts) {
        const legen = (spalten) => zusatz.forEach((x, i) => (spalten[i] === 'r' ? rechts : links).appendChild(x));
        legen('ll');
        const h = zusatz.reduce((n, x) => n + x.getBoundingClientRect().height, 0);
        const erst = links.getBoundingClientRect().height > rechts.getBoundingClientRect().height + h ? 'rr' : 'll';
        const varianten = zusatz.length > 1 ? [erst, erst === 'll' ? 'rr' : 'll', 'lr', 'rl'] : [erst[0]];
        let beste = null;
        for (const v of varianten) {
          legen(v);
          const hoehe = el.getBoundingClientRect().height;
          if (!beste || hoehe < beste.hoehe - 2) beste = { v, hoehe };
        }
        legen(beste.v);
      }
      let zoom = 1;
      for (let i = 0; i < 4; i++) {
        // Im echten Druck bricht Text minimal anders um -> 5 % Reserve
        const mm = el.getBoundingClientRect().height / PX_JE_MM * 1.05;
        if (mm <= SEITE_MM) return;
        zoom = zoom * SEITE_MM / mm * 0.99;
        if (zoom < MIN_ZOOM) break;
        el.style.zoom = zoom;
        el.style.width = (BREITE_MM / zoom) + 'mm';
      }
      // passt auch verkleinert nicht: normale Größe, zwei Seiten
      el.style.zoom = ''; el.style.width = '';
      el.classList.add('zweiseitig');
    });
  }
  function druckEnde() {
    document.body.classList.remove('druck');
    document.querySelectorAll('.rezept').forEach((el) => {
      el.style.zoom = ''; el.style.width = ''; el.classList.remove('zweiseitig');
      const links = el.querySelector('.r-links');
      if (links) zusatzVon(el, true).forEach((x) => links.appendChild(x));
    });
    darstellungAnwenden();
  }
  window.addEventListener('beforeprint', druckVorbereiten);
  window.addEventListener('afterprint', druckEnde);
  window.RezeptDruck = { vorbereiten: druckVorbereiten, ende: druckEnde };

  // ---------------------------------------------------------------- Start
  // Zurück/Vor nach sofortOeffnen (pushState): je nach Browser kommt popstate, hashchange oder beides
  const neuZeichnen = () => { if (location.hash !== angezeigt) zeichnen(); };
  window.addEventListener('hashchange', neuZeichnen);
  window.addEventListener('popstate', neuZeichnen);
  window.addEventListener('storage', (e) => {
    if (e.key === 'rezepte.timer') return;   // erledigt assets/timer.js
    if (e.key === 'rezepte.darstellung' || !e.key) darstellungAnwenden();
    zustandLesen();
    datenPruefen();
    zeichnen();
  });
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = svg(el.dataset.icon); });

  // Feste Leisten unten (Tabs, Timer) ausmessen -> CSS-Variablen für Abstände und den Kochmodus
  function abstaendeMessen() {
    const h = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().height : 0; };
    document.documentElement.style.setProperty('--tabs-h', h('.tabs') + 'px');
    const t = h('#timer-leiste.sichtbar');
    document.documentElement.style.setProperty('--timer-h', (t ? t + 8 : 0) + 'px');   // + Abstand der schwebenden Leiste
    document.documentElement.style.setProperty('--aktion-h', h('#app .r-aktion') + 'px');   // fester „Jetzt kochen“-Knopf (Rezept, Handy)
    document.documentElement.style.setProperty('--kopf-h', kopfHoehe() + 'px');   // kompakte Kopfleiste oben (Handy)
    document.documentElement.style.setProperty('--fuss-h', h('#app .km-fuss') + 'px');   // Zurück/Weiter im Kochmodus
  }
  window.addEventListener('resize', abstaendeMessen);
  window.addEventListener('timerleiste', abstaendeMessen);
  abstaendeMessen();

  // App-Gefühl: kein Zoomen per Geste (iOS ignoriert user-scalable=no teilweise)
  ['gesturestart', 'gesturechange'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));

  window.RezeptApp = {
    mehrEintrag, mehrAbschnitt, speicher, melden, zeichnen, blattAuf,
    gekocht: gekochtHilfe,          // „zuletzt gekocht“ & Verlauf, siehe oben bei GEKOCHT_MAX
    portionen, kategorienFolge,
    favorit: istFavorit, bewertung: sterneVon, notiz: notizVon,
  };
  // ---------------------------------------------------------------- Offline (Service Worker sw.js)
  // Nur über https (GitHub Pages) oder localhost; unter file:// still übersprungen. sw.js holt Seiten und Skripte
  // frisch aus dem Netz und nimmt nur ohne Netz die gespeicherte Kopie – Änderungen kommen also beim nächsten Öffnen an.
  // Läuft die App schon länger (iPhone: im Hintergrund), sucht sie beim Zurückholen nach einer neuen Version und
  // bietet dann „Aktualisieren“ an (Vergleich window.APP_VERSION aus rezepte/liste.js mit der Version von sw.js).
  const offlineMoeglich = 'serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
  let swVersion = null;
  function swVersionFragen() {
    const c = offlineMoeglich && navigator.serviceWorker.controller;
    if (!c) return Promise.resolve(null);
    return new Promise((fertig) => {
      const k = new MessageChannel();
      k.port1.onmessage = (e) => fertig(e.data);
      c.postMessage('version', [k.port2]);
      setTimeout(() => fertig(null), 3000);
    });
  }
  function offlineText() {
    if (!offlineMoeglich) return 'Offline-Speicher nur in der Web-App (https)';
    if (!navigator.serviceWorker.controller) return 'Offline-Speicher wird eingerichtet …';
    return (navigator.onLine === false ? 'Gerade offline – gespeicherte Rezepte verfügbar' : 'Offline verfügbar') + (swVersion ? ' · ' + swVersion.slice(0, 7) : '');
  }
  function swStarten() {
    if (!offlineMoeglich) return;
    let hatteSteuerung = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      const erstes = !hatteSteuerung;
      hatteSteuerung = true;
      swVersionFragen().then((v) => {
        swVersion = v;
        offlineZeigen();
        if (erstes || !v || !window.APP_VERSION || v === window.APP_VERSION) return;
        melden('Neue Version verfügbar', null, null, { knopf: 'Aktualisieren', aktion: () => { notizenJetzt(); location.reload(); }, dauer: 15000 });
      });
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      const suchen = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') suchen(); });
      setInterval(suchen, 3600e3);
    }).catch(() => { /* z. B. privater Modus */ });
    swVersionFragen().then((v) => { swVersion = v; offlineZeigen(); });
  }
  function offlineZeigen() {
    const el = document.querySelector('.mehr-offline');
    if (el) { el.textContent = offlineText(); el.classList.toggle('aus', navigator.onLine === false); }
  }
  window.addEventListener('offline', () => { melden('Offline – gespeicherte Rezepte verfügbar'); offlineZeigen(); });
  window.addEventListener('online', () => { melden('Wieder online'); offlineZeigen(); });
  swStarten();

  // Browser bitten, die Daten dauerhaft zu behalten (nicht bei Speicherknappheit löschen)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* egal */ }
  laden().then(() => {
    zeichnen();
    if (navigator.onLine === false) melden('Offline – gespeicherte Rezepte verfügbar');
  });
})();
