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
6. `node tools/pdf.js <ordner> <id>` → **genau 1 Seite** (Verkleinerung bis 85 % ist ok). Sonst Text straffen.

## Inhalt

- **Immer `personen: 4`.** Mengen = Originalmengen für 4 Personen (nicht runden, z. B. 320 g bleibt 320 g).
- **Metrisch:** g, ml, EL, TL, Prise, Stück … – keine Tassen/Cups. `1/2 l` → `500 ml`.
- **Nudeln, Reis, Bulgur, Couscous, Quinoa, Linsen: immer Trockengewicht in g.**
- Gemüse, das die App im Schritt in Gramm zeigt (z. B. „400 g Süßkartoffeln“), in **g** übernehmen; sonst Stück.
  Grob reicht: fehlt das Gewicht, Stück mit üblichem Stückgewicht.
- **Alle Zutaten aufnehmen**, auch Salz, Pfeffer, Öl, Wasser (Wasser landet automatisch nicht auf der Einkaufsliste).
  Salz/Pfeffer ohne Menge = „nach Geschmack“.
- Zutaten, die nur in Schritten vorkommen (z. B. Petersilie zum Garnieren), ergänzen – als `optional: true`, wenn „nach Belieben“.
- Ein Ölbedarf, der auf mehrere Schritte verteilt ist („einen Teil“, „restliches Öl“), wird **zusammengezählt** als eine Zutat.
- Name in Einzahl, `mehrzahl` angeben, wenn Stückzahl > 1 möglich (`Zwiebel` / `Zwiebeln`).
  Zusatzinfos wie „frisch“, „gerieben“, „ungesalzen“ in `hinweis`, nicht im Namen.
- Zutaten in Abschnitte gliedern, wenn sinnvoll (`{ abschnitt: 'Für die Sauce' }`, „Zum Servieren“).

## Schritte

- „Alles parat?“ weglassen.
- Eigene, klare Formulierung; kleine Schritte zusammenfassen (Ziel 6–12 Schritte), in Abschnitte gliedern
  (z. B. Vorbereiten / Kochen / Servieren; parallele Abläufe als eigener Abschnitt, z. B. „Bulgur (parallel)“).
- **Keine Mengen in den Schritten** („die Hälfte des Öls“, „restliche Sojasauce“) – sonst stimmt das Umrechnen nicht.
- Zeiten und wichtige Hinweise **fett**: `**5 Minuten**`, `**ohne Öl**`.

## Metadaten

- `kategorie`: Frühstück, Vorspeise, Suppe, Hauptgericht, Beilage, Salat, Süßes, Backen.
- `tags`: Küche (Asiatisch, Italienisch …), Hauptzutat, Eigenschaft. **„Vegetarisch“/„Vegan“** nur, wenn es stimmt
  (KptnCook `suitableForDiet` prüfen; Austernsauce, Fischsauce, Rinderbrühe, Parmesan mit Lab beachten).
- `zeit`: realistisch schätzen (Vorbereitung + Kochen). KptnCook-Angabe ist oft zu knapp –
  Summe der Garzeiten aus den Schritten + Schnippelzeit als Maßstab.
- `schwierigkeit`: einfach | mittel | anspruchsvoll.
- `beschreibung`: ein sachlicher Satz in eigenen Worten (nicht den KptnCook-Werbespruch übernehmen).
- `tipps`: optional, eigene sinnvolle Hinweise (Varianten, Ersatzzutaten). Leer lassen, wenn nichts Sinnvolles.
- **Keine Quelle** angeben.
- `bild: 'bilder/<id>.jpg'` (vom Import-Werkzeug).

## Nicht tun

- Nichts committen oder pushen – das erledigt die Hauptsitzung nach Prüfung.
- Keine Änderungen an `assets/app.js`, `assets/style.css`, `index.html`.
