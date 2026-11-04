Rezept({
  id: 'one-pot-hackfleisch-porree-nudeln',
  titel: 'One-Pot Hackfleisch-Porree-Nudeln',
  beschreibung: 'Du mich Lauch!',
  kategorie: 'Hauptgericht', // TODO prüfen
  tags: [],
  personen: 4,
  zeit: { vorbereitung: 15, kochen: 15 },
  schwierigkeit: 'einfach', // TODO prüfen
  bild: 'bilder/one-pot-hackfleisch-porree-nudeln.jpg',

  // Original für 2 Portionen, umgerechnet auf 4. TODO: Namen/Einheiten prüfen
  zutaten: [
    { menge: 500, einheit: 'g', name: 'Hackfleisch, Rind' },
    { menge: 400, einheit: 'g', name: 'Orecchiette' },
    { menge: 2, name: 'Porree' },
    { menge: 4, einheit: 'EL', name: 'Olivenöl' },
    { menge: 1000, einheit: 'ml', name: 'Gemüsebrühe' },
    { name: 'Pfeffer' },
    { name: 'Salz' },
  ],

  // TODO: Die Webseite zeigt nur die ersten Schritte – Rest von Screenshots ergänzen
  schritte: [
    'Porree der Länge nach halbieren, gründlich waschen und in Scheiben schneiden.',
    'Öl in einer großen Pfanne auf hoher Stufe erhitzen und Hackfleisch ca. 5 min scharf anbraten, bis es krümelig wird.',
  ],

  tipps: [],
  quelle: 'KptnCook',
});
