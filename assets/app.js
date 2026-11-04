/* Rezepte – App (ohne Build, läuft per Doppelklick auf index.html und auf GitHub Pages) */
(function () {
  'use strict';

  const { skalieren, format } = Einheiten;
  const { svg } = Icons;
  const STANDARD_PERSONEN = 4;
  const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const SCHWIERIGKEIT = { einfach: 1, mittel: 2, anspruchsvoll: 3 };

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
  let plan = speicher.lesen('plan', []);           // [{uid, id, personen, tag}]
  let abgehakt = speicher.lesen('abgehakt', {});   // {schluessel: true}
  let extras = speicher.lesen('extras', []);       // [{uid, text}]
  let liste = speicher.lesen('liste', []);         // Rezepte direkt auf der Einkaufsliste [{uid, id, personen}]
  let zuhause = speicher.lesen('zuhause', []);     // Was man da hat [{uid, name}]
  const sichern = () => {
    speicher.schreiben('zuhause', zuhause);
    speicher.schreiben('liste', liste);
    speicher.schreiben('plan', plan);
    speicher.schreiben('abgehakt', abgehakt);
    speicher.schreiben('extras', extras);
  };
  const uid = () => Math.random().toString(36).slice(2, 9);

  // ---------------------------------------------------------------- Helfer
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fett = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const begrenzen = (n) => Math.min(30, Math.max(1, Math.round(Number(n) || STANDARD_PERSONEN)));

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
    const plural = f.wert > 1 && !f.einheit && z.mehrzahl;
    return { menge, name: plural ? z.mehrzahl : z.name, info };
  }

  /** Ist eine Zutat zuhause? "Olivenöl" passt zu "Olivenöl", "Meersalz" zu "Salz", "Zwiebeln" zu "Zwiebel". */
  function formen(w) { return [w, w.replace(/n$/, ''), w.replace(/en$/, ''), w.replace(/s$/, ''), w.replace(/e$/, ''), w.replace(/er$/, '')]; }
  function passt(zutatName, vorratName) {
    const z = Zutaten.normal(zutatName), v = Zutaten.normal(vorratName);
    if (!v) return false;
    if (z === v) return true;
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
      plan = plan.filter((e) => nachId[e.id]);
      liste = liste.filter((e) => nachId[e.id]);
    });
  }

  // ---------------------------------------------------------------- Router
  function route() {
    const [pfad, query] = location.hash.replace(/^#/, '').split('?');
    const teile = pfad.split('/').filter(Boolean);
    const q = new URLSearchParams(query || '');
    return { teile, q };
  }

  function zeichnen() {
    const { teile, q } = route();
    const ziel = '#/' + (teile[0] === 'rezept' ? '' : (teile[0] || ''));
    document.querySelectorAll('.nav a, .tabs a').forEach((a) => a.classList.toggle('aktiv', ziel === a.getAttribute('href')));
    zaehlerAktualisieren();
    document.body.dataset.seite = teile[0] || 'start';

    if (teile[0] === 'rezept' && nachId[teile[1]]) {
      const r = nachId[teile[1]];
      seiteRezept(r, begrenzen(q.get('p') || r.personen || STANDARD_PERSONEN));
    } else if (teile[0] === 'plan') seitePlan();
    else if (teile[0] === 'einkauf') seiteEinkauf();
    else if (teile[0] === 'zuhause') seiteZuhause();
    else if (teile[0] === 'kochbuch') seiteKochbuch(q);
    else seiteUebersicht(q);
    window.scrollTo(0, 0);
  }

  /** Alle Rezepte, deren Zutaten auf die Einkaufsliste kommen: Wochenplan + direkt hinzugefügte */
  const fuerEinkauf = () => [...plan, ...liste];
  function zaehlerAktualisieren() {
    document.querySelectorAll('[data-zahl="plan"]').forEach((el) => { el.textContent = plan.length || ''; });
    document.querySelectorAll('[data-zahl="einkauf"]').forEach((el) => { el.textContent = fuerEinkauf().length + extras.length || ''; });
    document.querySelectorAll('[data-zahl="zuhause"]').forEach((el) => { el.textContent = zuhause.length || ''; });
  }

  // ---------------------------------------------------------------- Übersicht
  // Filter: Kategorie, Ernährungsform, Merkmale (Nährwerte, Schnell), Suche, Zutaten; dazu Sortierung
  const SCHNELL_MIN = 30;
  const titelVergleich = (a, b) => a.titel.localeCompare(b.titel, 'de');
  /** [id, Name, Wert, Standard-Richtung, Text aufsteigend, Text absteigend, Gruppe] */
  const SORTIERUNGEN = [
    ['name', 'Name', null, 'auf', 'A–Z', 'Z–A'],
    ['schwierigkeit', 'Schwierigkeit', (r) => SCHWIERIGKEIT[r.schwierigkeit] || 1, 'auf', 'einfach zuerst', 'schwer zuerst'],
    ['zeit', 'Zeit', (r) => gesamtzeit(r.zeit), 'auf', 'schnellste zuerst', 'längste zuerst'],
    ['kcal', 'Kalorien', (r) => nwp(r).kcal, 'auf', 'wenigste zuerst', 'meiste zuerst', 'nw'],
    ['eiweiss', 'Eiweiß', (r) => nwp(r).eiweiss, 'ab', 'wenigstes zuerst', 'meistes zuerst', 'nw'],
    ['fett', 'Fett', (r) => nwp(r).fett, 'auf', 'wenigstes zuerst', 'meistes zuerst', 'nw'],
    ['kh', 'Kohlenhydrate', (r) => nwp(r).kh, 'auf', 'wenigste zuerst', 'meiste zuerst', 'nw'],
    ['zuhause', 'Am meisten zuhause', (r) => fehlend(r), 'auf'],
  ];
  const sortierung = (o) => SORTIERUNGEN.find((x) => x[0] === o) || SORTIERUNGEN[0];
  /** Vergleich für Sortierung o in Richtung d ('auf' | 'ab'); bei Gleichstand nach Name */
  function vergleich(o, d) {
    const [, , wert] = sortierung(o);
    const r = d === 'ab' ? -1 : 1;
    if (!wert) return (a, b) => r * titelVergleich(a, b);
    return (a, b) => r * (wert(a) - wert(b)) || (o === 'schwierigkeit' ? gesamtzeit(a.zeit) - gesamtzeit(b.zeit) : 0) || titelVergleich(a, b);
  }
  /** Anzahl Zutaten mit Menge, die nicht zuhause sind (Salz & Co. nach Geschmack zählen nicht) */
  const fehlend = (r) => nurZutaten(r).filter((z) => z.menge != null && !z.optional && !Zutaten.info(z).nie && !istZuhause(z.name)).length;
  const nwCache = new Map();
  const nwp = (r) => { if (!nwCache.has(r)) nwCache.set(r, Naehrwerte.berechnen(r).portion); return nwCache.get(r); };

  // Ernährungsform aus den Zutaten (assets/zutaten.js), im Rezept mit ernaehrung: '…' überschreibbar
  const ERNAEHRUNG = [
    { id: 'vegan', name: 'Vegan', passt: (e) => e.id === 'vegan' },
    { id: 'vegetarisch', name: 'Vegetarisch', passt: (e) => e.id === 'vegan' || e.id === 'vegetarisch' },
    { id: 'fisch', name: 'Mit Fisch', passt: (e) => e.fisch },
    { id: 'fleisch', name: 'Mit Fleisch', passt: (e) => e.fleisch },
  ];
  const ernCache = new Map();
  const ernaehrungVon = (r) => { if (!ernCache.has(r)) ernCache.set(r, Zutaten.ernaehrung(r)); return ernCache.get(r); };
  function ernaehrungHTML(r) {
    const e = ernaehrungVon(r);
    const name = ERNAEHRUNG.find((x) => x.id === e.id).name;
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
      if (f.k && r.kategorie !== f.k) return false;
      if (ern && !ern.passt(ernaehrungVon(r))) return false;
      if (f.m.length) {
        const ids = merkmaleVon(r).map((x) => x.id);
        if (!f.m.every((m) => ids.includes(m))) return false;
      }
      const namen = nurZutaten(r).map((z) => Zutaten.normal(z.name));
      if (zf.mit.some((w) => !namen.some((nm) => nm.includes(w)))) return false;
      if (zf.ohne.some((w) => namen.some((nm) => nm.includes(w)))) return false;
      if (!n) return true;
      const ernText = ERNAEHRUNG.filter((x) => x.passt(ernaehrungVon(r))).map((x) => x.name).join(' ');
      const text = Zutaten.normal([r.titel, r.beschreibung, r.kategorie, (r.tags || []).join(' '), ernText, namen.join(' ')].join(' '));
      return n.split(' ').every((w) => text.includes(w));
    }).sort(vergleich(f.o, f.d));
  }

  function seiteUebersicht(q) {
    document.title = 'Rezepte';
    const m = (q.get('m') || '').split(',').filter(Boolean);
    const f = { s: q.get('s') || '', k: q.get('k') || '', z: q.get('z') || '',
      e: q.get('e') || (m.includes('veggie') ? 'vegetarisch' : ''),   // alte Links: m=veggie
      m: m.filter((x) => x !== 'veggie'), o: sortierung(q.get('o'))[0], d: q.get('d') || '' };
    if (!ERNAEHRUNG.some((x) => x.id === f.e)) f.e = '';
    if (!['auf', 'ab'].includes(f.d)) f.d = sortierung(f.o)[3];
    const kategorien = [...new Set(rezepte.map((r) => r.kategorie).filter(Boolean))].sort();
    const offen = !!(f.z || f.m.length);
    const option = ([id, name]) => `<option value="${id}"${id === f.o ? ' selected' : ''}>${name}</option>`;

    app.innerHTML = `
      <section class="kopf-seite nur-bildschirm">
        <h1>Rezepte</h1>
        <div class="filter">
          <div class="such-zeile">
            <label class="suchfeld">${svg('suche')}
              <input id="suche" type="search" placeholder="Suchen: Titel, Zutat, Tag …" value="${esc(f.s)}" autocomplete="off">
            </label>
            <button type="button" class="knopf filter-knopf${offen ? ' an' : ''}" id="filter-auf" aria-expanded="${offen}">${svg('filter')} <span>Filter</span><span class="zahl" id="filter-zahl"></span></button>
          </div>
          <div class="chips" id="kat-chips" aria-label="Kategorie">
            <button type="button" class="chip" data-k="">Alle</button>
            ${kategorien.map((k) => `<button type="button" class="chip" data-k="${esc(k)}">${esc(k)}</button>`).join('')}
          </div>
          <div class="chips ern-chips" id="ern-chips" aria-label="Ernährung">
            <button type="button" class="chip" data-e="">Alle</button>
            ${ERNAEHRUNG.map((x) => `<button type="button" class="chip e-${x.id}" data-e="${x.id}">${x.name}</button>`).join('')}
          </div>
          <div class="filter-feld" id="filter-feld"${offen ? '' : ' hidden'}>
            <label class="feld"><span>Mit Zutaten</span>
              <input id="zutaten" type="search" placeholder="z. B. Spinat, Käse  ·  ohne: -Pilze" value="${esc(f.z)}" autocomplete="off">
            </label>
            <div class="feld"><span>Eigenschaften</span>
              <div class="chips merkmal-chips" id="merkmal-chips">
                ${FILTER_MERKMALE.map((x) => `<button type="button" class="chip" data-m="${x.id}">${esc(x.name)}</button>`).join('')}
              </div>
            </div>
            <button type="button" class="knopf leise" id="filter-weg">Filter zurücksetzen</button>
          </div>
        </div>
      </section>
      ${ladefehler.length ? `<p class="hinweis fehler">Nicht geladen: ${ladefehler.map(esc).join(', ')} – Datei in /rezepte prüfen.</p>` : ''}
      <div class="sortier-zeile nur-bildschirm">
        <p class="treffer klein" id="treffer"></p>
        <div class="sortieren">
          <label for="sortierung" class="klein">Sortieren</label>
          <select id="sortierung">
            ${SORTIERUNGEN.filter((x) => !x[6]).slice(0, 3).map(option).join('')}
            <optgroup label="Nährwerte pro Portion">${SORTIERUNGEN.filter((x) => x[6] === 'nw').map(option).join('')}</optgroup>
            <optgroup label="Vorrat">${option(sortierung('zuhause'))}</optgroup>
          </select>
          <button type="button" class="knopf richtung" id="richtung"></button>
        </div>
      </div>
      <div class="karten" id="karten"></div>`;

    const $ = (id) => document.getElementById(id);
    function aktualisieren() {
      const p = new URLSearchParams();
      if (f.s) p.set('s', f.s);
      if (f.k) p.set('k', f.k);
      if (f.e) p.set('e', f.e);
      if (f.z) p.set('z', f.z);
      if (f.m.length) p.set('m', f.m.join(','));
      if (f.o !== 'name') p.set('o', f.o);
      if (f.d !== sortierung(f.o)[3]) p.set('d', f.d);
      history.replaceState(null, '', '#/' + (p.toString() ? '?' + p.toString() : ''));
      const liste = filtern(f);
      $('karten').innerHTML = liste.map((r) => karte(r, f.o)).join('') || '<p class="leer">Keine Rezepte gefunden. Filter lockern?</p>';
      const aktiv = f.m.length + (f.z ? 1 : 0);
      $('filter-zahl').textContent = aktiv || '';
      $('treffer').textContent = (aktiv || f.s || f.k || f.e) ? liste.length + ' von ' + rezepte.length + ' Rezepten' : rezepte.length + ' Rezepte';
      const s = sortierung(f.o);
      const knopf = $('richtung');
      knopf.hidden = !s[4] || !s[5];
      knopf.innerHTML = `<span aria-hidden="true">${f.d === 'ab' ? '↓' : '↑'}</span> ${esc(f.d === 'ab' ? s[5] : s[4])}`;
      knopf.setAttribute('aria-label', 'Reihenfolge: ' + (f.d === 'ab' ? s[5] : s[4]) + ' – umdrehen');
      document.querySelectorAll('#kat-chips .chip').forEach((c) => c.classList.toggle('aktiv', c.dataset.k === f.k));
      document.querySelectorAll('#ern-chips .chip').forEach((c) => c.classList.toggle('aktiv', c.dataset.e === f.e));
      document.querySelectorAll('#merkmal-chips .chip').forEach((c) => c.classList.toggle('aktiv', f.m.includes(c.dataset.m)));
    }
    const tippen = (el, feld) => { let t; el.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { f[feld] = el.value; aktualisieren(); }, 150); }); };
    tippen($('suche'), 's');
    tippen($('zutaten'), 'z');
    $('sortierung').addEventListener('change', (e) => { f.o = e.target.value; f.d = sortierung(f.o)[3]; aktualisieren(); });
    $('richtung').addEventListener('click', () => { f.d = f.d === 'ab' ? 'auf' : 'ab'; aktualisieren(); });
    $('kat-chips').addEventListener('click', (e) => { const c = e.target.closest('[data-k]'); if (c) { f.k = c.dataset.k; aktualisieren(); } });
    $('ern-chips').addEventListener('click', (e) => { const c = e.target.closest('[data-e]'); if (c) { f.e = c.dataset.e; aktualisieren(); } });
    $('merkmal-chips').addEventListener('click', (e) => {
      const c = e.target.closest('[data-m]'); if (!c) return;
      f.m = f.m.includes(c.dataset.m) ? f.m.filter((x) => x !== c.dataset.m) : [...f.m, c.dataset.m];
      aktualisieren();
    });
    $('filter-auf').addEventListener('click', (e) => {
      const feld = $('filter-feld'); feld.hidden = !feld.hidden;
      e.currentTarget.setAttribute('aria-expanded', String(!feld.hidden));
      e.currentTarget.classList.toggle('an', !feld.hidden);
    });
    $('filter-weg').addEventListener('click', () => {
      f.z = ''; f.m = []; $('zutaten').value = ''; aktualisieren();
    });
    aktualisieren();
  }

  /** Sortierter Wert auf der Karte hervorheben (o = Sortierung) */
  function karte(r, o) {
    const z = gesamtzeit(r.zeit);
    const an = (id) => (o === id ? ' class="sortwert"' : '');
    const nw = { eiweiss: 'Eiweiß', fett: 'Fett', kh: 'Kohlenhydrate' }[o];
    return `
      <a class="karte" href="#/rezept/${esc(r.id)}">
        ${r.bild ? `<img src="${esc(r.bild)}" alt="" loading="lazy">` : ''}
        <span class="karte-kat">${esc(r.kategorie || '')}</span>
        <h2>${esc(r.titel)}</h2>
        ${r.beschreibung ? `<p>${esc(r.beschreibung)}</p>` : ''}
        <span class="karte-meta">
          ${z ? `<span${an('zeit')}>${svg('uhr')} ${dauer(z)}</span>` : ''}
          <span${an('schwierigkeit')}>${svg('muetze')} ${esc(r.schwierigkeit || '')}</span>
          <span${an('kcal')}>${nwZahl(nwp(r).kcal, 'kcal')}</span>
          ${nw ? `<span class="sortwert">${nwZahl(nwp(r)[o], 'g')} ${nw}</span>` : ''}
          ${zuhause.length ? `<span class="fehlt">${fehlend(r) ? 'fehlt: ' + fehlend(r) : 'alles da'}</span>` : ''}
        </span>
        ${merkmalHTML(r)}
      </a>`;
  }
  function merkmalHTML(r) {
    return `<span class="merkmale">${ernaehrungHTML(r)}${merkmaleVon(r).map((x) => `<span class="merkmal m-${x.id}">${esc(x.name)}</span>`).join('')}</span>`;
  }

  // ---------------------------------------------------------------- Rezept
  function rezeptHTML(r, personen, interaktiv) {
    const faktor = personen / (r.personen || STANDARD_PERSONEN);
    const zg = gesamtzeit(r.zeit);
    const stufe = SCHWIERIGKEIT[r.schwierigkeit] || 1;

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
      return `<div class="schritt"><span class="nr">${nr}</span><p>${fett(s)}</p></div>`;
    }).join('');

    const zeitDetail = Object.entries(r.zeit || {}).filter(([, v]) => v)
      .map(([k, v]) => `${ZEIT_NAMEN[k] || k} ${dauer(v)}`).join(' · ');

    return `
      <article class="rezept">
        <header class="r-kopf">
          <div class="r-titelblock">
            <span class="r-kat">${esc([r.kategorie, ...(r.tags || [])].filter(Boolean).join(' · '))}</span>
            <h1>${esc(r.titel)}</h1>
            ${r.beschreibung ? `<p class="r-beschreibung">${esc(r.beschreibung)}</p>` : ''}
          </div>
          ${r.bild ? `<img class="r-bild" src="${esc(r.bild)}" alt="">` : ''}
        </header>

        <div class="r-meta">
          <div class="meta-feld">
            ${svg('personen')}
            ${interaktiv ? `
              <span class="stepper nur-bildschirm">
                <button type="button" data-p="${personen - 1}" aria-label="Weniger" ${personen <= 1 ? 'disabled' : ''}>${svg('minus')}</button>
                <strong>${personen}</strong>
                <button type="button" data-p="${personen + 1}" aria-label="Mehr">${svg('plus')}</button>
              </span>
              <span class="nur-druck"><strong>${personen}</strong></span>` : `<strong>${personen}</strong>`}
            <span>${personen === 1 ? 'Person' : 'Personen'}</span>
          </div>
          ${zg ? `<div class="meta-feld">${svg('uhr')}<span><strong>${dauer(zg)}</strong>${zeitDetail ? `<small>${esc(zeitDetail)}</small>` : ''}</span></div>` : ''}
          <div class="meta-feld">
            <span class="muetzen" title="${esc(r.schwierigkeit || '')}">${[1, 2, 3].map((i) => svg('muetze', i <= stufe ? 'an' : 'aus')).join('')}</span>
            <span>${esc(r.schwierigkeit || '')}</span>
          </div>
        </div>

        ${naehrwertHTML(r, personen)}
        ${merkmalHTML(r)}

        <div class="r-inhalt">
          <div class="r-links">
            <section class="r-zutaten">
              <h2>Zutaten</h2>
              <ul>${zutaten}</ul>
            </section>
            ${(r.tipps && r.tipps.length) ? `<section class="r-tipps"><h2>Tipps</h2><ul>${r.tipps.map((t) => `<li>${fett(t)}</li>`).join('')}</ul></section>` : ''}
          </div>
          <section class="r-schritte">
            <h2>Zubereitung</h2>
            ${schritte}
          </section>
        </div>

      </article>`;
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
        <div class="nw-titel"><strong>Nährwerte</strong><span>pro Portion</span><span class="nw-ges">gesamt ${personen} P.</span></div>
        ${NW_ZEILEN.map(([k, name, e]) => `
          <div class="nw-wert${k === 'kcal' ? ' kcal' : ''}">
            <span class="nw-name">${name}</span>
            <strong>${nwZahl(nw.portion[k], e)}</strong>
            <span class="nw-ges">${nwZahl(nw.portion[k] * personen, e)}</span>
          </div>`).join('')}
      </section>`;
  }

  function seiteRezept(r, personen) {
    document.title = r.titel + ' – Rezepte';
    app.innerHTML = `
      <div class="werkzeuge r-werkzeuge nur-bildschirm">
        <a class="knopf leise zurueck" href="#/" aria-label="Alle Rezepte">${svg('zurueck')} <span>Alle Rezepte</span></a>
        <span class="abstand"></span>
        <button class="knopf haupt" id="zur-liste">${svg('korb')} <span>Auf Einkaufsliste</span></button>
        <button class="knopf" id="zum-plan" aria-label="Zum Wochenplan" title="Zum Wochenplan">${svg('kalender')} <span>Wochenplan</span></button>
        <button class="knopf icon-knopf" onclick="window.print()" aria-label="Drucken" title="Drucken">${svg('drucker')}</button>
      </div>
      ${rezeptHTML(r, personen, true)}`;

    app.querySelectorAll('.stepper button').forEach((b) => b.addEventListener('click', () => {
      history.replaceState(null, '', '#/rezept/' + r.id + '?p=' + begrenzen(b.dataset.p));
      seiteRezept(r, begrenzen(b.dataset.p));
    }));
    document.getElementById('zum-plan').addEventListener('click', (e) => {
      plan.push({ uid: uid(), id: r.id, personen, tag: '' });
      sichern(); zaehlerAktualisieren();
      e.currentTarget.innerHTML = svg('haken') + ' <span>Im Plan</span>';
      melden(r.titel + ' für ' + personen + ' P. eingeplant');
    });
    document.getElementById('zur-liste').addEventListener('click', (e) => {
      liste.push({ uid: uid(), id: r.id, personen });
      sichern(); zaehlerAktualisieren();
      e.currentTarget.innerHTML = svg('haken') + ' <span>Auf der Liste</span>';
      melden('Zutaten für ' + personen + ' P. auf der Einkaufsliste', '#/einkauf', 'Ansehen');
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
      ${rezepte.map((r) => rezeptHTML(r, personen, false)).join('')}`;
    document.getElementById('kb-p').addEventListener('change', (e) => {
      location.hash = '#/kochbuch?p=' + begrenzen(e.target.value);
    });
  }

  // ---------------------------------------------------------------- Wochenplan
  function seitePlan() {
    document.title = 'Wochenplan – Rezepte';
    const gruppen = [...TAGE, ''].map((tag) => ({ tag, eintraege: plan.filter((e) => (e.tag || '') === tag) }))
      .filter((g) => g.eintraege.length);

    const zeile = (e) => {
      const r = nachId[e.id];
      return `
        <li class="plan-eintrag" data-uid="${e.uid}">
          <a href="#/rezept/${esc(r.id)}?p=${e.personen}">${esc(r.titel)}</a>
          <select data-feld="tag" aria-label="Tag">
            <option value="">– kein Tag –</option>
            ${TAGE.map((t) => `<option ${t === e.tag ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <span class="stepper">
            <button type="button" data-schritt="-1" aria-label="Weniger">${svg('minus')}</button>
            <strong>${e.personen}</strong>
            <button type="button" data-schritt="1" aria-label="Mehr">${svg('plus')}</button>
          </span>
          <span class="klein">Pers.</span>
          <button type="button" class="knopf leise icon-knopf" data-weg aria-label="Entfernen">${svg('muell')}</button>
        </li>`;
    };

    app.innerHTML = `
      <div class="werkzeuge">
        <h1>Wochenplan</h1>
        <span class="abstand"></span>
        ${plan.length ? `<button class="knopf leise nur-bildschirm" id="plan-leeren">${svg('muell')} Leeren</button>
        <button class="knopf nur-bildschirm" onclick="window.print()">${svg('drucker')} Drucken</button>
        <a class="knopf haupt nur-bildschirm" href="#/einkauf">${svg('korb')} Einkaufsliste</a>` : ''}
      </div>
      <div class="nur-bildschirm plan-neu">
        <select id="plan-rezept" aria-label="Rezept wählen">
          <option value="">Rezept hinzufügen …</option>
          ${rezepte.map((r) => `<option value="${esc(r.id)}">${esc(r.titel)}</option>`).join('')}
        </select>
      </div>
      ${gruppen.length ? gruppen.map((g) => `
        <section class="plan-tag">
          <h2>${g.tag || 'Ohne Tag'}</h2>
          <ul>${g.eintraege.map(zeile).join('')}</ul>
        </section>`).join('') : '<p class="leer">Noch nichts geplant. Rezept oben auswählen oder in einem Rezept auf „Zum Wochenplan“ tippen.</p>'}`;

    const finde = (el) => plan.find((e) => e.uid === el.closest('[data-uid]').dataset.uid);
    app.querySelectorAll('[data-feld="tag"]').forEach((s) => s.addEventListener('change', () => {
      finde(s).tag = s.value; sichern(); zeichnen();
    }));
    app.querySelectorAll('[data-schritt]').forEach((b) => b.addEventListener('click', () => {
      const e = finde(b); e.personen = begrenzen(e.personen + Number(b.dataset.schritt)); sichern(); zeichnen();
    }));
    app.querySelectorAll('[data-weg]').forEach((b) => b.addEventListener('click', () => {
      const e = finde(b); plan = plan.filter((x) => x !== e); sichern(); zeichnen();
    }));
    document.getElementById('plan-rezept').addEventListener('change', (ev) => {
      const r = nachId[ev.target.value];
      if (r) { plan.push({ uid: uid(), id: r.id, personen: r.personen || STANDARD_PERSONEN, tag: '' }); sichern(); zeichnen(); }
    });
    const leeren = document.getElementById('plan-leeren');
    if (leeren) leeren.addEventListener('click', () => {
      if (confirm('Wochenplan wirklich leeren?')) { plan = []; abgehakt = {}; sichern(); zeichnen(); }
    });
  }

  // ---------------------------------------------------------------- Einkaufsliste
  function einkaufsliste() {
    const map = new Map();
    for (const e of fuerEinkauf()) {
      const r = nachId[e.id];
      const faktor = e.personen / (r.personen || STANDARD_PERSONEN);
      for (const z of nurZutaten(r)) {
        const info = Zutaten.info(z);
        if (info.nie) continue;
        const m = skalieren(z, faktor);
        const schluessel = Zutaten.normal(z.name) + '|' + (m ? m.basis : '-');
        let p = map.get(schluessel);
        if (!p) {
          p = { schluessel, name: z.name, mehrzahl: z.mehrzahl, basis: m && m.basis, einheit: m && m.einheit, wert: 0, mitMenge: false,
            kategorie: info.kategorie, vorrat: info.vorrat, ganz: info.ganz, icon: info.icon, optional: true, rezepte: new Set() };
          map.set(schluessel, p);
        }
        if (m) { p.wert += m.wert; p.mitMenge = true; if (p.einheit !== m.einheit) p.einheit = null; }
        p.optional = p.optional && !!z.optional;
        p.rezepte.add(r.titel);
      }
    }
    // "Salz" ohne Menge fällt weg, wenn dieselbe Zutat schon mit Menge auf der Liste steht
    const mitMenge = new Set([...map.values()].filter((p) => p.mitMenge).map((p) => Zutaten.normal(p.name)));
    const posten = [...map.values()].filter((p) => p.mitMenge || !mitMenge.has(Zutaten.normal(p.name))).map((p) => {
      let menge = '', name = p.name;
      if (p.mitMenge) {
        const f = format(p.wert, p.basis, { ganz: p.ganz, einheit: p.einheit, aufrunden: true });
        menge = f.zahl + (f.einheit ? ' ' + f.einheit : '');
        if (f.wert > 1 && !f.einheit && p.mehrzahl) name = p.mehrzahl;
      }
      return Object.assign(p, { menge, anzeigeName: name });
    });

    const gruppen = [];
    for (const k of Zutaten.KATEGORIEN) {
      const liste = posten.filter((p) => !p.vorrat && p.kategorie === k);
      if (liste.length) gruppen.push({ titel: k, liste: liste.sort((a, b) => a.anzeigeName.localeCompare(b.anzeigeName, 'de')) });
    }
    const unbekannt = posten.filter((p) => !p.vorrat && !Zutaten.KATEGORIEN.includes(p.kategorie));
    if (unbekannt.length) gruppen.push({ titel: 'Sonstiges', liste: unbekannt });
    const eigene = extras.map((x) => ({ schluessel: 'extra|' + x.uid, uid: x.uid, anzeigeName: x.text, menge: '', rezepte: new Set(), extra: true }));
    if (eigene.length) gruppen.push({ titel: 'Eigene Einträge', liste: eigene });
    const vorrat = posten.filter((p) => p.vorrat).sort((a, b) => a.anzeigeName.localeCompare(b.anzeigeName, 'de'));
    if (vorrat.length) gruppen.push({ titel: 'Vorrat prüfen', liste: vorrat, vorrat: true });
    // Was zuhause ist, aus allen Gruppen in "Schon zuhause" verschieben
    const da = [];
    for (const g of gruppen) {
      if (g.titel === 'Eigene Einträge') continue;
      g.liste = g.liste.filter((p) => (istZuhause(p.name) ? (da.push(p), false) : true));
    }
    const ergebnis = gruppen.filter((g) => g.liste.length);
    if (da.length) ergebnis.push({ titel: 'Schon zuhause', liste: da.sort((a, b) => a.anzeigeName.localeCompare(b.anzeigeName, 'de')), zuhause: true });
    return ergebnis;
  }

  function alsText(gruppen, markdown) {
    const datum = new Date().toLocaleDateString('de-DE');
    const fuer = fuerEinkauf().map((e) => `${nachId[e.id].titel} (${e.personen} P.)`).join(', ');
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
    const offen = gruppen.filter((g) => !g.zuhause).reduce((n, g) => n + g.liste.filter((p) => !abgehakt[p.schluessel]).length, 0);

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
        <span class="ek-chip">${esc(nachId[e.id].titel)} <span class="klein">${e.personen} P.</span>${plan.includes(e) ? ' <span class="klein nur-bildschirm">· Plan</span>' : `<button type="button" class="nur-bildschirm" data-weg-liste="${e.uid}" aria-label="Von der Liste nehmen">×</button>`}</span>`).join('<span class="nur-druck">, </span>')}</div>` : ''}
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
                    : `<button type="button" class="knopf leise icon-knopf nur-bildschirm" data-da="${esc(p.name)}" aria-label="Hab ich zuhause" title="Hab ich zuhause">${svg('haus')}</button>`}
                </li>`).join('')}
            </ul>
          </section>`).join('')}
      </div>
      ${leer ? '' : `<p class="nur-bildschirm klein">${offen} offen · Antippen zum Abhaken · <a href="#" id="ek-zuruecksetzen">Haken zurücksetzen</a>${liste.length || extras.length ? ' · <a href="#" id="ek-leeren">Liste leeren</a>' : ''}</p>`}`;

    app.querySelectorAll('.ek-posten').forEach((li) => li.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-extra], [data-da], [data-nicht-da]')) return;
      const k = li.dataset.k;
      if (abgehakt[k]) delete abgehakt[k]; else abgehakt[k] = true;
      sichern();
      li.classList.toggle('erledigt');
    }));
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
    const an = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
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
    const reihenfolge = [...gruppen.keys()].sort((a, b) => Zutaten.KATEGORIEN.indexOf(a) - Zutaten.KATEGORIEN.indexOf(b));

    app.innerHTML = `
      <div class="werkzeuge">
        <h1>Zuhause</h1>
        <span class="abstand"></span>
        ${zuhause.length ? `<button class="knopf leise nur-bildschirm" id="zh-leeren">${svg('muell')} Leeren</button>` : ''}
      </div>
      <p class="hinweis">Was du da hast, landet auf der Einkaufsliste unter „Schon zuhause“ statt auf dem Zettel.
        In der Rezeptübersicht kannst du nach <a href="#/?o=zuhause">„Am meisten zuhause“</a> sortieren.</p>
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

  function melden(text, link, linkText) {
    const el = document.getElementById('meldung');
    el.innerHTML = esc(text) + (link ? ` <a href="${link}">${esc(linkText)}</a>` : '');
    el.classList.add('sichtbar');
    clearTimeout(melden.t);
    melden.t = setTimeout(() => el.classList.remove('sichtbar'), link ? 4000 : 2200);
  }

  // ---------------------------------------------------------------- Druck
  // Vor dem Drucken das Druckbild aktivieren und jedes Rezept ausmessen:
  // Ist es nur etwas zu lang, wird es leicht verkleinert (bis 85 %), damit es auf eine A4-Seite passt.
  // Bräuchte es mehr, bleibt es in normaler Größe und läuft sauber auf eine zweite Seite.
  const SEITE_MM = 297 - 15 - 14 - 3;   // A4 minus Ränder minus Sicherheit
  const BREITE_MM = 180;
  const PX_JE_MM = 96 / 25.4;
  const MIN_ZOOM = 0.85;
  function druckVorbereiten() {
    document.body.classList.add('druck');
    document.querySelectorAll('.rezept').forEach((el) => {
      el.style.zoom = ''; el.style.width = ''; el.classList.remove('zweiseitig');
      // Tipps in die kürzere Spalte (meist unter die Zubereitung, wenn die Zutatenliste lang ist)
      const tipps = el.querySelector('.r-tipps'), links = el.querySelector('.r-links'), rechts = el.querySelector('.r-schritte');
      if (tipps && links && rechts) {
        links.appendChild(tipps);
        if (links.getBoundingClientRect().height > rechts.getBoundingClientRect().height + tipps.getBoundingClientRect().height) rechts.appendChild(tipps);
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
      const tipps = el.querySelector('.r-tipps'), links = el.querySelector('.r-links');
      if (tipps && links) links.appendChild(tipps);
    });
  }
  window.addEventListener('beforeprint', druckVorbereiten);
  window.addEventListener('afterprint', druckEnde);
  window.RezeptDruck = { vorbereiten: druckVorbereiten, ende: druckEnde };

  // ---------------------------------------------------------------- Start
  window.addEventListener('hashchange', zeichnen);
  window.addEventListener('storage', () => {
    plan = speicher.lesen('plan', []); abgehakt = speicher.lesen('abgehakt', {}); extras = speicher.lesen('extras', []); liste = speicher.lesen('liste', []); zuhause = speicher.lesen('zuhause', []);
    zeichnen();
  });
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = svg(el.dataset.icon); });
  // Browser bitten, die Daten dauerhaft zu behalten (nicht bei Speicherknappheit löschen)
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* egal */ }
  laden().then(zeichnen);
})();
