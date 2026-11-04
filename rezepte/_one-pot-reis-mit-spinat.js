Rezept({
  id: 'one-pot-reis-mit-spinat',
  titel: 'One Pot-Reis mit Spinat',
  beschreibung: 'Aus dem Topf gezaubert!',
  kategorie: 'Hauptgericht', // TODO prüfen
  tags: [],
  personen: 4,
  zeit: { vorbereitung: 30, kochen: 0 },
  schwierigkeit: 'einfach', // TODO prüfen
  bild: 'bilder/one-pot-reis-mit-spinat.jpg',

  // Original für 2 Portionen, umgerechnet auf 4. TODO: Namen/Einheiten prüfen
  zutaten: [
    { menge: 600, einheit: 'g', name: 'Tomate' },
    { menge: 320, einheit: 'g', name: 'Risottoreis' },
    { menge: 320, einheit: 'g', name: 'Blattspinat, frisch' },
    { menge: 120, einheit: 'g', name: 'Joghurt, natur' },
    { menge: 2, name: 'Speisezwiebel' },
    { menge: 720, einheit: 'ml', name: 'Wasser' },
    { menge: 4, einheit: 'EL', name: 'Olivenöl' },
    { menge: 2, name: 'Zehe(n) Knoblauch' },
    { menge: 1, einheit: 'TL', name: 'Chiliflocken' },
    { name: 'Pfeffer' },
    { name: 'Salz' },
  ],

  // TODO: Die Webseite zeigt nur die ersten Schritte – Rest von Screenshots ergänzen
  schritte: [
    'Zum Enthäuten, Tomaten mit einem Messer vorsichtig kreuzweise einschneiden und mit kochendem Wasser übergießen. Kurz warten und anschließend die Schale der Tomaten mit einem Messer behutsam abziehen.',
    'Die geschälten Tomaten in kleine Stücke schneiden.',
  ],

  tipps: [],
});
