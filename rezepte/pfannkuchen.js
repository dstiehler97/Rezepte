Rezept({
  id: 'pfannkuchen',
  titel: 'Pfannkuchen',
  beschreibung: 'Dünne, goldene Pfannkuchen – süß oder herzhaft.',
  kategorie: 'Süßes',
  tags: ['Vegetarisch'],
  personen: 4,
  zeit: { vorbereitung: 10, ruhen: 15, kochen: 20 },
  schwierigkeit: 'einfach',
  bild: 'bilder/pfannkuchen.jpg',

  zutaten: [
    { abschnitt: 'Für den Teig' },
    { menge: 250, einheit: 'g', name: 'Mehl' },
    { menge: 1, einheit: 'EL', name: 'Zucker' },
    { menge: 1, einheit: 'Prise', name: 'Salz' },
    { menge: 4, name: 'Ei', mehrzahl: 'Eier' },
    { menge: 250, einheit: 'ml', name: 'Milch', hinweis: 'zum Glattrühren' },
    { menge: 250, einheit: 'ml', name: 'Milch', hinweis: 'zum Verdünnen' },
    { abschnitt: 'Zum Ausbacken' },
    { menge: 30, einheit: 'g', name: 'Butter' },
  ],

  schritte: [
    'Mehl, Zucker und Salz in einer Schüssel mischen. Eier und Milch zum Glattrühren zugeben und zu einem glatten Teig rühren.',
    'Übrige Milch nach und nach unterrühren. Teig **15 Minuten** ruhen lassen.',
    'Etwas Butter in einer Pfanne bei mittlerer Hitze schmelzen. Eine Kelle Teig hineingeben und durch Schwenken verteilen.',
    'Backen, bis die Unterseite goldbraun ist, wenden und kurz fertig backen. Mit dem restlichen Teig ebenso verfahren.',
  ],

  tipps: [
    'Süß mit Zimt und Zucker oder Apfelmus, herzhaft mit Käse und Schinken.',
  ],
});
