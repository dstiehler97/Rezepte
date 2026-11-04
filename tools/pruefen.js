#!/usr/bin/env node
/*
 * node tools/pruefen.js
 *  1. prüft alle Rezepte in /rezepte (Pflichtfelder, Einheiten, doppelte IDs)
 *  2. schreibt rezepte/liste.js neu (damit neue Dateien automatisch erscheinen)
 *  3. exportiert alle Icons als einzelne SVG-Dateien nach /icons
 *  4. testet die Rundungsregeln
 *  Außerdem: Nährwerte je Rezept, Warnung bei fehlenden Nährwertdaten,
 *  Fehler wenn Nudeln/Reis nicht als Trockengewicht in g angegeben sind.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WURZEL = path.join(__dirname, '..');
const kontext = { console };
kontext.globalThis = kontext;
vm.createContext(kontext);
for (const f of ['einheiten.js', 'zutaten.js', 'icons.js', 'naehrwerte.js']) {
  vm.runInContext(fs.readFileSync(path.join(WURZEL, 'assets', f), 'utf8'), kontext, { filename: f });
}
const { Einheiten, Zutaten, Icons, Naehrwerte } = kontext;

let fehler = 0;
const melde = (datei, text) => { fehler++; console.log('  ✗ ' + datei + ': ' + text); };

// ---------------------------------------------------------------- 1. Rezepte
const ordner = path.join(WURZEL, 'rezepte');
const dateien = fs.readdirSync(ordner).filter((f) => f.endsWith('.js') && !f.startsWith('_') && f !== 'liste.js').sort();
const ids = new Set();
const ohneKategorie = new Set();
console.log('Rezepte prüfen …');
for (const datei of dateien) {
  const gefunden = [];
  kontext.Rezept = (r) => gefunden.push(r);
  try {
    vm.runInContext(fs.readFileSync(path.join(ordner, datei), 'utf8'), kontext, { filename: datei });
  } catch (e) { melde(datei, 'Syntaxfehler – ' + e.message); continue; }
  if (gefunden.length !== 1) { melde(datei, 'genau ein Rezept({...}) pro Datei erwartet'); continue; }
  const r = gefunden[0];
  const name = datei.replace(/\.js$/, '');
  if (r.id !== name) melde(datei, `id "${r.id}" muss dem Dateinamen "${name}" entsprechen`);
  if (ids.has(r.id)) melde(datei, 'doppelte id ' + r.id);
  ids.add(r.id);
  if (!r.titel) melde(datei, 'titel fehlt');
  if (!Array.isArray(r.zutaten) || !r.zutaten.length) melde(datei, 'zutaten fehlen');
  if (!Array.isArray(r.schritte) || !r.schritte.length) melde(datei, 'schritte fehlen');
  if (r.schwierigkeit && !['einfach', 'mittel', 'anspruchsvoll'].includes(r.schwierigkeit)) melde(datei, 'schwierigkeit: einfach | mittel | anspruchsvoll');
  for (const z of r.zutaten || []) {
    if (z.abschnitt) continue;
    if (!z.name) { melde(datei, 'Zutat ohne name: ' + JSON.stringify(z)); continue; }
    try { Einheiten.skalieren(z, 1); } catch (e) { melde(datei, e.message); }
    if (z.menge != null && typeof z.menge !== 'number') melde(datei, `menge bei ${z.name} muss eine Zahl sein`);
    if (Zutaten.info(z).kategorie === 'Sonstiges' && !z.einkauf) ohneKategorie.add(z.name);
    if (Zutaten.info(z).trocken && z.menge != null && !['g', 'kg'].includes(z.einheit)) melde(datei, `${z.name}: Nudeln/Reis/Getreide immer als Trockengewicht in g angeben`);
  }
  const nw = Naehrwerte.berechnen(r);
  const p = nw.portion;
  console.log(`  ${r.titel}: ${Math.round(p.kcal)} kcal · E ${Math.round(p.eiweiss)} g · KH ${Math.round(p.kh)} g · F ${Math.round(p.fett)} g pro Portion`);
  if (nw.fehlend.length) console.log(`  ! ${datei}: keine Nährwerte für ${nw.fehlend.join(', ')} – in assets/naehrwerte.js ergänzen oder gramm/naehrwerte angeben`);
  for (const s of r.schritte || []) {
    if (typeof s === 'string' && /\d+\s?(g|ml|EL|TL|kg|l)\b/.test(s)) console.log(`  ! ${datei}: Menge im Schritt ("${s.slice(0, 50)}…") – wird nicht umgerechnet`);
  }
}
if (ohneKategorie.size) console.log('  ! ohne Einkaufs-Kategorie (landen unter "Sonstiges"): ' + [...ohneKategorie].join(', '));
console.log(`  ${dateien.length} Rezepte`);

// ---------------------------------------------------------------- 2. liste.js
fs.writeFileSync(path.join(ordner, 'liste.js'),
  '// Automatisch erzeugt von tools/pruefen.js – nicht von Hand bearbeiten.\n' +
  'window.REZEPT_DATEIEN = ' + JSON.stringify(dateien.map((d) => d.replace(/\.js$/, '')), null, 2) + ';\n');

// ---------------------------------------------------------------- 3. Icons
const iconOrdner = path.join(WURZEL, 'icons');
fs.mkdirSync(iconOrdner, { recursive: true });
for (const name of Object.keys(Icons.ICONS)) fs.writeFileSync(path.join(iconOrdner, name + '.svg'), Icons.datei(name));
console.log(`  ${Object.keys(Icons.ICONS).length} Icons nach /icons exportiert`);

// ---------------------------------------------------------------- 4. Rundung
const fall = (menge, einheit, faktor, erwartet, opt) => {
  const m = Einheiten.skalieren({ menge, einheit, name: 'x' }, faktor);
  const f = Einheiten.format(m.wert, m.basis, Object.assign({ einheit: m.einheit }, opt));
  const ist = (f.zahl + ' ' + f.einheit).trim();
  if (ist !== erwartet) melde('Rundung', `${menge} ${einheit || ''} × ${faktor} → "${ist}", erwartet "${erwartet}"`);
};
fall(500, 'g', 0.75, '375 g');
fall(250, 'g', 0.5, '125 g');
fall(500, 'g', 1.5, '750 g');
fall(500, 'g', 2.5, '1,25 kg');
fall(200, 'g', 1 / 3, '65 g');
fall(250, 'g', 1.33, '325 g');
fall(250, 'ml', 0.25, '65 ml');
fall(1, 'l', 1.5, '1,5 l');
fall(2, 'EL', 0.75, '1½ EL');
fall(1, 'EL', 0.25, '¾ TL');
fall(1, 'EL', 0.5, '1½ TL');
fall(1, 'TL', 0.25, '¼ TL');
fall(1, 'TL', 0.1, '1 Prise');
fall(1, 'TL', 3, '3 TL');
fall(4, 'TL', 1, '4 TL');
fall(4, 'TL', 0.75, '3 TL');
fall(4, 'TL', 1.5, '2 EL');
fall(1, 'EL', 1, '1 EL');
fall(2, 'EL', 1.65, '3½ EL');
fall(1, 'Prise', 2, '2 Prisen');
fall(1, undefined, 0.25, '½');
fall(1, undefined, 1.5, '1½');
fall(3, undefined, 1 / 3, '1');
fall(4, undefined, 1 / 3, '1', { ganz: true });
fall(4, undefined, 1.25, '5', { ganz: true });
fall(2, 'Zehe', 0.25, '1 Zehe');
fall(2, 'Zehe', 1.5, '3 Zehen');
fall(1, 'Dose', 1.5, '1½ Dosen');
fall(2, undefined, 0.75, '2', { aufrunden: true });
fall(2, undefined, 0.5, '1', { aufrunden: true });
console.log('Rundungstests ' + (fehler ? 'mit Fehlern' : 'ok'));

console.log(fehler ? `\n${fehler} Fehler.` : '\nAlles in Ordnung.');
process.exit(fehler ? 1 : 0);
