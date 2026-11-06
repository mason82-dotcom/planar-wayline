# Flächenrouten-Planer (Planar Wayline)

Ein reines Web-Frontend zum Planen von **DJI-Flächenrouten** (Kartierung). Im Browser zeichnest du ein Messgebiet, erzeugst eine Nadir-Route (Orthofoto) oder eine Schrägaufnahme mit fünf Blickrichtungen und exportierst sie als KMZ nach dem **DJI-WPML-Standard**. Die Datei lässt sich in **DJI FlightHub 2** und **DJI Pilot 2** importieren und auf DJI-Enterprise-Drohnen ausführen.

Es gibt kein Backend und keine Benutzerkonten: Routen werden als KMZ-Datei heruntergeladen.

<p align="center">
  <img src="docs/images/ortho-route.png" alt="Planung einer Nadir-Flächenroute" width="900" />
</p>

<p align="center">
  <em>Für beliebig geformte Messgebiete entsteht automatisch eine mäanderförmige Route; Überlappung, Flughöhe und Geschwindigkeit sind einstellbar.</em>
</p>

---

## Was die App kann

| Funktion | Beschreibung |
| --- | --- |
| **WPML-Export** | Standard-KMZ mit `template.kml` und `waylines.wpml`, kompatibel zum Routenformat von FlightHub 2 und Pilot 2 |
| **KMZ-Import** | Flächenrouten aus FlightHub/Pilot (`mapping2d`, `mapping3d`) laden: Messgebiet, Wegpunkte und Parameter werden übernommen |
| **Höhenbezug** | Über Meer (ASL, EGM96), über Startpunkt (ALT) und über Gelände (AGL, Geländefolge) |
| **Kurven** | Export als Polylinie; die Drohne glättet die Kurven selbst (`coordinateTurn`) |
| **Überlappung und Tempo** | Quer- und Längsüberlappung, empfohlene Höchstgeschwindigkeit und minimales Fotointervall wie in FlightHub |

**Fluggeräte:** Matrice 4T (Vorgabe), 4E, 4TD, 4D, Matrice 3TD, 3D, Mavic 3E, 3T, 3M, 3TA, Matrice 30 und 30T. Die Auswahl bestimmt den Bildwinkel der Weitwinkelkamera (Linien- und Fotoabstand) und die Gerätekennung im Export (`droneEnumValue`, `droneSubEnumValue`, `payloadEnumValue` laut DJI Cloud API). Beim Import wird das Fluggerät aus der Datei übernommen; innerhalb einer Gerätefamilie entscheidet wie in Pilot 2 die Kamera.

**Sicherheit:** Verhalten bei Verbindungsverlust (Vorgabe: Rückkehr zum Startpunkt), Aktion nach dem letzten Wegpunkt, Sicherheitshöhe nach dem Start und Rückkehrhöhe sind einstellbar, werden aus importierten Dateien übernommen und im Browser gespeichert.

---

## Funktionen im Überblick

### Messgebiet und Route

- **Freies Messgebiet:** In der 3D-Karte (CesiumJS) Eckpunkte setzen, mit Rechtsklick abschließen. Auch unregelmäßige Formen sind möglich.
- **Automatische Mäanderroute:** Linienabstand und Fotoabstand ergeben sich aus Ausrichtung, Flughöhe und Überlappung.
- **Nadir (Orthofoto):** eine Route mit senkrecht nach unten gerichteter Kamera, für Orthofotos und 2D-Karten.
- **Schräg (5 Richtungen):** fünf Routen für 3D-Modelle; Länge, Flugzeit und Fotoanzahl je Route sind einzeln einsehbar.
- **Ausrichtung der Fluglinien:** 0° bis 179°, die Route wird sofort neu berechnet.
- **Überschneidungsprüfung:** Ein Messgebiet, das sich selbst schneidet, wird erkannt und gemeldet.

### Höhe und Geländefolge

<p align="center">
  <img src="docs/images/terrain-follow.png" alt="Höhenbezug über Gelände (Geländefolge)" width="900" />
</p>

- **Über Meer (ASL):** Alle Wegpunkte liegen auf derselben Höhe über dem Meeresspiegel (EGM96).
- **Über Startpunkt (ALT):** Alle Wegpunkte liegen auf derselben Höhe über dem Referenz-Startpunkt. Beim Flug zählt der tatsächliche Startpunkt der Drohne.
- **Über Gelände (AGL):** Die Wegpunkte folgen dem Geländemodell und halten überall denselben Bodenabstand, geeignet für Hügel und Weinberge.
- Flughöhe von etwa **2 m bis 1500 m**, in Schritten oder per Direkteingabe.

### Flug- und Fotoparameter

- **Routengeschwindigkeit** 1 bis 15 m/s, mit Empfehlung aus dem Fotoabstand
- **Anfluggeschwindigkeit** zum ersten Wegpunkt, separat einstellbar
- **Referenz-Startpunkt** per Klick in die Karte, für den Modus „Über Startpunkt“ und die Vorschau des Anflugs
- **Quer- und Längsüberlappung** 10 % bis 90 %, bestimmen Linien- und Fotoabstand
- **Auslösung** nach Zeitintervall (abgestimmt auf Geschwindigkeit und Fotoabstand)
- **Gimbal-Neigung** für Schrägaufnahmen von etwa -85° bis -40°
- **Live-Statistik:** Fläche, Routenlänge, Flugzeit und Fotoanzahl

### Import und Export

- **Route speichern:** Namen eingeben, die KMZ-Datei (DJI WPMZ) wird heruntergeladen.
- **Route importieren:** Eine KMZ-Datei stellt Messgebiet, Route und Einstellungen wieder her.

---

## Karten- und Geländedaten

Ohne weitere Einrichtung nutzt die App **freie Quellen ohne API-Schlüssel**:

| Zweck | Quelle |
| --- | --- |
| Luftbild weltweit | Esri World Imagery |
| Luftbild regional (optional) | beliebiger WMS-Dienst, z. B. **LGL Baden-Württemberg DOP20** (20 cm, Lizenz dl-de/by-2-0) |
| Geländemodell | **Mapterhorn** (Terrarium-Kacheln, in Europa hochauflösend) |

Die Geländehöhen aus Mapterhorn sind Höhen über dem Meer. Die App rechnet sie mit dem Geoidmodell **EGM96** in Ellipsoidhöhen (WGS84) um, die Cesium und der WPML-Export verwenden. In Süddeutschland macht das rund **48 m** aus. Ohne diese Umrechnung würden Routen mit Geländefolge entsprechend zu tief fliegen.

Wer einen **Cesium-ion-Token** hat (kostenlos auf [ion.cesium.com](https://ion.cesium.com/)), kann ihn eintragen. Dann nutzt die App wie im Original ion-Luftbild und Cesium World Terrain.

### Einstellungen (Umgebungsvariablen, zur Build-Zeit)

| Variable | Bedeutung |
| --- | --- |
| `VITE_HOME_VIEW` | Startansicht `Länge,Breite,Höhe`, z. B. `8.585,49.153,3000` |
| `VITE_CESIUM_TOKEN` | optionaler Cesium-ion-Token |
| `VITE_IMAGERY_URL`, `VITE_IMAGERY_CREDIT` | weltweites Luftbild (XYZ-Vorlage), Quellenangabe |
| `VITE_ORTHO_WMS_URL`, `VITE_ORTHO_WMS_LAYERS` | regionaler WMS-Luftbilddienst und Ebene |
| `VITE_ORTHO_CREDIT`, `VITE_ORTHO_BOUNDS`, `VITE_ORTHO_MAX_LEVEL` | Quellenangabe, Gebiet `West,Süd,Ost,Nord`, höchste Zoomstufe |
| `VITE_TERRAIN_URL`, `VITE_TERRAIN_ENCODING`, `VITE_TERRAIN_MAX_LEVEL` | Geländekacheln (`terrarium` oder `mapbox`) |
| `VITE_PORT` | Port des Entwicklungsservers (Standard `5180`) |

---

## Technik

- Vue 3, TypeScript, Vite
- CesiumJS (3D-Karte und Gelände)
- Element Plus (Oberfläche, deutsche Sprachdatei)
- Turf.js (Geometrie), JSZip (KMZ), egm96-universal (Geoid)

---

## Schnellstart

**Voraussetzung:** Node.js 18 oder neuer.

```bash
npm ci
npm run dev
npm test        # Tests (Vitest): Gerätezuordnung, Export/Import, Höhen
```

Dann die angezeigte Adresse öffnen, standardmäßig `http://localhost:5180`.

## Build und Betrieb

```bash
npm run build:prod
```

Das Ergebnis liegt in `dist/`. Vite verwendet relative Pfade (`base: './'`), die Dateien lassen sich daher mit jedem Webserver ausliefern (nginx, Caddy, Objektspeicher).

---

## Typischer Ablauf mit FlightHub 2 / Pilot 2

1. Messgebiet zeichnen, Nadir oder Schräg wählen, Höhenbezug festlegen (im Gelände mit Höhenunterschieden **Über Gelände**).
2. Überlappung, Ausrichtung und Geschwindigkeit einstellen; Fläche, Länge und Fotoanzahl prüfen.
3. **Route speichern** und die KMZ-Datei herunterladen.
4. KMZ in FlightHub 2 importieren oder auf die Fernsteuerung (Pilot 2) übertragen.
5. Route vor dem Flug in Pilot 2 prüfen und ausführen.

Umgekehrt geht es ebenso: KMZ aus FlightHub exportieren, hier **Route importieren**, bearbeiten und wieder speichern.

---

## Grenzen

- Reines Frontend: keine Routenbibliothek, keine Konten, keine Server-Schnittstelle.
- Der Referenz-Startpunkt dient nur der Planung; im Flug zählt der tatsächliche Startpunkt.
- Die Geländefolge ist nur so genau wie das Geländemodell. Bäume und Gebäude sind darin **nicht** enthalten. Sicherheitsabstände in Pilot 2 bzw. vor Ort prüfen.
- Infrarot-Aufnahmen werden noch nicht unterstützt.
- Liegt die Route weniger als 30 m über dem höchsten Geländepunkt, weist die App auf Hindernisse hin.

---

## Lizenz

MIT, siehe [LICENSE](LICENSE).
