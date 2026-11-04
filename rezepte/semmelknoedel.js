Rezept({
  id: 'semmelknoedel',
  titel: 'Semmelknödel',
  beschreibung: 'Die klassische Beilage zu Braten, Gulasch und Pilzrahm.',
  kategorie: 'Beilage',
  tags: ['Vegetarisch', 'Knödel', 'Klassiker'],
  personen: 4,
  zeit: { vorbereitung: 15, ruhen: 15, kochen: 20 },
  schwierigkeit: 'einfach',
  bild: 'bilder/semmelknoedel.jpg',

  zutaten: [
    { menge: 300, einheit: 'g', name: 'Knödelbrot', hinweis: 'oder 6 altbackene Brötchen, gewürfelt' },
    { menge: 300, einheit: 'ml', name: 'Milch' },
    { menge: 1, name: 'Zwiebel', mehrzahl: 'Zwiebeln' },
    { menge: 1, einheit: 'EL', name: 'Butter' },
    { menge: 3, name: 'Eier' },
    { menge: 0.5, einheit: 'Bund', name: 'Petersilie' },
    { name: 'Salz' },
    { name: 'Pfeffer' },
    { name: 'Muskatnuss', hinweis: 'frisch gerieben' },
    { menge: 2, einheit: 'EL', name: 'Semmelbrösel', optional: true, hinweis: 'falls der Teig zu weich ist' },
  ],

  schritte: [
    { abschnitt: 'Teig' },
    'Milch lauwarm erwärmen, über das Knödelbrot gießen und **15 Minuten** ziehen lassen.',
    'Zwiebel fein würfeln und in der Butter glasig dünsten. Petersilie fein hacken.',
    'Zwiebel, Petersilie und Eier zum Brot geben, mit Salz, Pfeffer und Muskat würzen und alles gut verkneten. Der Teig soll sich formen lassen – ist er zu weich, Semmelbrösel untermischen.',
    'Mit nassen Händen 8 gleich große, feste Knödel formen.',
    { abschnitt: 'Garen' },
    'Reichlich Salzwasser in einem großen Topf aufkochen, dann die Hitze reduzieren. Die Knödel einlegen und im **nur leicht siedenden** Wasser **20 Minuten** ziehen lassen.',
    'Mit einer Schaumkelle herausheben und gut abtropfen lassen.',
  ],

  tipps: [
    'Erst einen Probeknödel garen: Zerfällt er, noch etwas Semmelbrösel in den Teig kneten.',
    'Übrige Knödel am nächsten Tag in Scheiben schneiden und in Butter knusprig braten – evtl. mit Ei.',
  ],
});
