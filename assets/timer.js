/*
 * Timer: Zeitangaben in Schritten („10 Minuten“, „ca. 5 Min.“, „3–4 Minuten“) werden zu antippbaren Chips.
 * Laufende Timer stehen in einer schwebenden Leiste über der Tab-Leiste (alle Seiten).
 *
 *   Timer.chips(html)   Zeitangaben in fertigem HTML (nach fett()) in Chips umwandeln.
 *                       Name, Zusatz und Ziel-Link des Timers kommen vom nächsten Eltern-Element mit
 *                       data-timer-name / data-timer-zusatz / data-timer-link (z. B. „Köttbullar“, „Schritt 4“).
 *   Timer.starten({ name, zusatz, label, sek, link })
 *   Timer.markieren()   Chips mit laufendem Timer hervorheben (nach dem Neuzeichnen einer Seite)
 *
 * Gerechnet wird mit dem Endzeitpunkt (Date.now), nicht durch Mitzählen – so stimmt die Restzeit
 * auch nach Hintergrund/Bildschirmsperre. Laufende Timer liegen in localStorage ('rezepte.timer').
 */
(function (g) {
  'use strict';

  const SCHLUESSEL = 'rezepte.timer';
  const ALARM_MAX_MS = 3 * 60 * 1000;   // so lange piept ein abgelaufener Timer höchstens
  const { svg } = g.Icons;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** [{uid, name, zusatz, label, link, sek (ursprünglich), dauer (ms, mit +1 Min.), ende (Zeitpunkt, wenn läuft),
   *    rest (ms, wenn pausiert), fertig (Zeitpunkt des Ablaufs)}] */
  const uid = () => Math.random().toString(36).slice(2, 9);
  let timer = lesen();
  /** Gespeicherte Timer – beschädigte Werte (kein Array, falsche Felder) werden verworfen statt die Seite zu stören */
  function lesen() {
    let l;
    try { l = JSON.parse(localStorage.getItem(SCHLUESSEL)); } catch (e) { return []; }
    if (!Array.isArray(l)) return [];
    const zahl = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);
    return l.filter((t) => t && typeof t === 'object' && !Array.isArray(t) && zahl(t.sek) > 0 && (t.ende || t.rest || t.fertig))
      .map((t) => ({ uid: String(t.uid || uid()), name: String(t.name || 'Timer'), zusatz: String(t.zusatz || ''), label: String(t.label || ''),
        link: typeof t.link === 'string' && t.link.startsWith('#') ? t.link : '', sek: zahl(t.sek), dauer: zahl(t.dauer) || zahl(t.sek) * 1000,
        ende: zahl(t.ende), rest: zahl(t.rest), fertig: zahl(t.fertig) }));
  }
  function sichern() { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(timer)); } catch (e) { /* privat-modus */ } }

  // ---------------------------------------------------------------- Erkennen
  // Zahl, optional Spanne („3–4“, „5 bis 10“), dann Einheit. Bei Spannen zählt die obere Zahl.
  const MUSTER = /\b(\d+(?:,\d+)?)(?:\s*(?:–|-|bis)\s*(\d+(?:,\d+)?))?\s*(Sekunden|Sek\.|Minuten|Minute|Min\.|Min|Stunden|Stunde|Std\.)(?![a-zäöüß])/g;
  const FAKTOR = { s: 1, m: 60, h: 3600 };
  const art = (einheit) => (/^S(ek|ekunden)/.test(einheit) ? 's' : /^St/.test(einheit) ? 'h' : 'm');
  const kurz = { s: 'Sek.', m: 'Min.', h: 'Std.' };

  function chips(html) {
    return html.replace(MUSTER, (ganz, von, bis, einheit) => {
      const a = art(einheit);
      const sek = Math.round(parseFloat((bis || von).replace(',', '.')) * FAKTOR[a]);
      if (!sek || sek > 24 * 3600) return ganz;
      const label = (bis ? von + '–' + bis : von) + ' ' + kurz[a];
      return `<button type="button" class="timer-chip" data-sek="${sek}" data-label="${esc(label)}" aria-label="Timer ${esc(label)} starten">${svg('stoppuhr')}${ganz}</button>`;
    });
  }

  // ---------------------------------------------------------------- Ton & Vibration
  // iOS spielt Web Audio nur nach einer Nutzerinteraktion: der AudioContext wird beim Antippen angelegt/entsperrt.
  let ctx = null;
  function entsperren() {
    try {
      const AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return;
      if (!ctx) {
        ctx = new AC();
        const quelle = ctx.createBufferSource();   // stiller Puffer, entsperrt iOS
        quelle.buffer = ctx.createBuffer(1, 1, 22050);
        quelle.connect(ctx.destination); quelle.start(0);
      }
      if (ctx.state !== 'running') ctx.resume();
    } catch (e) { /* ohne Ton */ }
  }
  function piepen(anzahl) {
    if (!ctx) return;
    try {
      if (ctx.state !== 'running') ctx.resume();
      const t0 = ctx.currentTime + 0.05;
      for (let i = 0; i < (anzahl || 3); i++) {
        const o = ctx.createOscillator(), v = ctx.createGain();
        o.type = 'square'; o.frequency.value = 880;
        const t = t0 + i * 0.28;
        v.gain.setValueAtTime(0.0001, t);
        v.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
        v.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(v); v.connect(ctx.destination);
        o.start(t); o.stop(t + 0.2);
      }
    } catch (e) { /* egal */ }
  }
  function vibrieren() { try { if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 250]); } catch (e) { /* egal */ } }
  /** Für „Ton testen“ in den Einstellungen (muss aus einem Klick heraus aufgerufen werden) */
  function testen() { entsperren(); piepen(3); vibrieren(); }

  // ---------------------------------------------------------------- Steuern
  const restMs = (t) => (t.fertig ? 0 : t.ende ? Math.max(0, t.ende - Date.now()) : t.rest);

  function starten({ name, zusatz, label, sek, link }) {
    entsperren();
    const jetzt = Date.now();
    name = name || 'Timer'; zusatz = zusatz || '';
    // versehentlicher Doppeltipp: gleicher Timer gerade eben gestartet
    if (timer.some((t) => t.name === name && t.zusatz === zusatz && t.sek === sek && t.ende && jetzt - (t.ende - t.dauer) < 2500)) return;
    timer.push({ uid: uid(), name, zusatz, label: label || '', link: link || '', sek, dauer: sek * 1000, ende: jetzt + sek * 1000, rest: 0, fertig: 0 });
    aenderung();
  }
  function aktion(id, was) {
    const t = timer.find((x) => x.uid === id);
    if (!t) return;
    if (was === 'weg' || was === 'ok') timer = timer.filter((x) => x !== t);
    else if (was === 'plus') {
      if (t.fertig) { t.fertig = 0; t.ende = Date.now() + 60000; }
      else if (t.ende) t.ende += 60000; else t.rest += 60000;
      t.dauer += 60000;
    } else if (was === 'pause') {
      if (t.ende) { t.rest = Math.max(0, t.ende - Date.now()); t.ende = 0; } else if (!t.fertig) { t.ende = Date.now() + t.rest; t.rest = 0; }
    }
    aenderung();
  }
  function alleBestaetigen() { timer = timer.filter((t) => !t.fertig); aenderung(); }

  function aenderung() { sichern(); zeichnen(); ticken(); }

  // ---------------------------------------------------------------- Anzeige
  let leiste, alarm, takt = 0, letzterPiep = 0;
  const zeit = (ms) => {
    const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0');
  };

  function aufbauen() {
    leiste = document.createElement('div');
    leiste.id = 'timer-leiste';
    leiste.className = 'nur-bildschirm';
    leiste.setAttribute('aria-label', 'Laufende Timer');
    alarm = document.createElement('div');
    alarm.id = 'timer-alarm';
    alarm.className = 'nur-bildschirm';
    alarm.hidden = true;
    alarm.setAttribute('role', 'alertdialog');
    alarm.setAttribute('aria-live', 'assertive');
    document.body.append(leiste, alarm);

    leiste.addEventListener('click', (e) => {
      const b = e.target.closest('[data-t]');
      if (b) { entsperren(); aktion(b.closest('[data-uid]').dataset.uid, b.dataset.t); }
    });
    alarm.addEventListener('click', (e) => { if (e.target.closest('[data-ok]')) alleBestaetigen(); });
    document.addEventListener('click', (e) => {
      const c = e.target.closest('.timer-chip');
      if (!c) return;
      e.preventDefault();
      const k = c.closest('[data-timer-name]');
      const d = k ? k.dataset : {};
      starten({ name: d.timerName, zusatz: d.timerZusatz, link: d.timerLink, label: c.dataset.label, sek: Number(c.dataset.sek) });
    });
    // Jede Berührung entsperrt den Ton (z. B. nach Neuladen mit laufenden Timern)
    document.addEventListener('pointerdown', () => { if (timer.length) entsperren(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ticken(); });
    window.addEventListener('storage', (e) => { if (e.key === SCHLUESSEL) { timer = lesen(); zeichnen(); ticken(); } });
  }

  function zeichnen() {
    if (!leiste) return;
    leiste.innerHTML = timer.map((t) => {
      const zustand = t.fertig ? 'fertig' : t.ende ? 'laeuft' : 'pause';
      const unten = [t.zusatz, t.label, zustand === 'pause' ? 'pausiert' : ''].filter(Boolean).join(' · ');
      const name = `<span class="t-name">${esc(t.name)}<small>${esc(unten)}</small></span>`;
      return `
        <div class="timer t-${zustand}" data-uid="${t.uid}">
          <span class="t-zeit">${t.fertig ? 'Fertig' : zeit(restMs(t))}</span>
          ${t.link ? `<a class="t-link" href="${esc(t.link)}">${name}</a>` : name}
          <button type="button" class="t-knopf" data-t="plus" aria-label="Eine Minute mehr">+1</button>
          ${t.fertig ? '' : `<button type="button" class="t-knopf" data-t="pause" aria-label="${t.ende ? 'Pause' : 'Weiter'}">${svg(t.ende ? 'pause' : 'start')}</button>`}
          <button type="button" class="t-knopf" data-t="weg" aria-label="Timer abbrechen">${svg('schliessen')}</button>
        </div>`;
    }).join('');
    leiste.classList.toggle('sichtbar', timer.length > 0);
    const fertig = timer.filter((t) => t.fertig);
    alarm.hidden = !fertig.length;
    document.body.classList.toggle('timer-alarm-an', fertig.length > 0);
    if (fertig.length) {
      alarm.innerHTML = `
        <div class="ta-karte">
          <span class="ta-icon">${svg('glocke')}</span>
          <strong>Timer abgelaufen</strong>
          <ul>${fertig.map((t) => `<li>${esc(t.name)}<span>${esc([t.zusatz, t.label].filter(Boolean).join(' · '))}</span></li>`).join('')}</ul>
          <button type="button" class="knopf haupt" data-ok>OK</button>
        </div>`;
    }
    markieren();
    window.dispatchEvent(new Event('timerleiste'));
  }

  /** Chips mit laufendem Timer hervorheben (nach jedem Neuzeichnen der Seite aufrufen) */
  function markieren() {
    document.querySelectorAll('.timer-chip.laeuft').forEach((c) => c.classList.remove('laeuft'));
    for (const t of timer.filter((x) => !x.fertig)) {
      document.querySelectorAll(`[data-timer-name="${CSS.escape(t.name)}"][data-timer-zusatz="${CSS.escape(t.zusatz || '')}"] .timer-chip[data-sek="${t.sek}"]`)
        .forEach((c) => c.classList.add('laeuft'));
    }
  }

  /** Restzeiten aktualisieren, Ablauf erkennen; läuft nur, solange es Timer gibt */
  function ticken() {
    if (!leiste) return;
    const jetzt = Date.now();
    let neu = false;
    for (const t of timer) {
      if (t.ende && !t.fertig && t.ende <= jetzt) { t.fertig = t.ende; t.ende = 0; neu = true; }
    }
    if (neu) { sichern(); zeichnen(); letzterPiep = 0; }
    leiste.querySelectorAll('.timer').forEach((el) => {
      const t = timer.find((x) => x.uid === el.dataset.uid);
      if (t && !t.fertig) el.querySelector('.t-zeit').textContent = zeit(restMs(t));
    });
    // Alarm: alle ~2 s piepen und vibrieren, bis bestätigt (höchstens ALARM_MAX_MS)
    const klingeln = timer.filter((t) => t.fertig && jetzt - t.fertig < ALARM_MAX_MS);
    if (klingeln.length && jetzt - letzterPiep > 1900) { letzterPiep = jetzt; piepen(3); vibrieren(); }
    clearTimeout(takt);
    if (timer.some((t) => t.ende || (t.fertig && jetzt - t.fertig < ALARM_MAX_MS))) takt = setTimeout(ticken, 250);
  }

  function init() { aufbauen(); zeichnen(); ticken(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  g.Timer = { chips, starten, testen, markieren, liste: () => timer.slice() };
})(globalThis);
