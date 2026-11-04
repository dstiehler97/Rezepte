Rezept({
  id: 'spaghetti-bolognese',
  titel: 'Spaghetti Bolognese',
  beschreibung: 'Der Klassiker – lange geschmort, damit die Sauce richtig sämig wird.',
  kategorie: 'Hauptgericht',
  tags: ['Pasta', 'Klassiker', 'Fleisch'],
  personen: 4,
  zeit: { vorbereitung: 20, kochen: 90 },
  schwierigkeit: 'einfach',

  zutaten: [
    { abschnitt: 'Für die Sauce' },
    { menge: 500, einheit: 'g', name: 'Rinderhackfleisch' },
    { menge: 1, name: 'Zwiebel', mehrzahl: 'Zwiebeln', hinweis: 'fein gewürfelt' },
    { menge: 2, einheit: 'Zehe', name: 'Knoblauch' },
    { menge: 1, name: 'Karotte', mehrzahl: 'Karotten', hinweis: 'fein gewürfelt' },
    { menge: 1, einheit: 'Stange', name: 'Staudensellerie' },
    { menge: 2, einheit: 'EL', name: 'Tomatenmark' },
    { menge: 2, einheit: 'Dose', name: 'stückige Tomaten', hinweis: 'à 400 g' },
    { menge: 150, einheit: 'ml', name: 'Rotwein', optional: true },
    { menge: 2, einheit: 'EL', name: 'Olivenöl' },
    { menge: 1, name: 'Lorbeerblatt', mehrzahl: 'Lorbeerblätter', fix: true },
    { name: 'Salz' },
    { name: 'Pfeffer' },
    { abschnitt: 'Außerdem' },
    { menge: 500, einheit: 'g', name: 'Spaghetti' },
    { menge: 60, einheit: 'g', name: 'Parmesan', hinweis: 'frisch gerieben' },
  ],

  schritte: [
    'Öl in einem großen Topf erhitzen. Hackfleisch darin bei starker Hitze krümelig und **kräftig braun** anbraten.',
    'Zwiebel, Karotte und Sellerie zugeben und 5 Minuten mitbraten. Knoblauch fein hacken, kurz mitbraten.',
    'Tomatenmark einrühren und 2 Minuten rösten. Mit Rotwein ablöschen und fast vollständig einkochen lassen.',
    'Tomaten und Lorbeerblatt zugeben, mit Salz und Pfeffer würzen. Zugedeckt bei kleiner Hitze mindestens 1 Stunde schmoren, gelegentlich umrühren.',
    'Spaghetti in reichlich Salzwasser nach Packungsangabe al dente kochen.',
    'Lorbeerblatt entfernen, Sauce abschmecken. Mit den Spaghetti und Parmesan servieren.',
  ],

  tipps: [
    'Die Sauce schmeckt am nächsten Tag noch besser und lässt sich gut einfrieren.',
  ],
});
