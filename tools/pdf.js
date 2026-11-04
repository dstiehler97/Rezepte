// node tools/pdf.js <ausgabeordner> <rezept-id | kochbuch> [personen]
// Erzeugt ein PDF genau wie beim Drucken im Browser (inkl. Einpassen auf eine Seite). Braucht Playwright.
const { chromium } = require('playwright');
(async () => {
  const [ziel, id, p] = process.argv.slice(2);
  const b = await chromium.launch(); const s = await b.newPage();
  const errs = []; s.on('pageerror', e => errs.push(e.message));
  const hash = id === 'kochbuch' ? '#/kochbuch' : '#/rezept/' + id + (p ? '?p=' + p : '');
  await s.goto('file://' + require('path').join(__dirname, '..', 'index.html') + hash); await s.waitForTimeout(400);
  await s.emulateMedia({ media: 'print' });
  await s.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const z = await s.$$eval('.rezept', l => l.map(e => e.style.zoom || '1'));
  await s.pdf({ path: ziel + '/' + id + '.pdf', format: 'A4', preferCSSPageSize: true });
  console.log(id, 'zoom', z.join(','), errs.length ? errs : '');
  await b.close();
})();
