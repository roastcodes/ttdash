# Performance Review

## Kurzfazit

Die Laufzeitperformance wirkt fuer einen lokalen Analytics-Dashboard-Use-Case aktuell brauchbar, aber der Code zeigt klare Skalierungsgrenzen: ein schweres Initial-Bundle, mehrere komplette Datenpasses pro Filterwechsel und einige bewusst teure Testpfade.

## Was bereits gut ist

- Sekundaere Oberflaechen wie `SettingsModal`, `DrillDownModal`, Forecast-Zoom und Help sind lazy geladen
- Viele teure Ableitungen sind bereits in `useMemo(...)` gekapselt
- Auto-Import und Background-Pfade sind zumindest gegen Parallelstarts abgesichert

## Findings

### H-01 - Das Initial-Bundle ist fuer ein lokales Dashboard weiterhin schwer

**Evidenz:** `npm run build:app`

Die Build-Ausgabe zeigt mehrere grosse Chunks:

- `charts-vendor` -> `422.02 kB` raw / `119.59 kB` gzip
- `index` -> `212.32 kB` raw / `57.55 kB` gzip
- `react-vendor` -> `200.38 kB` raw / `64.43 kB` gzip
- `motion-vendor` -> `125.85 kB` raw / `41.08 kB` gzip
- `i18n` -> `119.68 kB` raw / `36.70 kB` gzip

Die Lazy-Splits helfen fuer modale Nebenwege, aber das Kern-Dashboard bleibt sehr chart-lastig und schwer. Auf schwachen Geraeten oder in eingebetteten Browsern ist das der wahrscheinlichste Performance-Flaschenhals beim Kaltstart.

**Empfehlung:** kritische First-View-Visualisierungen priorisieren und weniger wichtige Charts spaeter oder sektional nachladen.

### M-01 - Ein Filterwechsel loest mehrere komplette Datenpasses aus

**Referenzen:** `src/hooks/use-dashboard-filters.ts:64-114`, `src/hooks/use-dashboard-filters.ts:164-201`, `src/hooks/use-computed-metrics.ts:8-29`, `shared/dashboard-domain.js:261-520`

Pro Aenderung an Filtern oder ViewMode wird die Datenmenge mehrfach komplett durchlaufen:

- sortieren
- Datumsfilter
- Providerfilter
- Modellfilter
- Aggregation
- Metrics
- Provider- und Modellaggregation
- Chart-Transforms
- Unique-Model-Listen

Fuer kleine Datensaetze ist das okay. Fuer groessere Historien wird es teuer, weil viele Schritte nicht dieselben Vorberechnungen teilen.

**Empfehlung:** gemeinsame Vorberechnungen zentralisieren, vor allem fuer provider/model-Indexes und bereits normalisierte Breakdown-Maps.

### M-02 - Der Settings-Dialog koppelt UI-Opening an eine externe Registry-Abfrage

**Referenzen:** `src/components/features/settings/SettingsModal.tsx:241-271`, `server.js:2208-2247`

Beim Oeffnen des Settings-Dialogs wird der Toktrack-Versionstatus angefragt, und der Server kann dafuer `npm view` mit Timeout starten. Das ist logisch nachvollziehbar, aber es koppelt einen lokalen UI-Dialog an eine externe Netzabhaengigkeit.

Der bestehende Cache entschraerft das, beseitigt das Grundmuster aber nicht. Offline oder in restriktiven Netzen fuehrt das zu wiederholter Fehlermeldungsarbeit und vermeidbarer Laufzeitkomplexitaet.

**Empfehlung:** Version-Check optional auf explizite Nutzeraktion legen oder im Hintergrund einmal pro Session vorwaermen.

### N-01 - Die langsamsten Frontend-Tests deuten auf komplexe UI-Inseln hin

**Evidenz:** `npm run test:timings`

Die langsamsten Frontend-Suites haengen an `SettingsModal`, `DrillDownModal`, `HeatmapCalendar`, Sortierungstabellen und Filterzugriffen. Das ist nicht nur ein Testthema, sondern ein Signal fuer komplexe UI-Inseln mit hoher Interaktions- und Renderlast.

**Empfehlung:** grosse Interaktionskomponenten weiter zerlegen und bei UI-Hotspots systematisch zwischen Renderlogik, Datenlogik und Accessibility-Glue unterscheiden.
