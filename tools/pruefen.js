#!/usr/bin/env node
/*
 * node tools/pruefen.js
 *  1. prüft alle Rezepte in /rezepte (Pflichtfelder, Einheiten, doppelte IDs)
 *  2. schreibt rezepte/liste.js neu (damit neue Dateien automatisch erscheinen)
 *  3. exportiert alle Icons als einzelne SVG-Dateien nach /icons
 *  4. testet die Rundungsregeln
 *  Außerdem: Nährwerte je Rezept, Warnung bei fehlenden Nährwertdaten,
 *  Fehler wenn Nudeln/Reis nicht als Trockengewicht in g angegeben sind.
 *  Ernährungsform je Rezept (aus den Zutaten oder Feld ernaehrung); Fehler bei widersprüchlichen Tags.
 *  5. bereitet die Fotos auf (tools/bilder.js: Vorschaubilder bilder/klein/, große Fotos höchstens 1200 px breit)
 *     und schreibt ihre Maße nach rezepte/liste.js
 *  6. schreibt Version und Dateiliste in sw.js (Offline-Speicher) – nach jeder Änderung ausführen,
 *     damit installierte Apps die neue Version übernehmen
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const bilder = require('./bilder.js');

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
  if (r.personen !== 4) melde(datei, 'Rezepte immer für 4 Personen anlegen (personen: 4)');
  if (!Array.isArray(r.zutaten) || !r.zutaten.length) melde(datei, 'zutaten fehlen');
  if (!Array.isArray(r.schritte) || !r.schritte.length) melde(datei, 'schritte fehlen');
  if (r.schwierigkeit && !['einfach', 'mittel', 'anspruchsvoll'].includes(r.schwierigkeit)) melde(datei, 'schwierigkeit: einfach | mittel | anspruchsvoll');
  if (r.ernaehrung !== undefined && !Zutaten.ERNAEHRUNG.includes(r.ernaehrung)) melde(datei, 'ernaehrung: ' + Zutaten.ERNAEHRUNG.join(' | '));
  for (const z of r.zutaten || []) {
    if (z.abschnitt) continue;
    if (z.ernaehrung !== undefined && !['fleisch', 'fisch', 'tierisch', 'vegan'].includes(z.ernaehrung)) melde(datei, `${z.name}: ernaehrung fleisch | fisch | tierisch | vegan`);
    if (!z.name) { melde(datei, 'Zutat ohne name: ' + JSON.stringify(z)); continue; }
    try { Einheiten.skalieren(z, 1); } catch (e) { melde(datei, e.message); }
    if (z.menge != null && typeof z.menge !== 'number') melde(datei, `menge bei ${z.name} muss eine Zahl sein`);
    if (Zutaten.info(z).kategorie === 'Sonstiges' && !z.einkauf && !Zutaten.info(z).nie) ohneKategorie.add(z.name);
    if (Zutaten.info(z).trocken && z.menge != null && !['g', 'kg'].includes(z.einheit)) melde(datei, `${z.name}: Nudeln/Reis/Getreide immer als Trockengewicht in g angeben`);
  }
  // Ernährungsform: Tags dürfen nicht widersprechen
  if (r.bild && !fs.existsSync(path.join(WURZEL, r.bild))) melde(datei, 'Bild fehlt: ' + r.bild);
  const ern = Zutaten.ernaehrung(r);
  const tags = (r.tags || []).map((t) => t.toLowerCase());
  if (tags.includes('vegan') && ern.id !== 'vegan') melde(datei, `Tag "Vegan", aber ${ern.id} (${ern.gruende.join(', ') || 'Feld ernaehrung'})`);
  if (tags.includes('vegetarisch') && !['vegan', 'vegetarisch'].includes(ern.id)) melde(datei, `Tag "Vegetarisch", aber ${ern.id} (${ern.gruende.join(', ') || 'Feld ernaehrung'})`);
  if (tags.includes('fleisch') && !ern.fleisch) melde(datei, `Tag "Fleisch", aber ${ern.id}`);
  if (r.ernaehrung && r.ernaehrung !== ern.auto) console.log(`  ! ${datei}: ernaehrung "${r.ernaehrung}" überschreibt erkannt "${ern.auto}"`);
  const nw = Naehrwerte.berechnen(r);
  const p = nw.portion;
  console.log(`  ${r.titel}: ${Math.round(p.kcal)} kcal · E ${Math.round(p.eiweiss)} g · KH ${Math.round(p.kh)} g · F ${Math.round(p.fett)} g pro Portion · ${ern.id}${ern.gruende.length ? ' (' + ern.gruende.join(', ') + ')' : ''}`);
  if (nw.fehlend.length) console.log(`  ! ${datei}: keine Nährwerte für ${nw.fehlend.join(', ')} – in assets/naehrwerte.js ergänzen oder gramm/naehrwerte angeben`);
  for (const s of r.schritte || []) {
    if (typeof s === 'string' && /\d+\s?(g|ml|EL|TL|kg|l)\b/.test(s)) console.log(`  ! ${datei}: Menge im Schritt ("${s.slice(0, 50)}…") – wird nicht umgerechnet`);
  }
}
if (ohneKategorie.size) console.log('  ! ohne Einkaufs-Kategorie (landen unter "Sonstiges"): ' + [...ohneKategorie].join(', '));
console.log(`  ${dateien.length} Rezepte`);

// ---------------------------------------------------------------- 5. Bilder (vor liste.js: Maße gehören hinein)
console.log('Bilder aufbereiten …');
const bildMasse = bilder.erzeugen().masse;
console.log(`  ${Object.keys(bildMasse).length} Fotos, ${Object.values(bildMasse).filter((x) => x.klein).length} Vorschaubilder`);

// ---------------------------------------------------------------- 2. liste.js
const listeInhalt = 'window.REZEPT_DATEIEN = ' + JSON.stringify(dateien.map((d) => d.replace(/\.js$/, '')), null, 2) + ';\n' +
  '// Fotos: Breite b × Höhe h, Vorschaubild klein (kb × kh) – für width/height und kleine Bilder in Karten\n' +
  'window.REZEPT_BILDER = ' + JSON.stringify(bildMasse) + ';\n';
const pruefsumme = (inhalt) => crypto.createHash('sha256').update(inhalt).digest('hex').slice(0, 12);
// Offline-Dateien (alles, was die App zum Starten braucht) mit Prüfsumme; liste.js wird unten ergänzt
const vorab = [
  ['./', 'index.html'], ['manifest.json'],
  ...fs.readdirSync(path.join(WURZEL, 'assets')).filter((f) => /\.(js|css)$/.test(f)).sort().map((f) => ['assets/' + f]),
  ...dateien.map((d) => ['rezepte/' + d]),
  ...['app.svg', 'app-180.png', 'app-192.png', 'app-512.png'].filter((f) => fs.existsSync(path.join(WURZEL, 'icons', f))).map((f) => ['icons/' + f]),
  ...Object.values(bildMasse).filter((x) => x.klein).map((x) => [x.klein]),
].map(([url, datei]) => [url, pruefsumme(fs.readFileSync(path.join(WURZEL, datei || url)))]);
const version = pruefsumme(JSON.stringify(vorab) + listeInhalt);
fs.writeFileSync(path.join(ordner, 'liste.js'),
  '// Automatisch erzeugt von tools/pruefen.js – nicht von Hand bearbeiten.\n' + listeInhalt +
  '// Version der App (Prüfsumme aller Dateien) – vergleicht die App mit dem Service Worker (sw.js)\n' +
  'window.APP_VERSION = ' + JSON.stringify(version) + ';\n');
vorab.push(['rezepte/liste.js', pruefsumme(fs.readFileSync(path.join(ordner, 'liste.js')))]);

// ---------------------------------------------------------------- 6. sw.js
const swDatei = path.join(WURZEL, 'sw.js');
const sw = fs.readFileSync(swDatei, 'utf8');
const grosseBilder = Object.keys(bildMasse).map((b) => [b, pruefsumme(fs.readFileSync(path.join(WURZEL, b)))]);
const block = '// <automatisch> von tools/pruefen.js – nicht von Hand bearbeiten\n' +
  'const VERSION = ' + JSON.stringify(version) + ';\n' +
  'const DATEIEN = ' + JSON.stringify(vorab).replace(/\],\[/g, '],\n  [').replace(/^\[\[/, '[\n  [').replace(/\]\]$/, '],\n]') + ';\n' +
  'const BILDER = ' + JSON.stringify(grosseBilder).replace(/\],\[/g, '],\n  [').replace(/^\[\[/, '[\n  [').replace(/\]\]$/, '],\n]') + ';\n' +
  '// </automatisch>';
if (!/\/\/ <automatisch>[\s\S]*?\/\/ <\/automatisch>/.test(sw)) melde('sw.js', 'Markierung // <automatisch> … // </automatisch> fehlt');
else fs.writeFileSync(swDatei, sw.replace(/\/\/ <automatisch>[\s\S]*?\/\/ <\/automatisch>/, block));
const kb = Math.round(vorab.reduce((n, [u]) => n + fs.statSync(path.join(WURZEL, u === './' ? 'index.html' : u)).size, 0) / 1024);
console.log(`  Offline: ${vorab.length} Dateien (${kb} KB), Version ${version}`);

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
fall(320, 'g', 1, '320 g', { exakt: true });
fall(320, 'g', 1.25, '400 g');
fall(1250, 'ml', 1, '1,25 l', { exakt: true });
fall(330, 'g', 1, '330 g', { exakt: true });
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
fall(2, 'Stange', 0.75, '1½ Stangen');
fall(2, undefined, 0.75, '2', { aufrunden: true });
fall(2, undefined, 0.5, '1', { aufrunden: true });
console.log('Rundungstests ' + (fehler ? 'mit Fehlern' : 'ok'));

console.log(fehler ? `\n${fehler} Fehler.` : '\nAlles in Ordnung.');
process.exit(fehler ? 1 : 0);
