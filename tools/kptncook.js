#!/usr/bin/env node
/*
 * node tools/kptncook.js <link> [<link> …]
 *
 * Holt aus einem KptnCook-Teilen-Link, was die Webseite öffentlich zeigt
 * (Titel, Zeiten, Zutaten, Gerichtsfoto, die ersten Schritte), rechnet auf
 * 4 Personen um und legt einen Entwurf in rezepte/_<id>.js an (mit '_' = noch nicht in der App;
 * nach dem Ergänzen umbenennen in rezepte/<id>.js). Das Foto landet in bilder/<id>.jpg.
 * Die restlichen Schritte stehen nur in der App – die kommen von Screenshots dazu.
 * Bestehende Rezeptdateien werden nicht überschrieben.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WURZEL = path.join(__dirname, '..');
const ZIEL_PERSONEN = 4;

const EINHEITEN = {
  g: 'g', kg: 'kg', ml: 'ml', l: 'l', cl: 'cl', EL: 'EL', TL: 'TL', Prise: 'Prise', Prisen: 'Prise',
  Zehe: 'Zehe', Zehen: 'Zehe', Dose: 'Dose', Dosen: 'Dose', 'Pck.': 'Packung', Packung: 'Packung',
  Päckchen: 'Päckchen', Becher: 'Becher', Glas: 'Glas', Bund: 'Bund', Scheibe: 'Scheibe', Scheiben: 'Scheibe',
  Blatt: 'Blatt', Blätter: 'Blatt', Zweig: 'Zweig', Zweige: 'Zweig', Stange: 'Stange', Stangen: 'Stange',
  Handvoll: 'Handvoll', Würfel: 'Würfel', Stück: 'Stück',
};

function laden(url, ausgabe) {
  const args = ['-sSL', '-m', '30', '-A', 'Mozilla/5.0 (Rezeptsammlung)'];
  if (ausgabe) { execFileSync('curl', [...args, '-o', ausgabe, url]); return null; }
  return execFileSync('curl', [...args, url], { encoding: 'utf8', maxBuffer: 20e6 });
}

function zahl(t) {
  if (!t) return null;
  if (t.includes('/')) { const [a, b] = t.split('/').map(Number); return a / b; }
  return Number(t.replace(',', '.'));
}

const rund = (n) => Math.round(n * 100) / 100;

function zutat(text, faktor) {
  const m = text.trim().match(/^(\d+\/\d+|\d+(?:[.,]\d+)?)?\s*(\S+)?\s*(.*)$/);
  let menge = zahl(m[1]);
  let einheit = EINHEITEN[m[2]] ? EINHEITEN[m[2]] : null;
  let name = (einheit ? m[3] : [m[2], m[3]].filter(Boolean).join(' ')).trim();
  if (menge == null) return { name: text.trim() };
  menge *= faktor;
  if (einheit === 'l') { menge *= 1000; einheit = 'ml'; }
  if (einheit === 'kg') { menge *= 1000; einheit = 'g'; }
  const z = { menge: rund(menge) };
  if (einheit && einheit !== 'Stück') z.einheit = einheit;
  z.name = name;
  return z;
}

function idAus(titel) {
  return titel.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function minuten(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || '');
  return m ? (Number(m[1] || 0) * 60 + Number(m[2] || 0)) : 0;
}

function js(wert) {
  if (typeof wert === 'string') return "'" + wert.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  if (typeof wert === 'number') return String(wert);
  return '{ ' + Object.entries(wert).map(([k, v]) => k + ': ' + js(v)).join(', ') + ' }';
}

function importieren(link) {
  const html = laden(link);
  const block = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!block) throw new Error('Keine Rezeptdaten gefunden: ' + link);
  const r = JSON.parse(block[1]);
  const portionen = Number(r.recipeYield) || ZIEL_PERSONEN;
  const faktor = ZIEL_PERSONEN / portionen;
  const id = idAus(r.name);
  const datei = path.join(WURZEL, 'rezepte', '_' + id + '.js'); // Entwurf: '_' = noch nicht in der App
  if (fs.existsSync(datei) || fs.existsSync(path.join(WURZEL, 'rezepte', id + '.js'))) { console.log('= ' + id + ' gibt es schon, übersprungen'); return; }

  const zutaten = (r.recipeIngredient || []).map((t) => zutat(t, faktor));
  // Zutaten ohne Menge (Salz, Pfeffer …) stehen nur im HTML, nicht in den Rezeptdaten
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n');
  const liste = text.split(/Portionen/)[1] || '';
  const zeilen = liste.split(/\n\s*1\s*\n\s*\.\s*\n/)[0].split('\n').map((s) => s.trim()).filter(Boolean);
  for (const zeile of zeilen) {
    if (/^[A-ZÄÖÜ][a-zäöüß]+$/.test(zeile) && !EINHEITEN[zeile] && !zutaten.some((z) => z.name.includes(zeile))) {
      zutaten.push({ name: zeile });
    }
  }

  const schritte = (r.recipeInstructions || []).map((s) => s.text).filter((t) => t && !/^Alles parat\??$/.test(t));
  let bild = '';
  if (r.image) {
    fs.mkdirSync(path.join(WURZEL, 'bilder'), { recursive: true });
    laden(Array.isArray(r.image) ? r.image[0] : r.image, path.join(WURZEL, 'bilder', id + '.jpg'));
    bild = 'bilder/' + id + '.jpg';
  }

  const inhalt = `Rezept({
  id: '${id}',
  titel: ${js(r.name)},
  beschreibung: ${js(r.description || '')},
  kategorie: 'Hauptgericht', // TODO prüfen
  tags: [],
  personen: ${ZIEL_PERSONEN},
  zeit: { vorbereitung: ${minuten(r.prepTime)}, kochen: ${minuten(r.cookTime)} },
  schwierigkeit: 'einfach', // TODO prüfen
  bild: '${bild}',

  // Original für ${portionen} Portionen, umgerechnet auf ${ZIEL_PERSONEN}. TODO: Namen/Einheiten prüfen
  zutaten: [
${zutaten.map((z) => '    ' + js(z) + ',').join('\n')}
  ],

  // TODO: Die Webseite zeigt nur die ersten Schritte – Rest von Screenshots ergänzen
  schritte: [
${schritte.map((s) => '    ' + js(s) + ',').join('\n')}
  ],

  tipps: [],
});
`;
  fs.writeFileSync(datei, inhalt);
  console.log('+ ' + id + ' (' + zutaten.length + ' Zutaten, ' + schritte.length + ' Schritte' + (bild ? ', Foto' : '') + ')');
}

const links = process.argv.slice(2);
if (!links.length) { console.log('Aufruf: node tools/kptncook.js <link> [<link> …]'); process.exit(1); }
for (const l of links) {
  try { importieren(l); } catch (e) { console.log('✗ ' + l + ': ' + e.message); }
}
