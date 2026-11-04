Rezept({
  id: 'tofu-scramble-mit-gemuese',
  titel: 'Tofu-Scramble mit Gemüse',
  beschreibung: 'Tofutastisches Frühstück',
  kategorie: 'Hauptgericht', // TODO prüfen
  tags: [],
  personen: 4,
  zeit: { vorbereitung: 30, kochen: 0 },
  schwierigkeit: 'einfach', // TODO prüfen
  bild: 'bilder/tofu-scramble-mit-gemuese.jpg',

  // Original für 2 Portionen, umgerechnet auf 4. TODO: Namen/Einheiten prüfen
  zutaten: [
    { menge: 560, einheit: 'g', name: 'Tofu, natur' },
    { menge: 300, einheit: 'g', name: 'Champignon' },
    { menge: 140, einheit: 'g', name: 'Blattspinat, frisch' },
    { menge: 140, einheit: 'g', name: 'Cherrytomate' },
    { menge: 80, einheit: 'g', name: 'Tomate, getrocknet, in Öl' },
    { menge: 30, einheit: 'g', name: 'Tomatenmark' },
    { menge: 2, name: 'Speisezwiebel' },
    { menge: 4, einheit: 'TL', name: 'Kurkuma' },
    { menge: 2, einheit: 'TL', name: 'Paprikapulver, geräuchert' },
    { menge: 2, einheit: 'EL', name: 'Olivenöl' },
    { menge: 2, name: 'Zehe(n) Knoblauch' },
    { menge: 1, einheit: 'EL', name: 'Wasser' },
    { name: 'Pfeffer' },
    { name: 'Salz' },
  ],

  // TODO: Die Webseite zeigt nur die ersten Schritte – Rest von Screenshots ergänzen
  schritte: [
    'Pilze putzen und in feine Scheiben schneiden.',
    'Spinat waschen und abtropfen lassen.',
  ],

  tipps: [],
});
