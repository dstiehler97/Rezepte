/*
 * Zutaten-Lexikon
 * ---------------
 * Ordnet Zutaten automatisch einer Einkaufs-Kategorie und einem Icon zu.
 *   k     = Kategorie in der Einkaufsliste (Reihenfolge = Weg durch den Laden)
 *   icon  = Name aus assets/icons.js
 *   vorrat = landet unter "Vorrat prüfen" statt auf der normalen Liste
 *   ganz  = nur ganze Stück (z. B. Eier)
 *   nie   = nie auf die Einkaufsliste (Wasser)
 * Gefunden wird über den Namen: exakt, oder als Wortende (Meersalz -> salz).
 * In einem Rezept kann man alles überschreiben (einkauf, icon, vorrat, ganz).
 */
(function (g) {
  'use strict';

  const KATEGORIEN = [
    'Obst & Gemüse',
    'Kräuter',
    'Fleisch & Fisch',
    'Kühlregal',
    'Brot & Backwaren',
    'Nudeln, Reis & Getreide',
    'Konserven & Gläser',
    'Backen & Nüsse',
    'Gewürze & Öle',
    'Getränke',
    'Tiefkühl',
    'Sonstiges',
  ];

  const OG = 'Obst & Gemüse', KR = 'Kräuter', FF = 'Fleisch & Fisch', KU = 'Kühlregal',
    BR = 'Brot & Backwaren', NR = 'Nudeln, Reis & Getreide', KO = 'Konserven & Gläser',
    BA = 'Backen & Nüsse', GW = 'Gewürze & Öle', GE = 'Getränke';

  const LEXIKON = {
    // Gewürze & Grundvorrat
    'salz':          { k: GW, icon: 'salz', vorrat: true },
    'pfeffer':       { k: GW, icon: 'pfeffer', vorrat: true },
    'paprikapulver': { k: GW, icon: 'chili', vorrat: true },
    'chiliflocken':  { k: GW, icon: 'chili', vorrat: true },
    'muskat':        { k: GW, icon: 'gewuerz', vorrat: true },
    'muskatnuss':    { k: GW, icon: 'gewuerz', vorrat: true },
    'zimt':          { k: GW, icon: 'gewuerz', vorrat: true },
    'kreuzkümmel':   { k: GW, icon: 'gewuerz', vorrat: true },
    'currypulver':   { k: GW, icon: 'gewuerz', vorrat: true },
    'oregano':       { k: GW, icon: 'kraeuter', vorrat: true },
    'lorbeerblatt':  { k: GW, icon: 'kraeuter', vorrat: true },
    'lorbeer':       { k: GW, icon: 'kraeuter', vorrat: true },
    'öl':            { k: GW, icon: 'oel', vorrat: true },
    'essig':         { k: GW, icon: 'oel', vorrat: true },
    'brühe':         { k: GW, icon: 'gewuerz', vorrat: true },
    'senf':          { k: GW, icon: 'gewuerz' },
    'sojasauce':     { k: GW, icon: 'oel' },
    'chilisauce':    { k: GW, icon: 'chili' },
    'sriracha':      { k: GW, icon: 'chili' },
    'honig':         { k: GW, icon: 'gewuerz' },
    'wasser':        { icon: 'wasser', nie: true },

    // Backen
    'zucker':        { k: BA, icon: 'zucker', vorrat: true },
    'mehl':          { k: BA, icon: 'mehl', vorrat: true },
    'backpulver':    { k: BA, icon: 'mehl', vorrat: true },
    'speisestärke':  { k: BA, icon: 'mehl', vorrat: true },
    'vanillezucker': { k: BA, icon: 'zucker' },
    'erdnüsse':      { k: BA, icon: 'nuss' },
    'nüsse':         { k: BA, icon: 'nuss' },
    'mandeln':       { k: BA, icon: 'nuss' },
    'cashewkerne':   { k: BA, icon: 'nuss' },
    'walnüsse':      { k: BA, icon: 'nuss' },

    // Kühlregal
    'butter':        { k: KU, icon: 'butter' },
    'ei':            { k: KU, icon: 'ei', ganz: true },
    'eier':          { k: KU, icon: 'ei', ganz: true },
    'milch':         { k: KU, icon: 'milch' },
    'sahne':         { k: KU, icon: 'milch' },
    'schmand':       { k: KU, icon: 'milch' },
    'joghurt':       { k: KU, icon: 'milch' },
    'quark':         { k: KU, icon: 'milch' },
    'käse':          { k: KU, icon: 'kaese' },
    'parmesan':      { k: KU, icon: 'kaese' },
    'mozzarella':    { k: KU, icon: 'kaese' },
    'gouda':         { k: KU, icon: 'kaese' },
    'feta':          { k: KU, icon: 'kaese' },
    'hefe':          { k: KU, icon: 'mehl' },

    // Obst & Gemüse
    'zwiebel':       { k: OG, icon: 'zwiebel' },
    'schalotte':     { k: OG, icon: 'zwiebel' },
    'frühlingszwiebel': { k: OG, icon: 'kraeuter' },
    'knoblauch':     { k: OG, icon: 'knoblauch' },
    'knoblauchzehe': { k: OG, icon: 'knoblauch' },
    'tomate':        { k: OG, icon: 'tomate' },
    'kirschtomate':  { k: OG, icon: 'tomate' },
    'zitrone':       { k: OG, icon: 'zitrone' },
    'limette':       { k: OG, icon: 'zitrone' },
    'chili':         { k: OG, icon: 'chili' },
    'chilischote':   { k: OG, icon: 'chili' },
    'karotte':       { k: OG, icon: 'karotte' },
    'möhre':         { k: OG, icon: 'karotte' },
    'kartoffel':     { k: OG, icon: 'kartoffel' },
    'süßkartoffel':  { k: OG, icon: 'kartoffel' },
    'paprika':       { k: OG },
    'paprikaschote': { k: OG },
    'staudensellerie': { k: OG },
    'sellerie':      { k: OG },
    'zucchini':      { k: OG },
    'aubergine':     { k: OG },
    'champignon':    { k: OG },
    'pilze':         { k: OG },
    'lauch':         { k: OG },
    'porree':        { k: OG },
    'spinat':        { k: OG, icon: 'kraeuter' },
    'salat':         { k: OG, icon: 'kraeuter' },
    'gurke':         { k: OG },
    'apfel':         { k: OG },
    'ingwer':        { k: OG },

    // Kräuter (frisch)
    'petersilie':    { k: KR, icon: 'kraeuter' },
    'basilikum':     { k: KR, icon: 'kraeuter' },
    'schnittlauch':  { k: KR, icon: 'kraeuter' },
    'thymian':       { k: KR, icon: 'kraeuter' },
    'rosmarin':      { k: KR, icon: 'kraeuter' },
    'koriander':     { k: KR, icon: 'kraeuter' },
    'dill':          { k: KR, icon: 'kraeuter' },
    'minze':         { k: KR, icon: 'kraeuter' },

    // Fleisch & Fisch
    'hackfleisch':   { k: FF, icon: 'fleisch' },
    'hähnchenbrust': { k: FF, icon: 'fleisch' },
    'hähnchen':      { k: FF, icon: 'fleisch' },
    'speck':         { k: FF, icon: 'fleisch' },
    'schinken':      { k: FF, icon: 'fleisch' },
    'bacon':         { k: FF, icon: 'fleisch' },
    'pancetta':      { k: FF, icon: 'fleisch' },
    'fleisch':       { k: FF, icon: 'fleisch' },
    'lachs':         { k: FF, icon: 'fisch' },
    'fisch':         { k: FF, icon: 'fisch' },
    'garnele':       { k: FF, icon: 'fisch' },

    // Trockenware
    'spaghetti':     { k: NR, icon: 'nudeln' },
    'nudeln':        { k: NR, icon: 'nudeln' },
    'penne':         { k: NR, icon: 'nudeln' },
    'tagliatelle':   { k: NR, icon: 'nudeln' },
    'reis':          { k: NR, icon: 'reis' },
    'risottoreis':   { k: NR, icon: 'reis' },
    'couscous':      { k: NR, icon: 'reis' },
    'linsen':        { k: NR, icon: 'reis' },
    'haferflocken':  { k: NR, icon: 'mehl' },

    // Konserven
    'tomatenmark':       { k: KO, icon: 'tomate' },
    'stückige tomaten':  { k: KO, icon: 'tomate' },
    'passierte tomaten': { k: KO, icon: 'tomate' },
    'kokosmilch':        { k: KO, icon: 'milch' },
    'kichererbsen':      { k: KO },
    'mais':              { k: KO },

    // Brot
    'brot':          { k: BR },
    'brötchen':      { k: BR },
    'semmelbrösel':  { k: BR, icon: 'mehl', vorrat: true },

    // Getränke
    'rotwein':       { k: GE },
    'weißwein':      { k: GE },
  };

  const SCHLUESSEL = Object.keys(LEXIKON).sort((a, b) => b.length - a.length);

  function normal(text) {
    return String(text || '').toLowerCase().replace(/[(),.;:]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function finden(name) {
    const n = normal(name);
    if (LEXIKON[n]) return LEXIKON[n];
    const woerter = n.split(' ');
    for (const s of SCHLUESSEL) {
      if (s.includes(' ')) { if (n.includes(s)) return LEXIKON[s]; continue; }
      for (const w of woerter) {
        const formen = [w, w.replace(/n$/, ''), w.replace(/en$/, ''), w.replace(/s$/, '')];
        if (formen.some((f) => f === s || (f.length > s.length + 2 && f.endsWith(s)))) return LEXIKON[s];
      }
    }
    return {};
  }

  /** Alle Infos zu einer Zutat; Angaben im Rezept haben Vorrang. */
  function info(zutat) {
    const l = finden(zutat.name);
    return {
      kategorie: zutat.einkauf || l.k || 'Sonstiges',
      icon: zutat.icon !== undefined ? zutat.icon : (l.icon || null),
      vorrat: zutat.vorrat !== undefined ? zutat.vorrat : !!l.vorrat,
      ganz: zutat.ganz !== undefined ? zutat.ganz : !!l.ganz,
      nie: zutat.nie !== undefined ? zutat.nie : !!l.nie,
    };
  }

  g.Zutaten = { KATEGORIEN, LEXIKON, info, normal };
})(globalThis);
