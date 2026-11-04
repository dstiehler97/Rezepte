#!/usr/bin/env node
/*
 * node tools/bilder.js        (läuft auch automatisch in tools/pruefen.js)
 * Bereitet die Rezeptfotos in /bilder fürs Handy auf (braucht ffmpeg):
 *  - Originale breiter als GROSS_BREITE werden einmalig auf diese Breite verkleinert (Rezeptkopf, Druck).
 *  - Vorschaubilder bilder/klein/<name>.jpg (KLEIN_BREITE breit, möglichst < KLEIN_ZIEL Bytes) für Karten,
 *    Reihen auf „Heute“, Würfel-Blatt und Kalender. Neu erzeugt, wenn sie fehlen oder älter als das Original sind.
 * Liefert (als Modul) die Maße aller Bilder für rezepte/liste.js: { 'bilder/x.jpg': { b, h, klein, kb, kh } }.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WURZEL = path.join(__dirname, '..');
const ORDNER = path.join(WURZEL, 'bilder');
const KLEIN = path.join(ORDNER, 'klein');
const GROSS_BREITE = 1200;
const KLEIN_BREITE = 600;
const KLEIN_ZIEL = 60 * 1024;

const ffmpegDa = () => { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch (e) { return false; } };

/** Breite und Höhe einer JPEG-Datei (aus dem SOF-Block, ohne Zusatzprogramme) */
function masse(datei) {
  const d = fs.readFileSync(datei);
  let i = 2;
  while (i < d.length) {
    if (d[i] !== 0xff) { i++; continue; }
    const m = d[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { b: d.readUInt16BE(i + 7), h: d.readUInt16BE(i + 5) };
    i += 2 + d.readUInt16BE(i + 2);
  }
  return null;
}

/** ffmpeg: skalieren auf breite, Qualität q (2 = sehr gut … 31 = schlecht), Metadaten weg */
function umwandeln(von, nach, breite, q) {
  const tmp = nach + '.tmp.jpg';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', von, '-vf', `scale=${breite}:-2:flags=lanczos`, '-q:v', String(q), '-map_metadata', '-1', tmp]);
  fs.renameSync(tmp, nach);
}

/** Alles aufbereiten; gibt { masse, meldungen } zurück */
function erzeugen({ leise } = {}) {
  const meldungen = [];
  const ergebnis = {};
  const kann = ffmpegDa();
  if (!fs.existsSync(ORDNER)) return { masse: ergebnis, meldungen };
  fs.mkdirSync(KLEIN, { recursive: true });
  const dateien = fs.readdirSync(ORDNER).filter((f) => /\.jpe?g$/i.test(f)).sort();
  for (const f of dateien) {
    const gross = path.join(ORDNER, f);
    let m = masse(gross);
    if (kann && m && m.b > GROSS_BREITE) {
      const vorher = fs.statSync(gross).size;
      umwandeln(gross, gross, GROSS_BREITE, 3);
      m = masse(gross);
      meldungen.push(`${f}: auf ${m.b}×${m.h} verkleinert (${Math.round(vorher / 1024)} → ${Math.round(fs.statSync(gross).size / 1024)} KB)`);
    }
    const klein = path.join(KLEIN, f);
    const veraltet = !fs.existsSync(klein) || fs.statSync(klein).mtimeMs < fs.statSync(gross).mtimeMs;
    if (kann && veraltet) {
      let q = 4;
      umwandeln(gross, klein, Math.min(KLEIN_BREITE, m ? m.b : KLEIN_BREITE), q);
      while (fs.statSync(klein).size > KLEIN_ZIEL && q < 10) umwandeln(gross, klein, Math.min(KLEIN_BREITE, m ? m.b : KLEIN_BREITE), ++q);
      meldungen.push(`klein/${f}: ${Math.round(fs.statSync(klein).size / 1024)} KB (q ${q})`);
    }
    const e = m ? { b: m.b, h: m.h } : {};
    if (fs.existsSync(klein)) {
      const k = masse(klein);
      Object.assign(e, { klein: 'bilder/klein/' + f }, k ? { kb: k.b, kh: k.h } : {});
    }
    ergebnis['bilder/' + f] = e;
  }
  // Vorschaubilder ohne Original aufräumen
  for (const f of fs.readdirSync(KLEIN)) if (!dateien.includes(f)) { fs.unlinkSync(path.join(KLEIN, f)); meldungen.push(`klein/${f}: entfernt (kein Original)`); }
  if (!kann && dateien.some((f) => !fs.existsSync(path.join(KLEIN, f)))) meldungen.push('! ffmpeg fehlt – Vorschaubilder für neue Fotos nicht erzeugt (die App nimmt dann das große Bild)');
  if (!leise) meldungen.forEach((t) => console.log('  ' + t));
  return { masse: ergebnis, meldungen };
}

module.exports = { erzeugen, masse };
if (require.main === module) {
  console.log('Bilder aufbereiten …');
  const { masse: m } = erzeugen();
  console.log(`  ${Object.keys(m).length} Bilder, ${Object.values(m).filter((x) => x.klein).length} Vorschaubilder`);
}
