# Regeln für neue Rezepte

Gilt für jedes Rezept, das in `rezepte/` aufgenommen wird – egal ob aus KptnCook-Link + Screenshots oder frei geschrieben.

## Ablauf (KptnCook)

1. `node tools/kptncook.js <link>` → legt Entwurf `rezepte/_<id>.js` und Foto `bilder/<id>.jpg` an.
   Der Link liefert: Titel, Zeiten, alle Zutaten (bereits auf 4 Personen umgerechnet), Foto und **nur die Schritte 1–3**.
   Rohdaten bei Bedarf: JSON-LD im HTML (`recipeYield`, `recipeIngredient`, `suitableForDiet`, `totalTime`).
2. Restliche Schritte (ab Schritt 4) aus den Screenshots ablesen. Screenshots zeigen die App bereits für **4 Personen**.
3. Entwurf löschen, fertiges Rezept als `rezepte/<id>.js` schreiben (Vorlage: `rezepte/_vorlage.js`).
4. Neue Zutaten in `assets/zutaten.js` (Kategorie, Icon, ggf. `vorrat`/`trocken`) **und** `assets/naehrwerte.js` (Werte pro 100 g, Stückgewichte) ergänzen.
5. `node tools/pruefen.js` → muss „Alles in Ordnung.“ melden, keine `!`-Warnungen zu fehlenden Nährwerten.
   Erzeugt dabei auch das Vorschaubild `bilder/klein/<id>.jpg` (verkleinert zu große Fotos auf 1200 px) und
   die neue Offline-Version in `sw.js` / `rezepte/liste.js` – beide Dateien mit abgeben.
6. `node tools/pdf.js <ordner> <id>` → **genau 1 Seite** (Verkleinerung bis 85 % ist ok). Sonst Text straffen.

## Inhalt

- **Immer `personen: 4`.** Mengen = Originalmengen für 4 Personen (nicht runden, z. B. 320 g bleibt 320 g).
- **Backrezepte nach Stück** (Muffins, Kekse, Tartelettes, Blechkuchen): zusätzlich `ergibt: { menge: 12, einheit: 'Muffins' }`
  (Einheit in der Mehrzahl, wie sie hinter der Zahl steht: 'Stück', 'Tartelettes', 'Blech'). `personen: 4` bleibt;
  die App stellt dann die Stückzahl in halben Rezepten ein (6/12/18 … Muffins) und zeigt Nährwerte pro Stück.
  „Ergibt 12 Stück“ dann nicht mehr in Beschreibung oder Tipps schreiben.
- **Metrisch:** g, ml, EL, TL, Prise, Stück … – keine Tassen/Cups. `1/2 l` → `500 ml`.
- **Nudeln, Reis, Bulgur, Couscous, Quinoa, Linsen: immer Trockengewicht in g.**
- Gemüse, das die App im Schritt in Gramm zeigt (z. B. „400 g Süßkartoffeln“), in **g** übernehmen; sonst Stück.
  Grob reicht: fehlt das Gewicht, Stück mit üblichem Stückgewicht.
- **Alle Zutaten aufnehmen**, auch Salz, Pfeffer, Öl, Wasser (Wasser landet automatisch nicht auf der Einkaufsliste).
  Salz/Pfeffer ohne Menge = „nach Geschmack“.
- Zutaten, die nur in Schritten vorkommen (z. B. Petersilie zum Garnieren), ergänzen – als `optional: true`, wenn „nach Belieben“.
- **Teilmengen aufteilen:** Wird eine Zutat auf mehrere Schritte verteilt („die Hälfte des Öls“, „restliche Sojasauce“),
  bekommt jede Teilmenge einen **eigenen Eintrag** – möglichst im passenden Abschnitt („Für die Marinade: 4 EL Sojasauce“,
  „Zum Braten: 2 EL Sojasauce“) oder mit Hinweis („zum Ablöschen“). Die Summe bleibt die Originalmenge.
  Die Einkaufsliste zählt gleiche Zutaten selbst zusammen. Sonst zeigt der Kochmodus bei jedem Schritt die volle Menge.
- Name in Einzahl, `mehrzahl` angeben, wenn Stückzahl > 1 möglich (`Zwiebel` / `Zwiebeln`).
  Zusatzinfos wie „frisch“, „gerieben“, „ungesalzen“ in `hinweis`, nicht im Namen.
- Zutaten in Abschnitte gliedern, wenn sinnvoll (`{ abschnitt: 'Für die Sauce' }`, „Zum Servieren“).

## Schritte

- „Alles parat?“ weglassen.
- Eigene, klare Formulierung; kleine Schritte zusammenfassen (Ziel 6–12 Schritte), in Abschnitte gliedern
  (z. B. Vorbereiten / Kochen / Servieren; parallele Abläufe als eigener Abschnitt, z. B. „Bulgur (parallel)“).
- **Keine Mengen in den Schritten** („200 ml Milch“, „die Hälfte des Öls“) – sonst stimmt das Umrechnen nicht.
- **Jeder Schritt passt eindeutig zu einem Zutateneintrag.** Bei aufgeteilten Zutaten im Schritt sagen, welche gemeint ist:
  „Olivenöl für die Sauce erhitzen“, „mit Sojasauce ablöschen“ (Hinweis „zum Ablöschen“), „Knoblauch für Sauce und Steak hacken“.
  Der Kochmodus ordnet so zu: Stichwort aus Abschnitt/Hinweis direkt neben der Zutat → Abschnitt des Schritts
  („Rahmsauce“ ↔ „Für die Rahmsauce“) → Reihenfolge (nächster Eintrag; „restliche/übrige Butter“ = der spätere).
  `tools/pruefen.js` warnt bei „Hälfte/Teil/restlich/Rest/übrig“ im Schritt, wenn die Zutat nur einmal vorkommt.
- Bei Würzmengen „Prise“ nur für 1–2 Prisen; mehr als 2 Prisen als TL angeben (4 Prisen ≈ ¼ TL).
- Zeiten und wichtige Hinweise **fett**: `**5 Minuten**`, `**ohne Öl**`.

## Metadaten

- `kategorie`: Frühstück, Vorspeise, Suppe, Hauptgericht, Beilage, Salat, Süßes, Backen.
- `tags`: Küche (Asiatisch, Italienisch …), Hauptzutat, Eigenschaft. **„Vegetarisch“/„Vegan“** nur, wenn es stimmt
  (KptnCook `suitableForDiet` prüfen; Austernsauce, Fischsauce, Rinderbrühe beachten).
  **Kein Tag „Schnell“** – das Merkmal berechnet die App aus der Gesamtzeit (≤ 30 Min.).
- Ernährungsform erkennt die App aus den Zutaten. Würzmittel aus Fisch/Meeresfrüchten (Austernsauce, Fischsauce,
  Worcestershire, Dashi, Sardellenpaste) machen ein Gericht **nicht vegetarisch**, aber nicht zum Fischgericht
  (Abzeichen „Nicht vegetarisch (Austernsauce)“, kein Filter „Mit Fisch“). Für Hartkäse (Parmesan, Bergkäse, Grana,
  Pecorino, Pesto) ergänzt die App bei vegetarischen Rezepten selbst den Tipp „Für streng vegetarisch Hartkäse ohne
  tierisches Lab verwenden“ – nicht zusätzlich in die Tipps schreiben.
- Namen ohne Marken (z. B. „Panierter Käsetaler“ statt Produktname); Schreibweise „One-Pot“ mit Bindestrich.
- `zeit`: realistisch schätzen (Vorbereitung + Kochen). KptnCook-Angabe ist oft zu knapp –
  Summe der Garzeiten aus den Schritten + Schnippelzeit als Maßstab.
- `schwierigkeit`: einfach | mittel | anspruchsvoll.
- `beschreibung`: ein sachlicher Satz in eigenen Worten (nicht den KptnCook-Werbespruch übernehmen).
- `tipps`: optional, eigene sinnvolle Hinweise (Varianten, Ersatzzutaten). Leer lassen, wenn nichts Sinnvolles.
- **Keine Quelle** angeben.
- `bild: 'bilder/<id>.jpg'` (vom Import-Werkzeug).
- **„Hinzugefügt am“ nicht eintragen** – `tools/pruefen.js` nimmt das Datum des ersten Commits der Datei (über Umbenennungen
  hinweg, z. B. vom Entwurf `_<id>.js`; noch nicht committet = heute). Nur wenn das falsch wäre: `hinzugefuegt: 'JJJJ-MM-TT'`.

## Nicht tun

- Nichts committen oder pushen – das erledigt die Hauptsitzung nach Prüfung.
- Keine Änderungen an `assets/app.js`, `assets/style.css`, `index.html`.
