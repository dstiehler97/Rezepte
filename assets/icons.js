/*
 * Icons (SVG, 24×24, Strichzeichnung in currentColor -> druckt sauber s/w)
 * Die gleichen Icons liegen als einzelne Dateien in /icons
 * (erzeugt mit: node tools/pruefen.js).
 */
(function (g) {
  'use strict';

  const DOT = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r || 0.75}" fill="currentColor" stroke="none"/>`;

  /** Zahnrad mit n Zähnen (Außen-/Innenradius), als geschlossener Pfad */
  function ZAHNRAD(n, aussen, innen) {
    const p = [];
    const pkt = (r, grad) => { const w = grad * Math.PI / 180; return (12 + r * Math.cos(w)).toFixed(2) + ' ' + (12 + r * Math.sin(w)).toFixed(2); };
    for (let i = 0; i < n; i++) {
      const a = i * 360 / n;
      p.push(pkt(innen, a - 15), pkt(aussen, a - 9), pkt(aussen, a + 9), pkt(innen, a + 15));
    }
    return '<path d="M' + p.join('L') + 'z"/>';
  }

  const ICONS = {
    // ---------- Zutaten ----------
    salz:
      '<path d="M7.5 10h9l-.9 10.1a1 1 0 0 1-1 .9H9.4a1 1 0 0 1-1-.9z"/>' +
      '<path d="M7.5 10a4.5 4.5 0 0 1 9 0"/>' +
      DOT(12, 6.9) + DOT(9.9, 8.2) + DOT(14.1, 8.2) +
      '<path d="M13.4 13.4c-.3-.4-.8-.7-1.4-.7-.8 0-1.4.4-1.4 1s.6.9 1.4 1.1c.8.2 1.5.5 1.5 1.2s-.7 1.1-1.5 1.1c-.7 0-1.3-.3-1.6-.8"/>',
    pfeffer:
      '<circle cx="12" cy="3.6" r="1.3"/>' +
      '<path d="M12 4.9v1.6"/>' +
      '<path d="M8.5 6.5h7"/>' +
      '<path d="M9.5 6.5V10c0 1.2-1.5 2-1.5 4v5.5A1.5 1.5 0 0 0 9.5 21h5a1.5 1.5 0 0 0 1.5-1.5V14c0-2-1.5-2.8-1.5-4V6.5"/>' +
      DOT(10.8, 16.2, 0.7) + DOT(13.2, 16.2, 0.7) + DOT(12, 18.3, 0.7),
    oel:
      '<path d="M10 2.5h4v3l1.6 2.6a3 3 0 0 1 .4 1.5V20a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20V9.6a3 3 0 0 1 .4-1.5L10 5.5z"/>' +
      '<path d="M10 5.5h4"/>' +
      '<path d="M12 12.2c-1.3 1.6-1.9 2.6-1.9 3.6a1.9 1.9 0 0 0 3.8 0c0-1-.6-2-1.9-3.6z"/>',
    zucker:
      '<path d="M3 12.5l5-2.5 5 2.5v6L8 21l-5-2.5z"/>' +
      '<path d="M3 12.5L8 15l5-2.5M8 15v6"/>' +
      '<path d="M11 6l5-2.5L21 6v6l-5 2.5-3-1.5"/>' +
      '<path d="M11 6l5 2.5L21 6M16 8.5v6"/>',
    mehl:
      '<path d="M7 6.5h10l1.4 13.4a1 1 0 0 1-1 1.1H6.6a1 1 0 0 1-1-1.1z"/>' +
      '<path d="M7 6.5L8 3h8l1 3.5"/>' +
      '<path d="M12 19v-6.5"/>' +
      '<path d="M12 14.5c-1.3 0-2.2-.9-2.2-2.2 1.3 0 2.2.9 2.2 2.2zm0 0c1.3 0 2.2-.9 2.2-2.2-1.3 0-2.2.9-2.2 2.2z"/>' +
      '<path d="M12 12.3c-1 0-1.6-.7-1.6-1.7 1 0 1.6.7 1.6 1.7zm0 0c1 0 1.6-.7 1.6-1.7-1 0-1.6.7-1.6 1.7z"/>',
    butter:
      '<path d="M3 13l4-4h14l-4 4z"/>' +
      '<path d="M3 13v5h14v-5M17 18l4-4V9"/>' +
      '<path d="M7.5 13v5"/>',
    ei:
      '<path d="M12 3c3.6 0 6.5 5.6 6.5 10.2a6.5 6.5 0 0 1-13 0C5.5 8.6 8.4 3 12 3z"/>',
    milch:
      '<path d="M9 2.5h6v2H9z"/>' +
      '<path d="M9 4.5L7 8.5V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.5l-2-4"/>' +
      '<path d="M7 8.5h10"/>' +
      '<path d="M7 12.5c1.7 1 3.3 1 5 0s3.3-1 5 0"/>',
    kaese:
      '<path d="M3 17L15 7.5l6 3V18H3z"/>' +
      '<path d="M3 17h18"/>' +
      '<circle cx="10" cy="14" r="1.2"/><circle cx="16" cy="13" r=".9"/><circle cx="14.5" cy="16.2" r=".5"/>',
    knoblauch:
      '<path d="M12 3c0 2-1.2 3-3 4.3S5 10.8 5 14.3C5 18 8 21 12 21s7-3 7-6.7-2.2-5.7-4-7S12 5 12 3z"/>' +
      '<path d="M12 8c-1.6 2-2.2 4.4-2.2 7s.8 4.6 2.2 6M12 8c1.6 2 2.2 4.4 2.2 7s-.8 4.6-2.2 6"/>',
    zwiebel:
      '<path d="M12 2.5V6"/>' +
      '<path d="M12 6c-1.2 2-6 3.8-6 8.6a6 6 0 0 0 12 0C18 9.8 13.2 8 12 6z"/>' +
      '<path d="M12 6c-1.4 2.6-2.8 5-2.8 8.6S10.6 20.6 12 20.6M12 6c1.4 2.6 2.8 5 2.8 8.6s-1.4 6-2.8 6"/>',
    tomate:
      '<circle cx="12" cy="13.5" r="7.5"/>' +
      '<path d="M12 6l-2.2-2 .4 2.9-2.7.3 2.4 1.4M12 6l2.2-2-.4 2.9 2.7.3-2.4 1.4M12 6V3"/>',
    zitrone:
      '<ellipse cx="12" cy="12" rx="8" ry="5.8" transform="rotate(-45 12 12)"/>' +
      '<path d="M17.7 6.3l1.8-1.8M6.3 17.7l-1.8 1.8"/>' +
      '<path d="M9.2 14.8c-.9-1.6-.2-3.8 1.6-5.6"/>',
    chili:
      '<path d="M16.5 7.5c-.5 5-4.5 10-12 12.5 7.2 2.4 14.5-1.5 15.4-8.2.2-1.6-.3-3.2-1.4-4.3z"/>' +
      '<path d="M16.5 7.5c.8-.6 1.8-.5 2.4 0"/>' +
      '<path d="M17.6 7.1c0-1.8.6-3.2 2.2-4.1"/>',
    kraeuter:
      '<path d="M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14z"/>' +
      '<path d="M5 19L14.5 9.5M9.5 14.5h4M12 12V8.5"/>',
    gewuerz:
      '<path d="M8 8h8v11.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5z"/>' +
      '<path d="M8.5 4h7v4h-7z"/>' +
      '<path d="M8 12.5h8M8 17h8"/>',
    wasser:
      '<path d="M12 3c-3.2 4.3-6 7.7-6 11a6 6 0 0 0 12 0c0-3.3-2.8-6.7-6-11z"/>' +
      '<path d="M9.3 14.5a2.8 2.8 0 0 0 2.7 2.7"/>',
    karotte:
      '<path d="M15 9L4 20c-.6.6.1 1.1.6.7L16.5 11z"/>' +
      '<path d="M14 8a2.5 2.5 0 0 1 3.5 0l-1 3"/>' +
      '<path d="M15.5 8.5L19 3M16.8 9.5L21 7.5M15.2 8.3L15 4"/>' +
      '<path d="M8.5 16.5l1 1M11 14l1 1"/>',
    kartoffel:
      '<path d="M6.5 6.5c3-3 8.5-3.5 11.2-.8s2.2 8.2-.8 11.2-8.5 3.5-11.2.8-2.2-8.2.8-11.2z"/>' +
      DOT(9, 9, 0.7) + DOT(14.5, 9.5, 0.7) + DOT(11.5, 14.5, 0.7),
    lauch:
      '<path d="M3.5 18.5l2 2 7-7-2-2z"/>' +
      '<path d="M10.5 11.5c.5-3.5 2.5-6.5 6-8.5-.5 3.5-1.8 6-4 8.5"/>' +
      '<path d="M12.5 13.5c3.5-.5 6.5-2.5 8.5-6-3.5.5-6 1.8-8.5 4"/>' +
      '<path d="M5 19l.8.8M7 17l.8.8"/>',
    nuss:
      '<path d="M9 3.5c2.6 0 4.2 2 4 4.4-.1 1.2.5 2 1.6 2.6 2.2 1.2 3.4 3.3 2.6 5.8-.9 2.7-3.9 4.2-6.6 3.5-2.4-.6-3.6-2.4-3.8-4.4-.1-1.2-.6-1.9-1.6-2.6C3.4 11.4 3 9 4 7c1-2.2 2.8-3.5 5-3.5z"/>' +
      '<path d="M8 7.5c.3.6.9 1 1.6 1M11.5 15c.5.4 1.2.6 1.9.4"/>',
    fleisch:
      '<path d="M5 9.5C6.5 5.5 12 4 16.5 5.5s5 6 3.5 9-6 5.5-10.5 4.5S3.5 13.5 5 9.5z"/>' +
      '<path d="M15.5 9.5c0 1.4-1.1 2.5-2.5 2.5S10.5 10.9 10.5 9.5 11.6 7 13 7s2.5 1.1 2.5 2.5z"/>',
    fisch:
      '<path d="M2.5 12c3-4 7.5-5.2 11.5-4.2 2 .5 3.7 2 4.7 4.2-1 2.2-2.7 3.7-4.7 4.2-4 1-8.5-.2-11.5-4.2z"/>' +
      '<path d="M18.7 12l2.8-3.2v6.4z"/>' + DOT(6.5, 11.2, 0.8),
    nudeln:
      '<path d="M3 12h18a9 9 0 0 1-18 0z"/>' +
      '<path d="M8 12c0-3 1-6 1-9M12 12c0-3-1-6 .5-9M16 12c0-3.5 1-6 0-9"/>',
    reis:
      '<path d="M3 11h18a9 9 0 0 1-18 0z"/>' +
      '<path d="M6 11c0-2 1.5-3.5 3-3.5.5-1.5 2-2.5 3-2.5s2.5 1 3 2.5c1.5 0 3 1.5 3 3.5"/>',

    // ---------- Oberfläche ----------
    uhr: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    personen:
      '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/>' +
      '<path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    muetze:
      '<path d="M7 14.5a4 4 0 0 1-1.1-7.8A5 5 0 0 1 12 3.5a5 5 0 0 1 6.1 3.2 4 4 0 0 1-1.1 7.8V20H7z"/>' +
      '<path d="M7 17h10"/>',
    drucker:
      '<path d="M7 8V3h10v5"/>' +
      '<path d="M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-6A1.5 1.5 0 0 1 4.5 8h15A1.5 1.5 0 0 1 21 9.5v6a1.5 1.5 0 0 1-1.5 1.5H17"/>' +
      '<path d="M7 13h10v8H7z"/>',
    korb:
      '<path d="M3 9h18l-2 11H5z"/><path d="M8 9l3-6M16 9l-3-6M9 13v4M15 13v4M12 13v4"/>',
    kalender:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    buch:
      '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/>' +
      '<path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="M8 7h8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    haus: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    minus: '<path d="M5 12h14"/>',
    suche: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    zurueck: '<path d="M15 5l-7 7 7 7"/>',
    kopieren: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V4.5A1.5 1.5 0 0 0 14.5 3h-10A1.5 1.5 0 0 0 3 4.5v10A1.5 1.5 0 0 0 4.5 16H8"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    teilen: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6"/>',
    muell: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    haken: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    zahnrad: ZAHNRAD(8, 9.5, 7) + '<circle cx="12" cy="12" r="3"/>',
    topf:
      '<path d="M4 10h16v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"/>' +
      '<path d="M2 10h20M10 7h4"/><path d="M9 4.5c.5-.7.5-1.3 0-2M12 4.5c.5-.7.5-1.3 0-2M15 4.5c.5-.7.5-1.3 0-2"/>',
    stoppuhr: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.5h4M18.5 6l1.5-1.5"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    start: '<path d="M7 4.5v15l12-7.5z"/>',
    schliessen: '<path d="M6 6l12 12M18 6L6 18"/>',
    vor: '<path d="M9 5l7 7-7 7"/>',
    liste: '<path d="M9 6h11M9 12h11M9 18h11"/>' + DOT(4.5, 6, 1) + DOT(4.5, 12, 1) + DOT(4.5, 18, 1),
    glocke: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    wuerfel: '<rect x="4" y="4" width="16" height="16" rx="3"/>' + DOT(8.5, 8.5, 1.2) + DOT(15.5, 8.5, 1.2) + DOT(12, 12, 1.2) + DOT(8.5, 15.5, 1.2) + DOT(15.5, 15.5, 1.2),
    funke: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    hoch: '<path d="M5 15l7-7 7 7"/>',
    runter: '<path d="M5 9l7 7 7-7"/>',
  };

  function svg(name, klasse) {
    const inhalt = ICONS[name];
    if (!inhalt) return '';
    return '<svg class="icon ' + (klasse || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inhalt + '</svg>';
  }

  /** Eigenständige SVG-Datei (für den Export nach /icons) */
  function datei(name) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      ICONS[name] + '</svg>\n';
  }

  g.Icons = { ICONS, svg, datei };
})(globalThis);
