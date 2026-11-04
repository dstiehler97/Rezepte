/*
 * VORLAGE – kopieren, umbenennen (z. B. rezepte/linsen-dal.js), ausfüllen.
 * Danach: node tools/pruefen.js   (prüft das Rezept und trägt es in liste.js ein)
 *
 * Mengen immer für "personen" angeben (Standard 4). Die App rechnet um und rundet sinnvoll.
 * Einheiten: g, kg, ml, cl, l, TL, EL, Prise, Msp., Stück (oder weglassen), Zehe, Dose,
 *            Packung, Päckchen, Becher, Glas, Bund, Scheibe, Blatt, Zweig, Stange, Handvoll, Würfel
 *
 * Felder je Zutat:
 *   menge     Zahl (weglassen = "nach Geschmack", z. B. Salz)
 *   einheit   siehe oben (weglassen = Stück)
 *   name      Einzahl, z. B. "Zwiebel"
 *   mehrzahl  optional, z. B. "Zwiebeln" (für 2 Zwiebeln)
 *   hinweis   optional, z. B. "fein gewürfelt"
 *   optional  true = optionale Zutat
 *   fix       true = wird beim Umrechnen nicht verändert (z. B. 1 Lorbeerblatt)
 *   einkauf   Kategorie überschreiben, z. B. "Tiefkühl"
 *   icon      Icon überschreiben (Name aus assets/icons.js) oder null für keins
 *   gramm     Gewicht der angegebenen Menge, falls die Nährwertberechnung es nicht kennt
 *   naehrwerte false = nicht in die Nährwerte einrechnen
 *   ernaehrung fleisch | fisch | tierisch | vegan – falls die automatische Erkennung danebenliegt
 * Abschnitte: { abschnitt: 'Für den Teig' }
 *
 * Nudeln, Reis & Getreide IMMER als Trockengewicht in g (wie auf der Packung).
 * Nährwerte werden automatisch aus assets/naehrwerte.js berechnet (pro Portion + gesamt).
 * Zutaten ohne Menge (Salz nach Geschmack) und optionale Zutaten zählen nicht mit.
 * Ernährungsform (vegan, vegetarisch, mit Fisch, mit Fleisch) wird aus den Zutaten erkannt
 * (assets/zutaten.js, TIERISCH; optionale Zutaten zählen nicht). Überschreiben mit
 *   ernaehrung: 'vegan' | 'vegetarisch' | 'fisch' | 'fleisch'
 *
 * In Schritten keine Mengen schreiben ("die Hälfte der Milch" statt "250 ml Milch"),
 * damit beim Umrechnen nichts falsch wird. **fett** ist erlaubt.
 */
Rezept({
  id: 'rezept-id',              // = Dateiname ohne .js
  titel: 'Titel',
  beschreibung: '',
  kategorie: 'Hauptgericht',    // z. B. Frühstück, Vorspeise, Hauptgericht, Beilage, Süßes, Backen
  tags: [],
  personen: 4,
  zeit: { vorbereitung: 0, kochen: 0 },   // Minuten; optional auch ruhen, backen
  schwierigkeit: 'einfach',     // einfach | mittel | anspruchsvoll
  // ernaehrung: 'vegetarisch', // nur falls die Erkennung aus den Zutaten nicht passt

  zutaten: [
    { menge: 1, name: 'Zwiebel', mehrzahl: 'Zwiebeln', hinweis: 'gewürfelt' },
    { name: 'Salz' },
  ],

  schritte: [
    'Erster Schritt.',
  ],

  tipps: [],
});
