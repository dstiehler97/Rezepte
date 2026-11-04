# Rezepte

Rezeptsammlung mit Wochenplan, Einkaufsliste und einheitlichem Druckformat (A4).
Läuft ohne Installation: `index.html` im Browser öffnen, oder über GitHub Pages.

## Funktionen

- **Personen einstellbar** (Standard 4) – alle Mengen werden umgerechnet und **sinnvoll gerundet**:
  - Gewicht/Volumen auf runde Werte (`375 g`, `65 ml`, ab 1000 → `1,25 kg`)
  - Löffel nur in ¼/½-Schritten, kleine EL werden zu TL, winzige Mengen zu „1 Prise“
  - Stück in ½-Schritten, Eier nur ganz, Zehen/Scheiben/Blätter ganz
- **Nudeln, Reis & Getreide** immer als Trockengewicht in g (wie auf der Packung) – wird geprüft und im Rezept als „Trockengewicht“ markiert.
- **Nährwerte** (Kalorien, Eiweiß, Kohlenhydrate, Zucker, Fett, Ballaststoffe) werden aus den Zutaten berechnet: pro Portion und gesamt für die gewählte Personenzahl. Werte pro 100 g stehen in `assets/naehrwerte.js`.
- **Einheitlicher Druck**: jedes Rezept gleich aufgebaut (Kopf, Personen/Zeit/Schwierigkeit, Zutaten links, Schritte rechts), schwarz-weiß-tauglich, gedruckt wird mit der gewählten Personenzahl.
- **Immer eine Seite**: Vor dem Drucken misst die App das Rezept; ist es zu lang, wird es gleichmäßig verkleinert (bis 75 %), damit es auf eine A4-Seite passt.
- **Kochbuch**: alle Rezepte auf einmal drucken, jedes auf eigener Seite.
- **Wochenplan**: Rezepte mit Personenzahl auf Tage verteilen (wird im Browser gespeichert).
- **Einkaufsliste** aus dem Wochenplan: gleiche Zutaten werden zusammengerechnet, nach Ladenbereichen sortiert, Grundvorrat (Salz, Pfeffer, Öl, Mehl …) separat unter „Vorrat prüfen“. Abhaken, eigene Einträge, Export als **Text, .txt, .md**, Teilen (Handy) und Drucken.
- **SVG-Icons** für Zutaten (Salz, Pfeffer, Öl, Zucker, Mehl, Butter, Ei, Milch, Käse, Knoblauch, Zwiebel, Tomate, Zitrone, Chili, Kräuter …) – einzeln in [`icons/`](icons).

## Neues Rezept anlegen

1. `rezepte/_vorlage.js` kopieren, z. B. nach `rezepte/linsen-dal.js` (Dateiname = `id`).
2. Ausfüllen – Mengen immer für 4 Personen.
3. `node tools/pruefen.js` ausführen: prüft das Rezept, trägt es in `rezepte/liste.js` ein, exportiert die Icons und testet die Rundung.

**Aus KptnCook:** `node tools/kptncook.js <link>` legt einen Entwurf `rezepte/_<id>.js` mit Zutaten (auf 4 Personen umgerechnet), Zeiten und Foto an. Die Webseite zeigt nur die ersten Schritte – Rest aus Screenshots ergänzen, dann in `rezepte/<id>.js` umbenennen.

**Fotos** liegen in `bilder/` (`bild: 'bilder/<id>.jpg'`) und erscheinen auf der Übersicht, im Rezeptkopf und im Ausdruck oben rechts.

Mengen nicht in die Arbeitsschritte schreiben („die Hälfte der Milch“ statt „250 ml Milch“), sonst stimmen sie nach dem Umrechnen nicht.

## GitHub Pages

Einmalig im Repo auf GitHub: **Settings → Pages → Build and deployment → Source: „Deploy from a branch“, Branch: `main`, Ordner `/ (root)`** → Save.
Nach ca. einer Minute ist die Seite unter `https://dstiehler97.github.io/Rezepte/` erreichbar.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | App |
| `assets/einheiten.js` | Einheiten, Umrechnung, Rundungsregeln |
| `assets/zutaten.js` | Zutaten-Lexikon: Einkaufs-Kategorie, Icon, Vorrat |
| `assets/naehrwerte.js` | Nährwerte pro 100 g + Stückgewichte |
| `assets/icons.js` | alle SVG-Icons |
| `assets/style.css` | Bildschirm- und Druck-Layout |
| `rezepte/*.js` | ein Rezept pro Datei |
| `tools/pruefen.js` | Prüfung + `liste.js` + Icon-Export |
| `tools/kptncook.js` | Entwurf aus KptnCook-Link |
| `tools/pdf.js` | Rezept oder Kochbuch als PDF (wie Drucken) |
| `bilder/` | Gerichtsfotos |
