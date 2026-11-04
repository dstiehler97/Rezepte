/*
 * Einheiten & Rundung
 * -------------------
 * Alle Mengen werden intern in einer Basiseinheit gerechnet (g, ml, TL oder
 * Zähleinheit wie Stück/Zehe/Dose) und erst bei der Anzeige sinnvoll gerundet.
 * Ziel: nie "2,45 EL" oder "333 g", sondern "2½ EL" und "325 g".
 */
(function (g) {
  'use strict';

  // schritt = Rundungsschritt, min = kleinste angezeigte Menge, mz = Mehrzahl
  const EINHEITEN = {
    g:  { basis: 'g',  faktor: 1 },
    kg: { basis: 'g',  faktor: 1000 },
    ml: { basis: 'ml', faktor: 1 },
    cl: { basis: 'ml', faktor: 10 },
    l:  { basis: 'ml', faktor: 1000 },
    TL: { basis: 'TL', faktor: 1 },
    EL: { basis: 'TL', faktor: 3 },
    'Prise':     { schritt: 1,   min: 1,   mz: 'Prisen' },
    'Msp.':      { schritt: 1,   min: 1,   mz: 'Msp.' },
    'Stück':     { schritt: 0.5, min: 0.5, mz: 'Stück', ohneWort: true },
    'Zehe':      { schritt: 1,   min: 1,   mz: 'Zehen' },
    'Dose':      { schritt: 0.5, min: 0.5, mz: 'Dosen' },
    'Packung':   { schritt: 0.5, min: 0.5, mz: 'Packungen' },
    'Päckchen':  { schritt: 1,   min: 1,   mz: 'Päckchen' },
    'Becher':    { schritt: 0.5, min: 0.5, mz: 'Becher' },
    'Glas':      { schritt: 0.5, min: 0.5, mz: 'Gläser' },
    'Bund':      { schritt: 0.5, min: 0.5, mz: 'Bund' },
    'Scheibe':   { schritt: 1,   min: 1,   mz: 'Scheiben' },
    'Blatt':     { schritt: 1,   min: 1,   mz: 'Blätter' },
    'Zweig':     { schritt: 1,   min: 1,   mz: 'Zweige' },
    'Stange':    { schritt: 0.5, min: 0.5, mz: 'Stangen' },
    'Handvoll':  { schritt: 0.5, min: 0.5, mz: 'Handvoll' },
    'Würfel':    { schritt: 0.5, min: 0.5, mz: 'Würfel' },
  };

  const PRISEN_PRO_TL = 16;

  const BRUECHE = [[0, ''], [0.25, '¼'], [0.5, '½'], [0.75, '¾']];

  function runden(wert, schritt) {
    return Math.round(wert / schritt) * schritt;
  }

  function dezimal(n) {
    return n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
  }

  /** 1.5 -> "1½", 0.25 -> "¼", 3 -> "3" */
  function zahlText(n) {
    const ganz = Math.floor(n + 1e-9);
    const rest = n - ganz;
    for (const [w, zeichen] of BRUECHE) {
      if (Math.abs(rest - w) < 1e-6) {
        if (!zeichen) return String(ganz);
        return ganz ? ganz + zeichen : zeichen;
      }
    }
    return dezimal(n);
  }

  // exakt = Grundmenge des Rezepts: ganze Zahlen unverändert lassen (320 g bleibt 320 g)
  function metrisch(wert, klein, gross, exakt) {
    if (exakt && Number.isInteger(Math.round(wert * 1000) / 1000)) {
      const w = Math.round(wert);
      if (w >= 1000 && w % 10 === 0) return { zahl: dezimal(w / 1000), einheit: gross, wert: w };
      return { zahl: String(w), einheit: klein, wert: w };
    }
    if (wert >= 975) {   // ab 1 kg / 1 l auf 100 g / 100 ml (1,1 kg statt 1,05 kg)
      const v = runden(wert, 100) / 1000;
      return { zahl: dezimal(v), einheit: gross, wert: v * 1000 };
    }
    const schritt = wert < 10 ? 1 : wert < 250 ? 5 : 25;
    const v = Math.max(schritt, runden(wert, schritt));
    return { zahl: String(v), einheit: klein, wert: v };
  }

  // bevorzugt = Einheit aus dem Rezept: steht dort TL, bleibt es TL bis 2 EL
  function loeffel(tl, bevorzugt) {
    if (tl < 0.15) return { zahl: '1', einheit: 'Prise', wert: 0 };
    if (tl < (bevorzugt === 'TL' ? 5.75 : 2.75)) {
      const v = tl < 1 ? Math.max(0.25, runden(tl, 0.25)) : runden(tl, 0.5);
      return { zahl: zahlText(v), einheit: 'TL', wert: v };
    }
    const el = runden(tl / 3, 0.5);
    return { zahl: zahlText(el), einheit: 'EL', wert: el * 3 };
  }

  /**
   * Rechnet eine Zutat auf einen Faktor (Personen neu / Personen Rezept) um.
   * Rückgabe in Basiseinheit oder null, wenn keine Menge angegeben ist.
   */
  function skalieren(zutat, faktor) {
    if (zutat.menge == null) return null;
    const name = zutat.einheit || 'Stück';
    const e = EINHEITEN[name];
    if (!e) throw new Error('Unbekannte Einheit "' + name + '" bei ' + zutat.name);
    const f = zutat.fix ? 1 : faktor;
    return { wert: zutat.menge * (e.faktor || 1) * f, basis: e.basis || name, einheit: name };
  }

  /** Formatiert eine Menge in Basiseinheit. opt.ganz = nur ganze Stück (Eier), opt.einheit = Einheit im Rezept,
   *  opt.aufrunden = Zähleinheiten auf ganze aufrunden (Einkaufsliste). */
  function format(wert, basis, opt) {
    opt = opt || {};
    if (basis === 'g') return metrisch(wert, 'g', 'kg', opt.exakt);
    if (basis === 'ml') return metrisch(wert, 'ml', 'l', opt.exakt);
    if (basis === 'TL') return loeffel(wert, opt.einheit);
    const e = EINHEITEN[basis];
    // Prisen wachsen nicht beliebig: mehr als 2 Prisen werden zu ¼ TL, ½ TL … (1 Prise ≈ 1/16 TL)
    if (basis === 'Prise' && runden(wert, 1) > 2) return loeffel(wert / PRISEN_PRO_TL, 'TL');
    if (opt.aufrunden) wert = Math.ceil(wert - 1e-6); // Einkauf: halbe Zwiebel gibt es nicht
    const schritt = opt.ganz ? 1 : e.schritt;
    const min = opt.ganz ? 1 : e.min;
    const v = Math.max(min, runden(wert, schritt));
    return {
      zahl: zahlText(v),
      einheit: e.ohneWort ? '' : (v > 1 ? e.mz : basis),
      wert: v,
    };
  }

  g.Einheiten = { EINHEITEN, PRISEN_PRO_TL, skalieren, format, zahlText };
})(globalThis);
