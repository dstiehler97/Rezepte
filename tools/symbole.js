#!/usr/bin/env node
// node tools/symbole.js
// Erzeugt App-Symbol und iOS-Startbilder aus einer SVG-Vorlage (braucht Playwright):
//   icons/app.svg                    Symbol mit Rundung (Favicon, Manifest „any“)
//   icons/app-180.png                Apple-Touch-Icon: volle Fläche, ohne Transparenz, ohne Rundung (iOS rundet selbst)
//   icons/app-192.png, app-512.png   Manifest „any“ (gerundet)
//   icons/app-maskable-192.png, -512.png   Manifest „maskable“ (volle Fläche, Motiv in der sicheren Zone)
//   icons/start/start-<B>x<H>[-dunkel].png  apple-touch-startup-image je iPhone-Größe (Links in index.html)
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const WURZEL = path.join(__dirname, '..');
const AKZENT_OBEN = '#b8502f', AKZENT_UNTEN = '#9a3a22', MOTIV = '#fbf6f0';
const PAPIER = { hell: '#f6f4f1', dunkel: '#151311' };
const SCHRIFT = { hell: '#6c645d', dunkel: '#a69d94' };

/** Kochtopf mit Dampf, 512er Raster; skala < 1 für die sichere Zone (maskable) */
const motiv = (skala = 1) => `
  <g transform="translate(256 256) scale(${skala}) translate(-256 -234)">
    <g fill="none" stroke="${MOTIV}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
      <path d="M196 200c-14-22 14-34 0-56s14-34 0-56" opacity=".85"/>
      <path d="M256 206c-14-24 14-38 0-62s14-38 0-62"/>
      <path d="M316 200c-14-22 14-34 0-56s14-34 0-56" opacity=".85"/>
    </g>
    <g fill="${MOTIV}">
      <rect x="84" y="276" width="56" height="30" rx="15"/>
      <rect x="372" y="276" width="56" height="30" rx="15"/>
      <rect x="110" y="232" width="292" height="32" rx="16"/>
      <path d="M140 264h232v84a48 48 0 0 1-48 48H188a48 48 0 0 1-48-48z"/>
    </g>
    <rect x="140" y="264" width="232" height="14" fill="${AKZENT_UNTEN}" opacity=".18"/>
  </g>`;
const verlauf = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${AKZENT_OBEN}"/><stop offset="1" stop-color="${AKZENT_UNTEN}"/></linearGradient></defs>`;
const symbol = ({ rund = true, skala = 1 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${verlauf}
  <rect width="512" height="512"${rund ? ' rx="112"' : ''} fill="url(#g)"/>${motiv(skala)}
</svg>
`;

// [CSS-Breite, CSS-Höhe, Pixelverhältnis] – gängige iPhones (Hochformat)
const IPHONES = [
  [320, 568, 2],   // SE 1. Gen.
  [375, 667, 2],   // SE 2./3. Gen., 6–8
  [414, 736, 3],   // 6–8 Plus
  [375, 812, 3],   // X, XS, 11 Pro, 12 mini, 13 mini
  [414, 896, 2],   // XR, 11
  [414, 896, 3],   // XS Max, 11 Pro Max
  [390, 844, 3],   // 12, 13, 14, 12/13 Pro
  [393, 852, 3],   // 14 Pro, 15, 15 Pro, 16
  [428, 926, 3],   // 12/13 Pro Max, 14 Plus
  [430, 932, 3],   // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  [402, 874, 3],   // 16 Pro
  [440, 956, 3],   // 16 Pro Max
];

const startHTML = (w, h, modus) => `<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;background:${PAPIER[modus]};
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px">
  <div style="width:${Math.round(w * 0.27)}px;height:${Math.round(w * 0.27)}px;border-radius:22.5%;overflow:hidden;box-shadow:0 8px 24px rgba(60,30,15,${modus === 'hell' ? '.16' : '.5'})">${symbol({ rund: false })}</div>
  <div style="font:600 ${Math.round(w * 0.06)}px 'Iowan Old Style','Palatino Linotype',Palatino,'Bitstream Charter',Georgia,serif;letter-spacing:.01em;color:${SCHRIFT[modus]}">Rezepte</div>
  <div style="height:${Math.round(w * 0.12)}px"></div>
</body></html>`;

/** Link-Tags für index.html */
function startLinks() {
  return IPHONES.flatMap(([w, h, d]) => ['dunkel', 'hell'].map((m) => {
    const media = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)${m === 'dunkel' ? ' and (prefers-color-scheme: dark)' : ''}`;
    return `  <link rel="apple-touch-startup-image" media="${media}" href="icons/start/start-${w * d}x${h * d}${m === 'dunkel' ? '-dunkel' : ''}.png">`;
  })).join('\n');
}

(async () => {
  if (process.argv.includes('--links')) { console.log(startLinks()); return; }
  fs.writeFileSync(path.join(WURZEL, 'icons', 'app.svg'), symbol());
  const b = await chromium.launch();
  const png = async (svgText, groesse, datei, transparent) => {
    const s = await b.newPage({ viewport: { width: groesse, height: groesse }, deviceScaleFactor: 1 });
    await s.setContent(`<html><body style="margin:0;background:transparent">${svgText.replace('<svg ', `<svg width="${groesse}" height="${groesse}" `)}</body></html>`);
    await s.screenshot({ path: path.join(WURZEL, 'icons', datei), omitBackground: !!transparent });
    await s.close();
  };
  await png(symbol({ rund: false }), 180, 'app-180.png');
  await png(symbol(), 192, 'app-192.png', true);
  await png(symbol(), 512, 'app-512.png', true);
  await png(symbol({ rund: false, skala: 0.78 }), 192, 'app-maskable-192.png');
  await png(symbol({ rund: false, skala: 0.78 }), 512, 'app-maskable-512.png');
  const ordner = path.join(WURZEL, 'icons', 'start');
  fs.mkdirSync(ordner, { recursive: true });
  for (const [w, h, d] of IPHONES) {
    for (const m of ['hell', 'dunkel']) {
      const s = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: d });
      await s.setContent(startHTML(w, h, m));
      await s.screenshot({ path: path.join(ordner, `start-${w * d}x${h * d}${m === 'dunkel' ? '-dunkel' : ''}.png`) });
      await s.close();
    }
  }
  await b.close();
  console.log(`App-Symbole und ${IPHONES.length * 2} Startbilder erzeugt.`);
})();
