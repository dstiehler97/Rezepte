/*
 * Zutaten-Lexikon
 * ---------------
 * Ordnet Zutaten automatisch einer Einkaufs-Kategorie und einem Icon zu.
 *   k     = Kategorie in der Einkaufsliste (Reihenfolge = Weg durch den Laden)
 *   icon  = Name aus assets/icons.js
 *   vorrat = landet unter "Vorrat prüfen" statt auf der normalen Liste
 *   ganz  = nur ganze Stück (z. B. Eier)
 *   nie   = nie auf die Einkaufsliste (Wasser)
 *   trocken = Menge immer als Trockengewicht in g (wie auf der Packung)
 * Gefunden wird über den Namen: exakt, oder als Wortende (Meersalz -> salz).
 * In einem Rezept kann man alles überschreiben (einkauf, icon, vorrat, ganz, ernaehrung).
 * Ernährungsform (vegan/vegetarisch/fisch/fleisch) kommt aus der Tabelle TIERISCH weiter unten.
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
    'kurkuma':       { k: GW, icon: 'gewuerz', vorrat: true },
    'piment':        { k: GW, icon: 'gewuerz', vorrat: true },
    'ghee':          { k: KU, icon: 'butter' },
    'oregano':       { k: GW, icon: 'kraeuter', vorrat: true },
    'getrocknete minze': { k: GW, icon: 'kraeuter', vorrat: true },
    'getrockneter rosmarin': { k: GW, icon: 'kraeuter', vorrat: true },
    'getrockneter thymian': { k: GW, icon: 'kraeuter', vorrat: true },
    'lorbeerblatt':  { k: GW, icon: 'kraeuter', vorrat: true },
    'lorbeer':       { k: GW, icon: 'kraeuter', vorrat: true },
    'öl':            { k: GW, icon: 'oel', vorrat: true },
    'sesamöl':       { k: GW, icon: 'oel' },
    'essig':         { k: GW, icon: 'oel', vorrat: true },
    'balsamico':     { k: GW, icon: 'oel', vorrat: true },
    'brühe':         { k: GW, icon: 'gewuerz', vorrat: true },
    'senf':          { k: GW, icon: 'gewuerz' },
    'sojasauce':     { k: GW, icon: 'oel' },
    'mirin':         { k: GW, icon: 'oel' },
    'chilisauce':    { k: GW, icon: 'chili' },
    'austernsauce':  { k: GW, icon: 'oel' },
    'gewürzmischung': { k: GW, icon: 'gewuerz', vorrat: true },
    'italienische kräuter': { k: GW, icon: 'kraeuter', vorrat: true },
    'kräuter der provence': { k: GW, icon: 'kraeuter', vorrat: true },
    'knoblauchpulver': { k: GW, icon: 'gewuerz', vorrat: true },
    'pesto':         { k: KO, icon: 'kraeuter' },
    'kapern':        { k: KO, icon: 'kraeuter' },
    'sriracha':      { k: GW, icon: 'chili' },
    'honig':         { k: GW, icon: 'gewuerz' },
    'wasser':        { icon: 'wasser', nie: true },

    // Backen
    'zucker':        { k: BA, icon: 'zucker', vorrat: true },
    'mehl':          { k: BA, icon: 'mehl', vorrat: true },
    'backpulver':    { k: BA, icon: 'mehl', vorrat: true },
    'natron':        { k: BA, icon: 'mehl', vorrat: true },
    'dinkelmehl':    { k: BA, icon: 'mehl' },
    'kokosblütenzucker': { k: BA, icon: 'zucker' },
    'kokosöl':       { k: GW, icon: 'oel' },
    'speisestärke':  { k: BA, icon: 'mehl', vorrat: true },
    'vanillezucker': { k: BA, icon: 'zucker' },
    'erdnüsse':      { k: BA, icon: 'nuss' },
    'nüsse':         { k: BA, icon: 'nuss' },
    'mandeln':       { k: BA, icon: 'nuss' },
    'cashewkerne':   { k: BA, icon: 'nuss' },
    'walnüsse':      { k: BA, icon: 'nuss' },
    'haselnüsse':    { k: BA, icon: 'nuss' },
    'walnusskerne':  { k: BA, icon: 'nuss' },
    'rosinen':       { k: BA },
    'haselnusskerne': { k: BA, icon: 'nuss' },
    'sesamsaat':     { k: BA, icon: 'nuss' },
    'sesam':         { k: BA, icon: 'nuss' },
    'pinienkerne':   { k: BA, icon: 'nuss' },

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
    'burrata':       { k: KU, icon: 'kaese' },
    'gouda':         { k: KU, icon: 'kaese' },
    'feta':          { k: KU, icon: 'kaese' },
    'schafkäse':     { k: KU, icon: 'kaese' },
    'hefe':          { k: KU, icon: 'mehl' },
    'gnocchi':       { k: KU, icon: 'nudeln' },
    'pfannenkäse':   { k: KU, icon: 'kaese' },
    'tofu':          { k: KU },
    'blätterteig':   { k: KU, icon: 'mehl' },

    // Obst & Gemüse
    'zwiebel':       { k: OG, icon: 'zwiebel' },
    'schalotte':     { k: OG, icon: 'zwiebel' },
    'frühlingszwiebel': { k: OG, icon: 'kraeuter' },
    'knoblauch':     { k: OG, icon: 'knoblauch' },
    'knoblauchzehe': { k: OG, icon: 'knoblauch' },
    'tomate':        { k: OG, icon: 'tomate' },
    'kirschtomate':  { k: OG, icon: 'tomate' },
    'cherrytomate':  { k: OG, icon: 'tomate' },
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
    'pfifferlinge':  { k: OG },
    'austernpilze':  { k: OG },
    'pilze':         { k: OG },
    'lauch':         { k: OG, icon: 'lauch' },
    'porree':        { k: OG, icon: 'lauch' },
    'spinat':        { k: OG, icon: 'kraeuter' },
    'grünkohl':      { k: OG, icon: 'kraeuter' },
    'salat':         { k: OG, icon: 'kraeuter' },
    'salat-mix':     { k: OG, icon: 'kraeuter' },
    'rucola':        { k: OG, icon: 'kraeuter' },
    'gurke':         { k: OG },
    'grüne bohnen':  { k: OG },
    'brechbohnen':   { k: OG },
    'apfel':         { k: OG },
    'banane':        { k: OG },
    'ingwer':        { k: OG },
    'avocado':       { k: OG },
    'radieschen':    { k: OG },

    // Kräuter (frisch)
    'petersilie':    { k: KR, icon: 'kraeuter' },
    'basilikum':     { k: KR, icon: 'kraeuter' },
    'schnittlauch':  { k: KR, icon: 'kraeuter' },
    'thymian':       { k: KR, icon: 'kraeuter' },
    'rosmarin':      { k: KR, icon: 'kraeuter' },
    'koriander':     { k: KR, icon: 'kraeuter' },
    'dill':          { k: KR, icon: 'kraeuter' },
    'minze':         { k: KR, icon: 'kraeuter' },
    'salbei':        { k: KR, icon: 'kraeuter' },

    // Fleisch & Fisch
    'hackfleisch':   { k: FF, icon: 'fleisch' },
    'hähnchenbrust': { k: FF, icon: 'fleisch' },
    'hähnchen':      { k: FF, icon: 'fleisch' },
    'rindersteak':   { k: FF, icon: 'fleisch' },
    'speck':         { k: FF, icon: 'fleisch' },
    'schinken':      { k: FF, icon: 'fleisch' },
    'bacon':         { k: FF, icon: 'fleisch' },
    'pancetta':      { k: FF, icon: 'fleisch' },
    'fleisch':       { k: FF, icon: 'fleisch' },
    'lachs':         { k: FF, icon: 'fisch' },
    'fisch':         { k: FF, icon: 'fisch' },
    'garnele':       { k: FF, icon: 'fisch' },

    // Trockenware
    'spaghetti':     { k: NR, icon: 'nudeln', trocken: true },
    'nudeln':        { k: NR, icon: 'nudeln', trocken: true },
    'penne':         { k: NR, icon: 'nudeln', trocken: true },
    'tagliatelle':   { k: NR, icon: 'nudeln', trocken: true },
    'reis':          { k: NR, icon: 'reis', trocken: true },
    'risottoreis':   { k: NR, icon: 'reis', trocken: true },
    'couscous':      { k: NR, icon: 'reis', trocken: true },
    'linsen':        { k: NR, icon: 'reis', trocken: true },
    'haferflocken':  { k: NR, icon: 'mehl' },
    'bulgur':        { k: NR, icon: 'reis', trocken: true },
    'quinoa':        { k: NR, icon: 'reis', trocken: true },
    'fusilli':       { k: NR, icon: 'nudeln', trocken: true },
    'orecchiette':   { k: NR, icon: 'nudeln', trocken: true },
    'rigatoni':      { k: NR, icon: 'nudeln', trocken: true },
    'makkaroni':     { k: NR, icon: 'nudeln', trocken: true },
    'linguine':      { k: NR, icon: 'nudeln', trocken: true },
    'pasta':         { k: NR, icon: 'nudeln', trocken: true },
    'farfalle':      { k: NR, icon: 'nudeln', trocken: true },
    'lasagneplatten': { k: NR, icon: 'nudeln', trocken: true },
    'reisnudeln':    { k: NR, icon: 'nudeln', trocken: true },
    'basmatireis':   { k: NR, icon: 'reis', trocken: true },
    'jasminreis':    { k: NR, icon: 'reis', trocken: true },
    'sushireis':     { k: NR, icon: 'reis', trocken: true },
    'sojagranulat':  { k: NR, trocken: true },

    // Konserven
    'tomatenmark':       { k: KO, icon: 'tomate' },
    'stückige tomaten':  { k: KO, icon: 'tomate' },
    'passierte tomaten': { k: KO, icon: 'tomate' },
    'geschälte tomaten': { k: KO, icon: 'tomate' },
    'getrocknete tomaten': { k: KO, icon: 'tomate' },
    'geröstete paprika': { k: KO },
    'kokosmilch':        { k: KO, icon: 'milch' },
    'pflanzlicher drink': { k: KU, icon: 'milch' },
    'preiselbeeren':     { k: KO },
    'kichererbsen':      { k: KO },
    'erbsen':            { k: 'Tiefkühl' },   // meist tiefgefroren
    'mais':              { k: KO },
    'olive':             { k: KO },

    // Brot
    'brot':          { k: BR },
    'brötchen':      { k: BR },
    'knödelbrot':    { k: BR },
    'baguette':      { k: BR },
    'semmelbrösel':  { k: BR, icon: 'mehl', vorrat: true },

    // Getränke
    'rotwein':       { k: GE },
    'weißwein':      { k: GE },
  };


  /*
   * Ernährungsform je Zutat: fleisch | fisch (auch Meeresfrüchte) | tierisch (Ei, Milch, Honig – noch vegetarisch).
   * Nicht aufgeführte Zutaten gelten als vegan. 'vegan' hebt Wortende-Treffer auf (Kokosmilch ≠ Milch).
   */
  const TIERISCH = {
    // Fleisch
    'fleisch': 'fleisch', 'hackfleisch': 'fleisch', 'rind': 'fleisch', 'schwein': 'fleisch', 'kalb': 'fleisch',
    'lamm': 'fleisch', 'hähnchen': 'fleisch', 'hähnchenbrust': 'fleisch', 'huhn': 'fleisch', 'hühnchen': 'fleisch',
    'pute': 'fleisch', 'putenbrust': 'fleisch', 'ente': 'fleisch', 'geflügel': 'fleisch', 'speck': 'fleisch',
    'schinken': 'fleisch', 'bacon': 'fleisch', 'pancetta': 'fleisch', 'wurst': 'fleisch', 'salami': 'fleisch',
    'chorizo': 'fleisch', 'würstchen': 'fleisch', 'schmalz': 'fleisch', 'gelatine': 'fleisch',
    'rinderbrühe': 'fleisch', 'hühnerbrühe': 'fleisch', 'fleischbrühe': 'fleisch', 'geflügelbrühe': 'fleisch',
    'kalbsfond': 'fleisch', 'rinderfond': 'fleisch', 'bratenfond': 'fleisch', 'knochenbrühe': 'fleisch',
    'hähnchenschenkel': 'fleisch', 'hähnchenkeule': 'fleisch', 'hähnchenfilet': 'fleisch', 'putenfilet': 'fleisch',
    'schweinefilet': 'fleisch', 'rinderfilet': 'fleisch', 'steak': 'fleisch', 'gulasch': 'fleisch',
    // Fisch & Meeresfrüchte
    'fisch': 'fisch', 'lachs': 'fisch', 'thunfisch': 'fisch', 'kabeljau': 'fisch', 'forelle': 'fisch',
    'garnele': 'fisch', 'shrimps': 'fisch', 'krabben': 'fisch', 'muscheln': 'fisch', 'tintenfisch': 'fisch',
    'sardellen': 'fisch', 'anchovis': 'fisch', 'fischsauce': 'fisch', 'fischfond': 'fisch',
    'lachsfilet': 'fisch', 'fischfilet': 'fisch', 'scampi': 'fisch',
    'austernsauce': 'fisch', 'worcestershiresauce': 'fisch', 'bonito': 'fisch', 'dashi': 'fisch',
    // tierisch, aber vegetarisch
    'eigelb': 'tierisch', 'eiweiß': 'tierisch', 'butter': 'tierisch',
    'butterschmalz': 'tierisch', 'ghee': 'tierisch', 'milch': 'tierisch', 'buttermilch': 'tierisch',
    'sahne': 'tierisch', 'schmand': 'tierisch', 'crème fraîche': 'tierisch', 'joghurt': 'tierisch',
    'quark': 'tierisch', 'käse': 'tierisch', 'frischkäse': 'tierisch', 'parmesan': 'tierisch',
    'mozzarella': 'tierisch', 'gouda': 'tierisch', 'feta': 'tierisch', 'schafkäse': 'tierisch', 'ricotta': 'tierisch',
    'mascarpone': 'tierisch', 'pecorino': 'tierisch', 'grana padano': 'tierisch', 'burrata': 'tierisch',
    'halloumi': 'tierisch', 'pesto': 'tierisch', 'honig': 'tierisch', 'mayonnaise': 'tierisch',
    // pflanzlich trotz ähnlichem Namen
    'kokosmilch': 'vegan', 'hafermilch': 'vegan', 'sojamilch': 'vegan', 'mandelmilch': 'vegan',
    'kokossahne': 'vegan', 'hafersahne': 'vegan', 'sojasahne': 'vegan', 'sojajoghurt': 'vegan',
    'erdnussbutter': 'vegan', 'kakaobutter': 'vegan', 'fruchtfleisch': 'vegan', 'kokosfleisch': 'vegan',
    'tofusteak': 'vegan', 'blumenkohlsteak': 'vegan',
  };

  /** fleisch | fisch | tierisch | vegan – Angabe "ernaehrung" an der Zutat hat Vorrang */
  function art(zutat) {
    if (zutat.ernaehrung) return zutat.ernaehrung;
    const n = normal(zutat.name);
    if (/\b(vegan|pflanzlich)/.test(n)) return 'vegan';
    if (/\bvegetarisch/.test(n)) return 'tierisch';
    if (/(^| )(ei|eiern?|\S+eiern?)( |$)/.test(n)) return 'tierisch'; // Ei nur als ganzes Wort (nicht Salbei, Reis)
    const k = suchen(zutat.name, TIERISCH);
    return k ? TIERISCH[k] : 'vegan';
  }

  /*
   * Ernährungsform eines Rezepts: vegan < vegetarisch < fisch < fleisch.
   * Optionale Zutaten zählen nicht. rezept.ernaehrung überschreibt das Ergebnis.
   * Liefert { id, auto, fisch, fleisch, gruende: [Zutatennamen] }.
   */
  const ERNAEHRUNG = ['vegan', 'vegetarisch', 'fisch', 'fleisch'];
  function ernaehrung(rezept) {
    const gruende = { fleisch: [], fisch: [], tierisch: [] };
    for (const z of rezept.zutaten || []) {
      if (z.abschnitt || z.optional) continue;
      const a = art(z);
      if (gruende[a] && !gruende[a].includes(z.name)) gruende[a].push(z.name);
    }
    const auto = gruende.fleisch.length ? 'fleisch' : gruende.fisch.length ? 'fisch' : gruende.tierisch.length ? 'vegetarisch' : 'vegan';
    const id = ERNAEHRUNG.includes(rezept.ernaehrung) ? rezept.ernaehrung : auto;
    const grund = id === 'fleisch' ? gruende.fleisch : id === 'fisch' ? gruende.fisch : id === 'vegetarisch' ? gruende.tierisch : [];
    return {
      id, auto,
      fleisch: id === 'fleisch',
      fisch: id === 'fisch' || (id === 'fleisch' && gruende.fisch.length > 0),
      gruende: id === auto ? grund : [],
    };
  }

  function normal(text) {
    return String(text || '').toLowerCase().replace(/[(),.;:]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Suchform: tolerant gegen Schreibweisen.
   * ä/ae → a, ö/oe → o, ü/ue → u, ß/ss → s, doppelte Buchstaben einfach, Bindestriche wie Leerzeichen.
   * „Süßkartoffel“, „Süsskartoffel“, „Suesskartoffel“ und „Süskartofel“ ergeben dasselbe.
   */
  function suchform(text) {
    return normal(text).replace(/-/g, ' ')
      .replace(/ä|ae/g, 'a').replace(/ö|oe/g, 'o').replace(/ü|ue/g, 'u').replace(/ß/g, 's')
      .replace(/([a-z])\1+/g, '$1').replace(/\s+/g, ' ').trim();
  }

  // Oberbegriffe für die Suche: „nudeln“ findet auch Spaghetti, Linguine usw.
  const OBERBEGRIFFE = {
    nudeln: ['spaghetti', 'linguine', 'pasta', 'penne', 'fusilli', 'farfalle', 'tagliatelle', 'orecchiette', 'rigatoni', 'makkaroni', 'gnocchi', 'lasagne'],
    pasta: ['spaghetti', 'linguine', 'nudeln', 'penne', 'fusilli', 'farfalle', 'tagliatelle', 'orecchiette', 'rigatoni', 'makkaroni', 'lasagne'],
    reis: ['risotto', 'basmati', 'jasmin', 'sushireis'],
    kase: ['parmesan', 'mozzarela', 'feta', 'burata', 'gouda', 'bergkase', 'schafkase'],
    fleisch: ['hack', 'rind', 'hahnchen', 'steak', 'speck', 'schinken'],
    huhn: ['hahnchen'], hahnchen: ['huhn', 'hahnchenbrust'],
    pilze: ['champignon', 'pfiferling', 'austernpilz'],
  };
  const ENDUNGEN = ['en', 'n', 'e', 's', 'er'];

  /**
   * Passt ein Suchwort zu einem Text? Beide werden in die Suchform gebracht.
   * Wortformen (Zwiebeln/Zwiebel, Tomaten/Tomate) und Oberbegriffe zählen mit.
   */
  function passtSuche(text, wort) {
    const t = suchform(text);
    const w = suchform(wort);
    if (!w) return true;
    if (t.includes(w)) return true;
    const formen = [w];
    for (const e of ENDUNGEN) if (w.length > e.length + 3 && w.endsWith(e)) formen.push(w.slice(0, -e.length));
    if (formen.some((f) => t.includes(f))) return true;
    const ober = formen.map((f) => OBERBEGRIFFE[f]).find(Boolean);
    return !!(ober && ober.some((o) => t.includes(o)));
  }

  /**
   * Sucht den passenden Schlüssel einer Tabelle zu einem Zutatennamen:
   * exakt, als mehrteiliger Begriff, oder als Wortende (Olivenöl -> öl, Zwiebeln -> zwiebel).
   * Der längste Treffer gewinnt.
   */
  const sortiert = new Map();
  function suchen(name, tabelle) {
    const n = normal(name);
    if (tabelle[n]) return n;
    if (!sortiert.has(tabelle)) sortiert.set(tabelle, Object.keys(tabelle).sort((a, b) => b.length - a.length));
    const woerter = n.split(' ');
    for (const s of sortiert.get(tabelle)) {
      if (s.includes(' ')) { if (n.includes(s)) return s; continue; }
      for (const w of woerter) {
        const formen = [w, w.replace(/n$/, ''), w.replace(/en$/, ''), w.replace(/s$/, '')];
        if (formen.some((f) => f === s || (f.length > s.length + 2 && f.endsWith(s)))) return s;
      }
    }
    return null;
  }
  function finden(name) {
    const k = suchen(name, LEXIKON);
    return k ? LEXIKON[k] : {};
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
      trocken: !!l.trocken,
    };
  }

  g.Zutaten = { suchform, passtSuche, KATEGORIEN, LEXIKON, info, normal, suchen, art, ernaehrung, ERNAEHRUNG };
})(globalThis);
