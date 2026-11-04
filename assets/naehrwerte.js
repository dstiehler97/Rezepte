/*
 * Nährwerte
 * ---------
 * Werte pro 100 g (bzw. 100 ml) als [kcal, Eiweiß, Kohlenhydrate, davon Zucker, Fett, Ballaststoffe].
 * Typische Durchschnittswerte (Rohware; Nudeln, Reis & Getreide immer trocken/ungekocht).
 * Zusatzangaben fürs Umrechnen in Gramm:
 *   dichte  g pro ml (für ml, TL = 5 ml, EL = 15 ml), Standard 1
 *   stueck  g pro Stück (essbarer Anteil), außerdem zehe, dose, stange, bund, scheibe, wuerfel,
 *           paeckchen, packung, becher, glas, blatt, zweig, handvoll
 * Im Rezept kann eine Zutat mit  gramm: 120  (Gewicht der angegebenen Menge) überschrieben
 * oder mit  naehrwerte: false  aus der Berechnung genommen werden.
 */
(function (g) {
  'use strict';

  const N = (kcal, eiweiss, kh, zucker, fett, ballast, extra) =>
    Object.assign({ kcal, eiweiss, kh, zucker, fett, ballast }, extra || {});

  const GEWUERZ = N(300, 12, 35, 5, 10, 30, { dichte: 0.5 });
  const KRAEUTER = N(40, 3, 5, 1, 0.7, 3, { bund: 30, zweig: 1, handvoll: 20, dichte: 0.3 });

  const TABELLE = {
    // Gewürze, Öle, Saucen
    'salz': N(0, 0, 0, 0, 0, 0, { dichte: 1.2 }),
    'pfeffer': N(255, 11, 39, 1, 3.3, 25, { dichte: 0.5 }),
    'paprikapulver': GEWUERZ, 'chiliflocken': GEWUERZ, 'muskat': GEWUERZ, 'muskatnuss': GEWUERZ,
    'zimt': GEWUERZ, 'kreuzkümmel': GEWUERZ, 'currypulver': GEWUERZ, 'kurkuma': GEWUERZ, 'piment': GEWUERZ, 'oregano': GEWUERZ,
    'getrocknete minze': GEWUERZ, 'getrockneter rosmarin': GEWUERZ, 'getrockneter thymian': GEWUERZ,
    'lorbeerblatt': N(310, 8, 48, 0, 8, 26, { stueck: 0.2, blatt: 0.2 }),
    'lorbeer': N(310, 8, 48, 0, 8, 26, { stueck: 0.2, blatt: 0.2 }),
    'öl': N(884, 0, 0, 0, 100, 0, { dichte: 0.92 }),
    'essig': N(20, 0, 0.6, 0.6, 0, 0),
    'balsamico': N(90, 0.5, 17, 15, 0, 0, { dichte: 1.06 }),   // Aceto Balsamico
    'brühe': N(5, 0.2, 0.5, 0.4, 0.2, 0),               // zubereitet
    'senf': N(85, 6, 5, 3, 4.5, 2, { dichte: 1.05 }),
    'sojasauce': N(55, 8, 5, 1, 0.1, 0.8, { dichte: 1.15 }),
    'mirin': N(240, 0.3, 43, 40, 0, 0, { dichte: 1.15 }),
    'chilisauce': N(95, 1.9, 19, 15, 0.9, 2.2, { dichte: 1.1 }),
    'austernsauce': N(110, 2.5, 22, 15, 0.3, 0.3, { dichte: 1.2 }),
    'gewürzmischung': N(300, 12, 35, 5, 10, 30, { dichte: 0.5 }),
    'italienische kräuter': N(280, 10, 40, 4, 6, 35, { dichte: 0.3 }),
    'kräuter der provence': N(280, 10, 40, 4, 6, 35, { dichte: 0.3 }),
    'knoblauchpulver': N(330, 17, 73, 2.4, 0.7, 9, { dichte: 0.6 }),
    'pesto': N(450, 5, 6, 2, 45, 2, { dichte: 0.9, glas: 190 }),
    'sriracha': N(95, 1.9, 19, 15, 0.9, 2.2, { dichte: 1.1 }),
    'honig': N(305, 0.3, 80, 75, 0, 0, { dichte: 1.4 }),
    'wasser': N(0, 0, 0, 0, 0, 0),

    // Backen & Nüsse
    'zucker': N(400, 0, 100, 100, 0, 0, { dichte: 0.85 }),
    'vanillezucker': N(400, 0, 100, 100, 0, 0, { paeckchen: 8, dichte: 0.85 }),
    'mehl': N(348, 10, 72, 0.5, 1, 4, { dichte: 0.6 }),
    'backpulver': N(100, 0, 25, 0, 0, 0, { paeckchen: 15, dichte: 0.9 }),
    'natron': N(0, 0, 0, 0, 0, 0, { paeckchen: 5, dichte: 1 }),
    'dinkelmehl': N(340, 12, 70, 1, 1.5, 4, { dichte: 0.6 }),
    'kokosblütenzucker': N(380, 1, 92, 88, 0.5, 0, { dichte: 0.8 }),
    'kokosöl': N(880, 0, 0, 0, 99, 0, { dichte: 0.92 }),
    'speisestärke': N(350, 0.3, 86, 0, 0.1, 0, { dichte: 0.6 }),
    'erdnüsse': N(585, 25, 12, 4, 50, 8, { handvoll: 30 }),
    'nüsse': N(650, 15, 10, 4, 62, 7, { handvoll: 30 }),
    'mandeln': N(580, 21, 6, 4, 52, 12, { handvoll: 30 }),
    'cashewkerne': N(575, 18, 30, 6, 46, 3, { handvoll: 30 }),
    'walnüsse': N(665, 15, 7, 3, 65, 6, { handvoll: 30 }),
    'walnusskerne': N(665, 15, 7, 3, 65, 6, { handvoll: 30 }),
    'haselnüsse': N(645, 15, 11, 4, 61, 8, { handvoll: 30 }),
    'rosinen': N(300, 2.5, 66, 66, 0.5, 3.5, { handvoll: 30, dichte: 0.65 }),
    'ghee': N(880, 0.3, 0, 0, 99.5, 0, { dichte: 0.9 }),
    'haselnusskerne': N(645, 15, 11, 4, 61, 8, { handvoll: 30 }),
    'sesamsaat': N(575, 18, 10, 0.3, 50, 12, { dichte: 0.6 }),
    'sesam': N(575, 18, 10, 0.3, 50, 12, { dichte: 0.6 }),
    'pinienkerne': N(675, 14, 4, 3.6, 68, 3.7, { handvoll: 30, dichte: 0.55 }),

    // Kühlregal
    'butter': N(741, 0.7, 0.6, 0.6, 83, 0, { dichte: 0.9 }),
    'ei': N(155, 13, 1.1, 1.1, 11, 0, { stueck: 55 }),
    'eier': N(155, 13, 1.1, 1.1, 11, 0, { stueck: 55 }),
    'milch': N(64, 3.3, 4.8, 4.8, 3.5, 0, { dichte: 1.03 }),
    'sahne': N(290, 2.4, 3.2, 3.2, 30, 0, { becher: 200 }),
    'schmand': N(240, 2.7, 3.4, 3.4, 24, 0, { becher: 200 }),
    'joghurt': N(63, 3.6, 4.3, 4.3, 3.5, 0, { becher: 150 }),
    'quark': N(70, 12, 4, 4, 0.3, 0, { becher: 250, packung: 250 }),
    'käse': N(355, 25, 0, 0, 28, 0, { scheibe: 20 }),
    'parmesan': N(392, 33, 0, 0, 28, 0),
    'mozzarella': N(250, 18, 1, 1, 19, 0, { stueck: 125, packung: 125 }),
    'gouda': N(355, 25, 0, 0, 28, 0, { scheibe: 20 }),
    'feta': N(262, 17, 0.7, 0.7, 21, 0, { packung: 200, stueck: 200 }),
    'schafkäse': N(262, 17, 0.7, 0.7, 21, 0, { packung: 200, stueck: 200 }),
    'hefe': N(100, 12, 9, 0, 1, 7, { wuerfel: 42, paeckchen: 7 }),
    'gnocchi': N(155, 4, 32, 1, 0.6, 2, { packung: 400 }),         // Frischware, Kühlregal
    'pfannenkäse': N(300, 17, 12, 1, 21, 1, { stueck: 25 }),      // panierter Ofenkäse
    'tofu': N(125, 13, 1.5, 0.5, 7.5, 1.5, { packung: 200, stueck: 200 }),
    'blätterteig': N(390, 5.5, 33, 1.5, 26, 1.5, { packung: 275, stueck: 275 }),   // frisch, Kühlregal
    'griechischer joghurt': N(120, 4.5, 4, 4, 10, 0, { becher: 150 }),   // 10 % Fett

    // Obst & Gemüse
    'zwiebel': N(40, 1.2, 8, 4.7, 0.1, 1.8, { stueck: 80 }),
    'schalotte': N(72, 2.5, 15, 8, 0.1, 3, { stueck: 25 }),
    'frühlingszwiebel': N(32, 1.8, 5, 2.3, 0.2, 2.6, { stueck: 15, bund: 120 }),
    'knoblauch': N(149, 6.4, 30, 1, 0.5, 2.1, { zehe: 4, stueck: 40 }),
    'knoblauchzehe': N(149, 6.4, 30, 1, 0.5, 2.1, { stueck: 4, zehe: 4 }),
    'tomate': N(18, 0.9, 2.6, 2.6, 0.2, 1.2, { stueck: 80 }),
    'kirschtomate': N(18, 0.9, 2.6, 2.6, 0.2, 1.2, { stueck: 15 }),
    'cherrytomate': N(18, 0.9, 2.6, 2.6, 0.2, 1.2, { stueck: 15 }),
    'zitrone': N(25, 0.4, 7, 2.5, 0.2, 0.3, { stueck: 40 }),   // Saft
    'limette': N(25, 0.4, 7, 1.7, 0.1, 0.4, { stueck: 35 }),   // Saft
    'chili': N(40, 1.9, 7, 5, 0.4, 1.5, { stueck: 10 }),
    'chilischote': N(40, 1.9, 7, 5, 0.4, 1.5, { stueck: 10 }),
    'karotte': N(39, 0.9, 7.5, 4.7, 0.2, 2.8, { stueck: 80 }),
    'möhre': N(39, 0.9, 7.5, 4.7, 0.2, 2.8, { stueck: 80 }),
    'kartoffel': N(72, 2, 15, 0.8, 0.1, 2.1, { stueck: 100 }),
    'süßkartoffel': N(86, 1.6, 20, 4.2, 0.1, 3, { stueck: 300 }),
    'paprika': N(31, 1, 6, 4.2, 0.3, 2.1, { stueck: 160 }),
    'paprikaschote': N(31, 1, 6, 4.2, 0.3, 2.1, { stueck: 160 }),
    'staudensellerie': N(16, 0.7, 2.2, 1.3, 0.2, 1.6, { stange: 40 }),
    'sellerie': N(20, 1.5, 2.3, 2, 0.3, 4.2, { stueck: 500 }),
    'zucchini': N(19, 1.6, 2.2, 2, 0.4, 1.1, { stueck: 250 }),
    'aubergine': N(25, 1.2, 2.5, 2.5, 0.2, 2.8, { stueck: 300 }),
    'champignon': N(22, 3.1, 0.6, 0.2, 0.3, 2, { stueck: 20, packung: 250 }),
    'pilze': N(22, 3.1, 0.6, 0.2, 0.3, 2, { packung: 250 }),
    'pfifferlinge': N(20, 1.5, 0.2, 0.2, 0.5, 5.6),
    'austernpilze': N(33, 3.3, 3.5, 1, 0.4, 2.3),
    'lauch': N(29, 2.2, 3.3, 2, 0.3, 2.3, { stange: 200 }),
    'porree': N(29, 2.2, 3.3, 2, 0.3, 2.3, { stange: 200 }),
    'spinat': N(23, 2.9, 0.6, 0.4, 0.4, 2.6, { handvoll: 30 }),
    'grünkohl': N(49, 4.3, 2.5, 1.7, 0.9, 4.2),
    'salat': N(15, 1.2, 1.5, 1, 0.2, 1.5, { stueck: 300, handvoll: 25 }),
    'salat-mix': N(17, 1.5, 1.8, 1, 0.3, 1.8, { handvoll: 25, packung: 125 }),
    'rucola': N(25, 2.6, 2.1, 2, 0.7, 1.6, { handvoll: 20, packung: 125 }),
    'gurke': N(12, 0.6, 1.8, 1.8, 0.2, 0.5, { stueck: 400 }),
    'grüne bohnen': N(33, 2.4, 5, 1.4, 0.2, 1.9),
    'brechbohnen': N(33, 2.4, 5, 1.4, 0.2, 1.9),
    'apfel': N(54, 0.3, 14, 10, 0.2, 2, { stueck: 150 }),
    'banane': N(93, 1.2, 20, 17, 0.2, 2, { stueck: 120 }),
    'ingwer': N(80, 1.8, 16, 1.7, 0.8, 2, { stueck: 20 }),
    'avocado': N(160, 2, 3.6, 0.7, 15, 6.7, { stueck: 150 }),    // Fruchtfleisch
    'radieschen': N(16, 1, 2.1, 1.9, 0.1, 1.6, { stueck: 15, bund: 200 }),

    // Kräuter
    'petersilie': KRAEUTER, 'basilikum': KRAEUTER, 'schnittlauch': KRAEUTER, 'thymian': KRAEUTER,
    'rosmarin': KRAEUTER, 'salbei': KRAEUTER, 'koriander': KRAEUTER, 'dill': KRAEUTER, 'minze': KRAEUTER,

    // Fleisch & Fisch (roh)
    'hackfleisch': N(260, 18, 0, 0, 21, 0),                 // gemischt
    'rinderhackfleisch': N(215, 20, 0, 0, 15, 0),
    'hähnchenbrust': N(105, 23, 0, 0, 1.2, 0, { stueck: 180 }),
    'hähnchen': N(170, 19, 0, 0, 10, 0),
    'rindersteak': N(135, 22, 0, 0, 5, 0, { stueck: 200 }),   // Rumpsteak/Hüfte
    'speck': N(380, 14, 0, 0, 36, 0, { scheibe: 10 }),
    'bacon': N(380, 14, 0, 0, 36, 0, { scheibe: 10 }),
    'pancetta': N(380, 14, 0, 0, 36, 0, { scheibe: 10 }),
    'schinken': N(110, 19, 1, 1, 3.5, 0, { scheibe: 20 }),
    'lachs': N(200, 20, 0, 0, 13, 0, { stueck: 125 }),
    'fisch': N(90, 19, 0, 0, 1, 0, { stueck: 125 }),
    'garnele': N(90, 19, 0, 0, 1.2, 0),

    // Nudeln, Reis & Getreide (trocken)
    'spaghetti': N(359, 12.5, 70, 3, 1.5, 3),
    'nudeln': N(359, 12.5, 70, 3, 1.5, 3),
    'penne': N(359, 12.5, 70, 3, 1.5, 3),
    'fusilli': N(359, 12.5, 70, 3, 1.5, 3),
    'orecchiette': N(359, 12.5, 70, 3, 1.5, 3),
    'rigatoni': N(359, 12.5, 70, 3, 1.5, 3),
    'makkaroni': N(359, 12.5, 70, 3, 1.5, 3),
    'linguine': N(359, 12.5, 70, 3, 1.5, 3),
    'pasta': N(359, 12.5, 70, 3, 1.5, 3),
    'farfalle': N(359, 12.5, 70, 3, 1.5, 3),
    'tagliatelle': N(359, 12.5, 70, 3, 1.5, 3),
    'lasagneplatten': N(359, 12.5, 70, 3, 1.5, 3),
    'reisnudeln': N(360, 6, 80, 0, 0.6, 1.6),
    'reis': N(349, 7, 78, 0.2, 0.6, 1.4),
    'basmatireis': N(349, 7, 78, 0.2, 0.6, 1.4),
    'jasminreis': N(349, 7, 78, 0.2, 0.6, 1.4),
    'risottoreis': N(349, 7, 78, 0.2, 0.6, 1.4),
    'sushireis': N(349, 7, 78, 0.2, 0.6, 1.4),
    'sojagranulat': N(340, 50, 14, 7, 1.5, 15, { dichte: 0.35 }),
    'couscous': N(356, 12, 72, 0, 1.5, 5),
    'bulgur': N(342, 12, 69, 0.4, 1.3, 9),
    'quinoa': N(368, 14, 64, 0, 6, 7),
    'linsen': N(314, 24, 41, 1, 1.5, 17),
    'haferflocken': N(372, 13.5, 59, 1.2, 7, 10, { dichte: 0.4 }),

    // Konserven
    'tomatenmark': N(82, 4.3, 15, 12, 0.5, 4, { dichte: 1.1, dose: 70 }),
    'stückige tomaten': N(21, 1.1, 3.5, 3, 0.2, 1, { dose: 400, packung: 400 }),
    'passierte tomaten': N(30, 1.4, 5, 4, 0.2, 1, { packung: 500, glas: 500 }),
    'geschälte tomaten': N(20, 1, 3, 3, 0.2, 1, { dose: 400 }),
    'getrocknete tomaten': N(210, 5, 23, 15, 12, 6, { glas: 280 }), // in Öl, abgetropft
    'geröstete paprika': N(30, 1, 5, 4, 0.3, 1.5, { glas: 290 }), // aus dem Glas, abgetropft
    'kokosmilch': N(195, 1.8, 3, 2, 19, 0.5, { dose: 400 }),
    'pflanzlicher drink': N(45, 0.5, 7, 4, 1.5, 0.8),   // z. B. Haferdrink
    'preiselbeeren': N(180, 0.3, 43, 40, 0.3, 2, { glas: 400, dichte: 1.2 }),
    'kichererbsen': N(120, 7, 16, 1, 2.6, 5, { dose: 240 }),     // abgetropft
    'erbsen': N(81, 5.4, 10, 5, 0.4, 5, { packung: 450 }),       // tiefgefroren
    'mais': N(80, 3, 14, 4, 1.2, 3, { dose: 285 }),
    'olive': N(140, 1.2, 1, 0, 14, 3.3, { stueck: 4, glas: 160 }),   // schwarz, abgetropft

    // Brot
    'brot': N(220, 6.5, 43, 2, 1.2, 5, { scheibe: 45 }),
    'brötchen': N(275, 9, 54, 2, 1.5, 3, { stueck: 60 }),
    'knödelbrot': N(375, 11, 74, 3, 2, 4),
    'baguette': N(260, 8.5, 52, 2.5, 1.3, 3, { stueck: 250, scheibe: 20 }),
    'semmelbrösel': N(365, 10, 73, 3, 2, 5, { dichte: 0.45 }),

    // Getränke
    'rotwein': N(85, 0.1, 2.6, 0.6, 0, 0),
    'weißwein': N(82, 0.1, 2.6, 1, 0, 0),
  };

  // Standardgewichte für Einheiten ohne Eintrag (Gramm)
  const STANDARD = { 'Prise': 0.4, 'Msp.': 0.3, 'Blatt': 0.2, 'Zweig': 1, 'Handvoll': 30, 'Bund': 30 };
  const FELD = {
    'Stück': 'stueck', 'Zehe': 'zehe', 'Dose': 'dose', 'Stange': 'stange', 'Bund': 'bund', 'Scheibe': 'scheibe',
    'Würfel': 'wuerfel', 'Päckchen': 'paeckchen', 'Packung': 'packung', 'Becher': 'becher', 'Glas': 'glas',
    'Blatt': 'blatt', 'Zweig': 'zweig', 'Handvoll': 'handvoll', 'Prise': 'prise', 'Msp.': 'msp',
  };
  const ML = { ml: 1, cl: 10, l: 1000, TL: 5, EL: 15 };

  function eintrag(zutat) {
    const k = Zutaten.suchen(zutat.name, TABELLE);
    return k ? TABELLE[k] : null;
  }

  /** Gewicht der Zutat in Gramm für die Rezeptmenge (Grundportionen), oder null wenn unbekannt */
  function gramm(zutat) {
    if (zutat.gramm != null) return zutat.gramm;
    const e = eintrag(zutat);
    const einheit = zutat.einheit || 'Stück';
    if (einheit === 'g') return zutat.menge;
    if (einheit === 'kg') return zutat.menge * 1000;
    if (ML[einheit]) return zutat.menge * ML[einheit] * ((e && e.dichte) || 1);
    const proStueck = (e && e[FELD[einheit]]) || STANDARD[einheit];
    return proStueck != null ? zutat.menge * proStueck : null;
  }

  /**
   * Nährwerte eines Rezepts.
   * Rückgabe: { portion: {...}, gesamt: {...} (für r.personen), fehlend: [Namen] }
   * Zutaten ohne Menge (Salz nach Geschmack) und optionale Zutaten zählen nicht mit.
   */
  function berechnen(rezept) {
    const summe = { kcal: 0, eiweiss: 0, kh: 0, zucker: 0, fett: 0, ballast: 0 };
    const fehlend = [];
    for (const z of rezept.zutaten || []) {
      if (z.abschnitt || z.menge == null || z.optional || z.naehrwerte === false) continue;
      const e = eintrag(z);
      const gr = gramm(z);
      if (!e || gr == null) { fehlend.push(z.name); continue; }
      for (const k of Object.keys(summe)) summe[k] += e[k] * gr / 100;
    }
    const personen = rezept.personen || 4;
    const portion = {};
    for (const k of Object.keys(summe)) portion[k] = summe[k] / personen;
    return { portion, gesamt: summe, fehlend };
  }

  /**
   * Ernährungs-Merkmale pro Portion (Richtwerte für ein Hauptgericht).
   * Energieanteile: Eiweiß/Kohlenhydrate 4 kcal/g, Fett 9 kcal/g.
   */
  const MERKMALE = [
    { id: 'eiweiss', name: 'Eiweißreich', test: (p) => p.eiweiss >= 30 || p.eiweiss * 4 >= p.kcal * 0.2 },
    { id: 'leicht', name: 'Leicht', test: (p) => p.kcal <= 500 },
    { id: 'lowcarb', name: 'Low Carb', test: (p) => p.kh <= 30 },
    { id: 'fettarm', name: 'Fettarm', test: (p) => p.fett * 9 <= p.kcal * 0.3 },
    { id: 'ballast', name: 'Ballaststoffreich', test: (p) => p.ballast >= 10 },
    { id: 'fettreich', name: 'Fettreich', test: (p) => p.fett * 9 >= p.kcal * 0.5 },
  ];
  function merkmale(rezept) {
    const p = berechnen(rezept).portion;
    return p.kcal ? MERKMALE.filter((m) => m.test(p)) : [];
  }

  g.Naehrwerte = { TABELLE, berechnen, gramm, MERKMALE, merkmale };
})(globalThis);
