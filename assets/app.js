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
  const sichern = () => {
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
    const f = format(m.wert, m.basis, { ganz: info.ganz, einheit: m.einheit });
    const menge = f.zahl + (f.einheit ? ' ' + f.einheit : '');
    const plural = f.wert > 1 && !f.einheit && z.mehrzahl;
    return { menge, name: plural ? z.mehrzahl : z.name, info };
  }

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
    document.querySelectorAll('.nav a').forEach((a) => {
      a.classList.toggle('aktiv', ('#/' + (teile[0] || '')) === a.getAttribute('href'));
    });
    document.getElementById('plan-zahl').textContent = plan.length || '';
    document.body.dataset.seite = teile[0] || 'start';

    if (teile[0] === 'rezept' && nachId[teile[1]]) {
      const r = nachId[teile[1]];
      seiteRezept(r, begrenzen(q.get('p') || r.personen || STANDARD_PERSONEN));
    } else if (teile[0] === 'plan') seitePlan();
    else if (teile[0] === 'einkauf') seiteEinkauf();
    else if (teile[0] === 'kochbuch') seiteKochbuch(q);
    else seiteUebersicht(q);
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- Übersicht
  function seiteUebersicht(q) {
    document.title = 'Rezepte';
    const suche = q.get('s') || '';
    const kat = q.get('k') || '';
    const kategorien = [...new Set(rezepte.map((r) => r.kategorie).filter(Boolean))].sort();
    const n = Zutaten.normal(suche);
    const treffer = rezepte.filter((r) => {
      if (kat && r.kategorie !== kat) return false;
      if (!n) return true;
      const text = Zutaten.normal([r.titel, r.beschreibung, r.kategorie, (r.tags || []).join(' '),
        nurZutaten(r).map((z) => z.name).join(' ')].join(' '));
      return n.split(' ').every((w) => text.includes(w));
    });

    app.innerHTML = `
      <section class="kopf-seite nur-bildschirm">
        <h1>Rezepte</h1>
        <div class="filter">
          <label class="suchfeld">${svg('suche')}
            <input id="suche" type="search" placeholder="Suchen: Titel, Zutat, Tag …" value="${esc(suche)}">
          </label>
          <div class="chips">
            <a class="chip ${kat ? '' : 'aktiv'}" href="#/?s=${encodeURIComponent(suche)}">Alle</a>
            ${kategorien.map((k) => `<a class="chip ${k === kat ? 'aktiv' : ''}" href="#/?k=${encodeURIComponent(k)}&s=${encodeURIComponent(suche)}">${esc(k)}</a>`).join('')}
          </div>
        </div>
      </section>
      ${ladefehler.length ? `<p class="hinweis fehler">Nicht geladen: ${ladefehler.map(esc).join(', ')} – Datei in /rezepte prüfen.</p>` : ''}
      <div class="karten">
        ${treffer.map(karte).join('') || '<p class="leer">Keine Rezepte gefunden.</p>'}
      </div>`;

    const feld = document.getElementById('suche');
    let t;
    feld.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const p = new URLSearchParams();
        if (feld.value) p.set('s', feld.value);
        if (kat) p.set('k', kat);
        history.replaceState(null, '', '#/?' + p.toString());
        const pos = feld.selectionStart;
        zeichnen();
        const neu = document.getElementById('suche');
        neu.focus(); neu.setSelectionRange(pos, pos);
      }, 200);
    });
  }

  function karte(r) {
    const z = gesamtzeit(r.zeit);
    return `
      <a class="karte" href="#/rezept/${esc(r.id)}">
        ${r.bild ? `<img src="${esc(r.bild)}" alt="" loading="lazy">` : ''}
        <span class="karte-kat">${esc(r.kategorie || '')}</span>
        <h2>${esc(r.titel)}</h2>
        ${r.beschreibung ? `<p>${esc(r.beschreibung)}</p>` : ''}
        <span class="karte-meta">
          ${z ? `<span>${svg('uhr')} ${dauer(z)}</span>` : ''}
          <span>${svg('muetze')} ${esc(r.schwierigkeit || '')}</span>
        </span>
      </a>`;
  }

  // ---------------------------------------------------------------- Rezept
  function rezeptHTML(r, personen, interaktiv) {
    const faktor = personen / (r.personen || STANDARD_PERSONEN);
    const zg = gesamtzeit(r.zeit);
    const stufe = SCHWIERIGKEIT[r.schwierigkeit] || 1;

    const zutaten = (r.zutaten || []).map((z) => {
      if (z.abschnitt) return `<li class="abschnitt">${esc(z.abschnitt)}</li>`;
      const t = zutatText(z, faktor);
      return `<li class="zutat${z.optional ? ' optional' : ''}">
          <span class="z-icon">${t.info.icon ? svg(t.info.icon) : ''}</span>
          <span class="z-menge">${esc(t.menge)}</span>
          <span class="z-name">${esc(t.name)}${z.optional ? ' <em>(optional)</em>' : ''}${z.hinweis ? `<small>${esc(z.hinweis)}</small>` : ''}${!t.menge && z.menge == null ? '<small>nach Geschmack</small>' : ''}</span>
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

        <div class="r-inhalt">
          <section class="r-zutaten">
            <h2>Zutaten</h2>
            <ul>${zutaten}</ul>
          </section>
          <section class="r-schritte">
            <h2>Zubereitung</h2>
            ${schritte}
          </section>
        </div>

        ${(r.tipps && r.tipps.length) ? `<section class="r-tipps"><h2>Tipps</h2><ul>${r.tipps.map((t) => `<li>${fett(t)}</li>`).join('')}</ul></section>` : ''}
        ${r.quelle ? `<p class="r-quelle">Quelle: ${esc(r.quelle)}</p>` : ''}
      </article>`;
  }

  function seiteRezept(r, personen) {
    document.title = r.titel + ' – Rezepte';
    app.innerHTML = `
      <div class="werkzeuge nur-bildschirm">
        <a class="knopf leise" href="#/">${svg('zurueck')} Alle Rezepte</a>
        <span class="abstand"></span>
        <button class="knopf" id="zum-plan">${svg('kalender')} Zum Wochenplan</button>
        <button class="knopf haupt" onclick="window.print()">${svg('drucker')} Drucken</button>
      </div>
      ${rezeptHTML(r, personen, true)}`;

    app.querySelectorAll('.stepper button').forEach((b) => b.addEventListener('click', () => {
      history.replaceState(null, '', '#/rezept/' + r.id + '?p=' + begrenzen(b.dataset.p));
      seiteRezept(r, begrenzen(b.dataset.p));
    }));
    document.getElementById('zum-plan').addEventListener('click', (e) => {
      plan.push({ uid: uid(), id: r.id, personen, tag: '' });
      sichern();
      document.getElementById('plan-zahl').textContent = plan.length;
      e.currentTarget.innerHTML = svg('haken') + ' Im Plan';
      melden(r.titel + ' für ' + personen + ' Personen eingeplant');
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
    for (const e of plan) {
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
    return gruppen;
  }

  function alsText(gruppen, markdown) {
    const datum = new Date().toLocaleDateString('de-DE');
    const fuer = plan.map((e) => `${nachId[e.id].titel} (${e.personen} P.)`).join(', ');
    const box = markdown ? '- [ ] ' : '☐ ';
    let t = (markdown ? '# ' : '') + 'Einkaufsliste – ' + datum + '\n';
    if (fuer) t += (markdown ? '\n_Für: ' + fuer + '_\n' : 'Für: ' + fuer + '\n');
    for (const g of gruppen) {
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
    const leer = !plan.length && !extras.length;
    const offen = gruppen.reduce((n, g) => n + g.liste.filter((p) => !abgehakt[p.schluessel]).length, 0);

    app.innerHTML = `
      <div class="werkzeuge">
        <h1>Einkaufsliste</h1>
        <span class="abstand"></span>
        ${leer ? '' : `
        <button class="knopf nur-bildschirm" id="ek-kopieren">${svg('kopieren')} Kopieren</button>
        <button class="knopf nur-bildschirm" id="ek-txt">${svg('download')} .txt</button>
        <button class="knopf nur-bildschirm" id="ek-md">${svg('download')} .md</button>
        ${navigator.share ? `<button class="knopf nur-bildschirm" id="ek-teilen">${svg('teilen')} Teilen</button>` : ''}
        <button class="knopf haupt nur-bildschirm" onclick="window.print()">${svg('drucker')} Drucken</button>`}
      </div>
      ${plan.length ? `<p class="ek-fuer">Für: ${plan.map((e) => `${esc(nachId[e.id].titel)} <span class="klein">(${e.personen} P.)</span>`).join(', ')}</p>` : ''}
      ${leer ? `<p class="leer">Die Einkaufsliste entsteht aus dem <a href="#/plan">Wochenplan</a>. Plane zuerst ein paar Rezepte ein.</p>` : ''}
      <form class="ek-neu nur-bildschirm" id="ek-neu">
        <input id="ek-text" placeholder="Eigener Eintrag, z. B. Spülmittel" autocomplete="off">
        <button class="knopf" type="submit">${svg('plus')} Hinzufügen</button>
      </form>
      <div class="ek-gruppen">
        ${gruppen.map((g) => `
          <section class="ek-gruppe${g.vorrat ? ' vorrat' : ''}">
            <h2>${esc(g.titel)}</h2>
            ${g.vorrat ? '<p class="klein">Meist im Haus – kurz nachsehen.</p>' : ''}
            <ul>
              ${g.liste.map((p) => `
                <li class="ek-posten${abgehakt[p.schluessel] ? ' erledigt' : ''}" data-k="${esc(p.schluessel)}" title="${esc([...p.rezepte].join(', '))}">
                  <span class="box">${svg('haken')}</span>
                  <span class="ek-icon">${p.icon ? svg(p.icon) : ''}</span>
                  <span class="ek-menge">${esc(p.menge)}</span>
                  <span class="ek-name">${esc(p.anzeigeName)}${p.optional ? ' <em>(optional)</em>' : ''}</span>
                  ${p.extra ? `<button type="button" class="knopf leise icon-knopf nur-bildschirm" data-extra="${p.uid}" aria-label="Entfernen">${svg('muell')}</button>` : ''}
                </li>`).join('')}
            </ul>
          </section>`).join('')}
      </div>
      ${leer ? '' : `<p class="nur-bildschirm klein">${offen} offen · Antippen zum Abhaken · <a href="#" id="ek-zuruecksetzen">Haken zurücksetzen</a></p>`}`;

    app.querySelectorAll('.ek-posten').forEach((li) => li.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-extra]')) return;
      const k = li.dataset.k;
      if (abgehakt[k]) delete abgehakt[k]; else abgehakt[k] = true;
      sichern();
      li.classList.toggle('erledigt');
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
    an('ek-kopieren', () => kopieren(alsText(einkaufsliste(), false)));
    an('ek-txt', () => herunterladen('einkaufsliste.txt', alsText(einkaufsliste(), false), 'text/plain'));
    an('ek-md', () => herunterladen('einkaufsliste.md', alsText(einkaufsliste(), true), 'text/markdown'));
    an('ek-teilen', () => navigator.share({ title: 'Einkaufsliste', text: alsText(einkaufsliste(), false) }).catch(() => {}));
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

  function melden(text) {
    const el = document.getElementById('meldung');
    el.textContent = text;
    el.classList.add('sichtbar');
    clearTimeout(melden.t);
    melden.t = setTimeout(() => el.classList.remove('sichtbar'), 2200);
  }

  // ---------------------------------------------------------------- Start
  window.addEventListener('hashchange', zeichnen);
  window.addEventListener('storage', () => {
    plan = speicher.lesen('plan', []); abgehakt = speicher.lesen('abgehakt', {}); extras = speicher.lesen('extras', []);
    zeichnen();
  });
  laden().then(zeichnen);
})();
