# Changelog

## [6.0.5] - 2026-04-04

### Improved
- **Dependency-Updates** — `@tanstack/react-query`, `i18next` und `react-i18next` sind auf die jeweils aktuellen Registry-Versionen angehoben
- **Kompatibilitätsprüfung** — Dashboard-Build sowie Browser-Smoketests für Jahresansicht, Filter, Datepicker, Command Palette und Sprachwechsel wurden nach dem Upgrade erneut verifiziert

## [6.0.4] - 2026-04-04

### Added
- **Globaler Filter-Reset** — der Filterstatus enthält jetzt einen `Reset all`-Button, und die Command Palette bietet eine direkte Aktion zum Zurücksetzen aller Filter auf den Default-Zustand

### Improved
- **Eigener Datums-Kalender** — der Zeitraumfilter nutzt jetzt einen dunklen, portalbasierten Kalender statt des nativen Browser-Datepickers, damit Darstellung und Stacking im Dark Mode konsistent bleiben
- **Datepicker-Stabilität** — der Kalender liegt jetzt zuverlässig über dem Dashboard und wird nicht mehr von nachfolgenden Sektionen oder Animationen überlagert

## [6.0.3] - 2026-04-04

### Added
- **Dashboard-Mehrsprachigkeit** — das Dashboard und der PDF-Report unterstützen jetzt Deutsch und Englisch auf Basis von `i18next` und `react-i18next`
- **Sprachwechsel in der Command Palette** — `cmd+k` enthält jetzt direkte Aktionen zum Wechseln zwischen Deutsch und Englisch

### Improved
- **Vollständige EN-Abdeckung** — Forecast, Cache-ROI, Vergleiche, Anomalien, Tabellen, Help-Panel, Auto-Import und ergänzende Dashboard-Stat-Karten sind vollständig in die neue Übersetzungsstruktur migriert
- **Locale-sensitive UI-Formate** — Datums-, Zahlen- und Wochentagsdarstellungen reagieren jetzt konsistent auf die aktive Sprache

## [6.0.2] - 2026-04-03

### Added
- **Limits & Subscriptions** — neues Provider-Limits-Modal mit lokaler Persistenz, Limits-Button im Header, eigener Dashboard-Sektion und Command-Palette-Einträgen für Konfiguration und Navigation

### Improved
- **Provider-Limits Visualisierung** — Budget- und Subscription-Status werden jetzt pro Anbieter in klar getrennten, animierten Tracks mit Break-even- bzw. Limit-Markierung dargestellt

### Fixed
- **Jahresansicht & Filterwechsel** — Tages-, Monats- und Jahresansicht bleiben bei Presets sowie Anbieter-, Modell- und Datumsfiltern stabil; Hook-Reihenfolgen in Analyse- und Forecast-Komponenten sind konsistent
- **Provider-Limits Tooltip-Clipping** — Info-Labels im Limits-Dialog werden am oberen Rand nicht mehr abgeschnitten

## [6.0.1] - 2026-04-03

### Added
- **PDF-Report in der Command Palette** — `cmd+k` enthält jetzt eine direkte Aktion zum Generieren des aktuell gefilterten PDF-Reports

### Fixed
- **Request-Qualität Info-Tooltip** — das Info-Label in der Karte wird nicht mehr am oberen Rand abgeschnitten
- **Gemeinsame Report-Aktion** — Toolbar-Button und Command Palette verwenden jetzt denselben Exportpfad inklusive Ladezustand und Toast-Feedback

## [6.0.0] - 2026-04-03

### Added
- **Typst-Report-Pipeline** — PDF-Reports werden jetzt serverseitig mit Typst kompiliert, inklusive sauberem Layout, eingebetteten SVG-Charts und filterkonsistenten Reportdaten statt DOM-Screenshot-Export
- **Report-Smoke-Test** — neue Prüfmatrix deckt Tages-, Monats- und Jahresansicht sowie kombinierte Provider-, Modell-, Monats- und Datumsfilter für die PDF-Generierung ab

### Improved
- **Filtertreue im PDF** — Report-Downloads übernehmen jetzt dieselben aktiven UI-Filter wie das Dashboard, inklusive Monatsauswahl, Datumsbereich, Providern und Modellen
- **Mobile/Responsive Report-Flow** — der Report-Button und der Downloadpfad funktionieren jetzt auch unter enger Viewport-Breite stabil

### Fixed
- **PDF-Layoutfehler** — Tabellenköpfe, Filterdarstellung und Einpunkt-Charts im Report verhalten sich jetzt robust auch bei extrem kleinen oder stark gefilterten Datensätzen
- **Typst-CLI Fallback** — Systeme ohne installierte Typst-CLI erhalten eine klare macOS-Hinweismeldung mit `brew install typst`

## [5.3.6] - 2026-04-02

### Added
- **Erweiterte Command Palette** — `cmd+k` bietet jetzt zusätzliche Sprungziele, Ansichtswechsel, Zeitraum-Presets sowie direkte Anbieter- und Modell-Filterbefehle auf Basis der aktuell verfügbaren Daten
- **Kontextsprünge** — direkte Navigation zu `Heute` und `Monat`, wenn diese Bereiche im aktuellen Filterzustand vorhanden sind

### Improved
- **Favicon-Auslieferung** — Root-, `public/`- und `dist/`-Icons sind jetzt synchron; HTML enthält zusätzliche `shortcut icon`- und `apple-touch-icon`-Links für robustere Browser-Erkennung

## [5.3.5] - 2026-04-02

### Improved
- **Filter-Konsistenz über alle Ansichten** — Tages-, Monats- und Jahressicht basieren jetzt auf derselben vollständig gefilterten Tagesbasis, damit Anbieter-, Modell- und Zeitraumfilter in KPIs, Header, Vergleichskarten und Tabellen übereinstimmen
- **Favicon & App-Branding** — neues `TTDash`-Monogramm als optimiertes SVG/PNG mit klarerer Wiedererkennbarkeit und besserer Lesbarkeit bei kleinen Größen
- **Release-Output im Terminal** — Installer und Server-Start zeigen die aktuelle App-Version jetzt dynamisch direkt aus `package.json`

### Fixed
- **Heute-/Monat-Karten bei Kombinationsfiltern** — Bereiche mit aktiven Anbieter-, Modell- und Datumsfiltern greifen nicht mehr auf unfiltrierte Rohdaten zurück
- **Header-Zeitraum & Periodenvergleich** — Datumsbadge und Vergleichswerte folgen jetzt derselben Filterbasis wie die restlichen Dashboard-Metriken

## [5.3.4] - 2026-04-02

### Added
- **Dashboard Insights** — neue verdichtete Analyse-Sektion mit Provider-Dominanz, Modell-Konzentration, Kosten- und Request-Ökonomie sowie Aktivitätsmustern
- **Responsive Tabellen-Karten** — `Recent Days` und `Model Efficiency` liefern auf kleinen Screens jetzt echte Card-Layouts statt primär horizontaler Scrollflächen

### Improved
- **Dashboard-Informationsdichte** — KPI-Karten, Chart-Untertitel und Tabellen-Summaries zeigen mehr Kontext, abgeleitete Kennzahlen und klarere Hilfstexte
- **Unbekannte Modellfamilien** — neue `toktrack`-Modelle werden robuster normalisiert, erhalten deterministische Farben und bleiben in Filtern, Charts und Tooltips sauber lesbar
- **Zahlenformatierung & Tooltips** — lange Werte werden kompakt dargestellt; Tooltips zeigen exakte Zahlen, Labels und zusätzliche Insights
- **Responsive Layouts** — Header, Filter-Bar, Karten, Zoom-Ansichten und Tabellen verhalten sich stabiler bei Resize, Tablet-Breite und Mobile

### Fixed
- **Windows Auto-Import** — Prozessstart für `toktrack`, `npx.cmd` und `bunx` ist unter Windows robuster, damit der Auto-Upload nicht mehr am `spawn`-Pfad scheitert
- **Expanded Donut-Charts** — Donuts sitzen im Zoom-Dialog tiefer, nutzen die verfügbare Fläche besser und kollidieren weniger mit Legenden
- **Request-Ökonomie ohne Request-Daten** — bei fehlenden `requestCount`-Feldern zeigt das UI jetzt `n/v` statt irreführender Nullwerte
- **Numerische Ausreißer im UI** — rohe lange Float-Werte werden nicht mehr ungefiltert im Dashboard angezeigt
- **Heuristik-Hinweise für Preis-Fallbacks** — Cache-ROI kennzeichnet fehlende Preisdefinitionen für unbekannte Modelle explizit statt stillschweigend
- **Erweiterbarkeit für neue Anbieter** — Provider-Erkennung deckt zusätzliche Familien wie `xAI`, `Meta`, `Cohere`, `Mistral`, `DeepSeek` und `Alibaba` besser ab
## [5.3.3] - 2026-04-02

### Improved
- **Performance-Optimierungen** — PDF-Export und schwere Modals werden jetzt lazy geladen; Datenpfade für gleitende Durchschnitte, Metriken und Filter wurden effizienter gemacht
- **Bundle-Splitting** — Vendor-Code ist in getrennte Chunks für React, Recharts, Motion und UI aufgeteilt, damit das Dashboard schneller initial lädt

### Fixed
- **Dashboard-Renderpfad** — Datenquellen-Initialisierung erfolgt nicht mehr während des Renderns, wodurch unnötige Renders und React-Warnungen vermieden werden
- **PDF-Export Ladezustand** — Export-Button bleibt nach Abschluss nicht mehr fälschlich im aktiven Zustand hängen
- **Server-Sicherheitsheader** — lokale Responses liefern jetzt grundlegende Schutz-Header wie `nosniff`, `DENY` und `same-origin`

## [5.3.2] - 2026-04-02

### Added
- **Toktrack-Migration & Rebranding** — Dashboard, Paket und UI laufen jetzt unter `TTDash` mit `toktrack` als primärem Datenformat; Legacy-`ccusage`-JSON bleibt kompatibel
- **Anbieter-Filter** — Filterung nach `OpenAI`, `Anthropic`, `Google` usw. mit passender Einschränkung der sichtbaren Modelle
- **Anbieter-Badges** — farbige Provider-Labels in Tabellen, Drill-downs und Filtern für bessere Modell-Zuordnung
- **Thinking- & Request-Metriken** — zusätzliche Nutzungsfelder im Datenmodell, in KPIs und Visualisierungen
- **Bun-aware Installation** — `install.sh` und `install.bat` nutzen Bun, wenn verfügbar, sonst npm

### Improved
- **Auto-Import Runner-Auswahl** — nutzt zuerst lokales `toktrack`, dann `bunx`, dann `npx --yes toktrack`; Statusmeldungen zeigen den tatsächlich verwendeten Pfad
- **Monatsprognose** — Forecast basiert jetzt auf Kalender-Tageskosten, geglätteter Run-Rate und defensiverer Volatilitätsbewertung statt einfacher linearer Regression
- **Kumulative Monatsprojektion** — verwendet dieselbe Shared-Forecast-Logik wie die Prognose-Karte
- **Animationen** — mehr Aufbauanimationen für Cards und Diagramme; beim Upload oder Auto-Import werden diese wieder in den Initialzustand zurückgesetzt
- **Lokaler App-Start** — öffnet beim Start aus dem Terminal direkt den Browser

### Fixed
- **Heatmap-Tooltip** — Hover-Labels sitzen wieder direkt über der Zelle statt viewport-versetzt
- **Dialog-A11y** — fehlende Beschreibungen für Radix-Dialoge ergänzt
- **Favicon & Tab-Titel** — Branding auf `TTDash` aktualisiert
- **Static Serving & Upload-Härtung** — Pfade und Upload-Validierung im Server robuster gemacht

## [5.3.1] - 2026-04-01

### Fixed
- **Datum in Heute/Monat-Sektion falsch** — `toISOString()` lieferte UTC-Datum statt Lokalzeit, wodurch zwischen Mitternacht und 02:00 MESZ das gestrige Datum angezeigt wurde. Betraf: Heute-KPIs, Monats-KPIs, Heatmap-Markierung, Streak-Berechnung, Datumsfilter-Presets, PDF/CSV-Dateinamen
- Neue `toLocalDateStr()`, `localToday()`, `localMonth()` Hilfsfunktionen ersetzen alle 7 `toISOString().slice()`-Aufrufe durch korrekte lokale Datumsberechnung

## [5.3.0] - 2026-03-31

### Fixed
- **Monatsansicht & Jahresansicht komplett überarbeitet** — alle Metriken, Diagramme und Tabellen zeigen jetzt korrekte Daten in der Monats- und Jahresansicht:
  - **Aktive Tage** — zeigt die tatsächliche Anzahl aktiver Tage (vorher: 1 pro Monat/Jahr wegen fehlender Aggregation)
  - **Ø Kosten** — korrekte Durchschnittsberechnung pro Tag (vorher: durch Anzahl Perioden geteilt statt Anzahl Tage)
  - **Datumformatierung** — Perioden wie "März 2026" und "2026" statt "So, 01.03.2026"
  - **Tabellen** — "Monate im Detail" / "Jahre im Detail" mit korrekter Beschriftung und Aggregation
  - **Modell-Effizienz** — "Ø/Mt." / "Monate" bzw. "Ø/Jahr" / "Jahre" Spaltenüberschriften
  - **Anomalie-Erkennung** — "Auffällige Monate" / "Auffällige Jahre"
  - **Cache ROI** — korrekte Durchschnittskosten-Berechnung
  - **Heatmap** — zeigt Hinweis "nur in der Tagesansicht verfügbar" statt fehlerhafter Darstellung
  - **Wochentagsanalyse** — ignoriert aggregierte Einträge (keine falschen Wochentag-Zuordnungen)
  - **Sektionsbeschriftungen** — "Monatliche/Jährliche Nutzungsübersicht"
- **PeriodComparison Monat-Bug** — `setMonth()` Overflow behoben: März 31 → Feb 31 → März 3 (klassischer JS-Date-Bug bei Monaten mit weniger Tagen)

### Technical
- Neues `_aggregatedDays`-Feld in `DailyUsage` trackt die Anzahl aggregierter Tage pro Eintrag
- `aggregateToDailyFormat()` setzt `date` auf Period-Key ("2026-03" / "2026") statt erstes Tagesdatum
- `computeMetrics()` und `computeModelCosts()` nutzen `_aggregatedDays` für korrekte Berechnungen
- `formatDate()` und `formatDateAxis()` erkennen Period-Strings und formatieren passend
- `periodLabel()` und `periodUnit()` Hilfsfunktionen für ansichtsabhängige Labels
- `viewMode`-Prop an 8 Komponenten weitergereicht für adaptive Beschriftung

## [5.2.1] - 2026-03-31

### Fixed
- **install.sh `-e` Ausgabe** — `echo -e` durch `printf` ersetzt, damit das Script auch mit `sh install.sh` korrekt funktioniert (POSIX-Shell kennt `echo -e` nicht)

## [5.2.0] - 2026-03-31

### Added
- **Monats-KPIs** — neue Sektion unter "Heute" zeigt 6 Kennzahlen des laufenden Monats: Kosten (mit Trend vs. Vormonat), Tokens, aktive Tage/Abdeckung, Modelle, $/1M Tokens, Cache-Hit-Rate. Wird automatisch ausgeblendet wenn keine Daten für den aktuellen Monat vorhanden sind

## [5.1.1] - 2026-03-31

### Fixed
- **Browser Tab Titel** — zeigt jetzt "CCUsage — Claude Code Dashboard" statt "localhost:3000"

## [5.1.0] - 2026-03-31

### Added
- **Datenquellen-Badge im Header** — zeigt woher die Daten stammen: "Gespeichert" (grau, bei App-Start), "Auto-Import · HH:MM" (grün, nach Import), oder "dateiname.json · HH:MM" (blau, nach Upload). Wird bei Löschen zurückgesetzt
- **Graceful Shutdown** — Server fährt bei Ctrl+C (SIGINT) und kill (SIGTERM) sauber herunter, schliesst offene Verbindungen ordentlich mit 3s Force-Exit Fallback

### Improved
- **Header Responsive** — 2-Zeilen-Layout statt 1-Zeile: Zeile 1 = Branding + Meta-Badges + Utility-Icons, Zeile 2 = Action-Buttons. Funktioniert sauber auf Desktop (1440px), Tablet (768px) und Mobile (375px)

## [5.0.1] - 2026-03-31

### Fixed
- **7-Tage Ø Linien unsichtbar** — Recharts 3 Line-Drawing-Animation überschrieb `stroke-dasharray` auf gestrichelten Linien, wodurch das Dash-Pattern zerstört wurde. Fix: `isAnimationActive={false}` auf allen 10 gestrichelten MA7/Prognose-Linien in 6 Chart-Komponenten

## [5.0.0] - 2026-03-31

### Added
- **Token-Effizienz Chart** — $/1M Tokens über die Zeit mit 7-Tage Ø und Durchschnitts-Referenzlinie, zeigt ob Kosten-Optimierung (Cache, Modell-Wahl) wirkt
- **Modell-Mix Chart** — Stacked percentage area chart zeigt Modell-Nutzungsanteile über die Zeit, visualisiert Migration-Muster (z.B. Wechsel von Opus 4.5 zu 4.6)
- **Aktiv-Streak** — Header zeigt konsekutive aktive Tage als 🔥-Badge
- **⌘K Shortcut-Hint** — Command Palette Discoverability im Header
- **Heatmap Today-Marker** — heutiger Tag mit blauer Umrandung hervorgehoben
- **Median/Tag Metrik** — ersetzt "Output Tokens" in SecondaryMetrics, zeigt typischen Tageswert mit Vergleich zum Durchschnitt (weniger anfällig für Ausreisser)
- **Modell-Effizienz Ø/Tag** — neue sortierbare Spalte zeigt durchschnittliche Kosten pro aktivem Tag pro Modell
- **DrillDown Token-Verteilung** — Stacked Bar mit Cache Read/Write/Input/Output Prozenten und farbiger Legende
- **DrillDown Modell-Anteile** — Prozentanzeige pro Modell im Detail-Modal
- **install.bat** — Windows-kompatibles Installationsscript

### Improved
- **FilterBar** — aktiver Preset-Button (7T, 30T, etc.) visuell hervorgehoben, Reset bei Filterwechsel
- **SectionHeaders** — linker Akzent-Border (`border-l-2 border-primary/40`) für visuelle Hierarchie
- **MetricCard Trends** — Badges mit farbigem Hintergrund-Pill statt reinem Text
- **Chart Tooltips** — Prozent-Anteil pro Eintrag, MA7-Werte korrekt vom Total separiert und mit gestricheltem Indikator abgetrennt
- **CostByWeekday** — Peak-Tag (orange) und Low-Tag (grün) farblich hervorgehoben, Subtitle zeigt Tagnamen
- **Heatmap** — 7-stufige Farbskala (vorher 4) für bessere Datenauflösung
- **ModelEfficiency** — Share-Bars in Modell-Farben statt generisch, neue Ø/Tag Spalte
- **RecentDays** — sortierbare Spalten (Datum, Kosten, Tokens, $/1M), Kosten-Intensitätsbalken pro Zeile
- **AnomalyDetection** — Severity-Levels: "KRITISCH" Badge + roter Hintergrund bei ≥3σ
- **Header** — Aktionen logisch gruppiert (Import → Export → Destructive), Löschen als Ghost-Icon mit destructive Hover, Date Range als Badge
- **TokensOverTime** — Prozent-Anteile in Token-Typ Summary-Boxen
- **PeriodComparison** — Delta-Werte als farbige Badges mit Hintergrund
- **CacheROI** — "Bezahlt" vs "Gespart" Visualisierung mit Legende
- **CostForecast** — Konfidenz-Badge (HOCH/MITTEL/NIEDRIG) farbkodiert, Ist-Kosten mit Farbverlauf
- **CumulativeCost** — End-of-Month Projektionslinie (gestrichelt) + Total im Subtitle
- **Modell-Mix** — Farbverläufe pro Modell für mehr Tiefe
- **TodayMetrics** — "$/1M Tokens" statt redundantem "Top Modell Kosten", korrektes Icon

### Fixed
- **Keyboard Shortcuts** — nicht-implementierte Shortcuts (⌘E, ⌘U, ⌘D, ⌘↑) aus Hilfe entfernt, die mit Browser-Shortcuts kollidierten
- **CustomTooltip Total** — MA7-Durchschnittswerte werden nicht mehr fälschlich ins Total eingerechnet
- **Token-Linien Dash-Pattern** — 7-Tage Ø Linien in Tokens-Charts nutzen jetzt `"5 5"` wie Kosten-Charts

## [4.0.0] - 2026-03-31

### Added
- **Auto-Import** — one-click data import directly from Claude Code usage logs via `ccusage` programmatic API, no manual file export needed
  - SSE streaming with real-time progress in a terminal-style modal
  - Fetches latest model pricing from LiteLLM for accurate cost calculation
  - Available in Header toolbar, EmptyState, and Command Palette
  - `ccusage` added as npm dependency for direct API access (no child process spawning)
- **Today KPIs** — new section after metrics showing current-day stats: cost (with trend vs. average), tokens, models used, top model cost, cache-hit-rate, input/output ratio. Auto-hidden when no data for today exists
- **Favicon** — "CC" branding icon in SVG + PNG, matching the app's primary blue on dark background
- **Install script** — `install.sh` for one-command setup (install, build, global install)

### Changed
- `ccusage` is now a production dependency instead of requiring external installation
- EmptyState now shows Auto-Import as primary action, manual upload as secondary
- Server no longer needs `child_process` for data import (uses programmatic API)

## [3.1.0] - 2026-03-31

### Upgraded
- **React** 18.3.1 → 19.2.4
- **react-dom** 18.3.1 → 19.2.4
- **TypeScript** 5.9.3 → 6.0.2
- **Vite** 6.4.1 → 8.0.3 (Rolldown bundler, ~10x faster builds)
- **@vitejs/plugin-react** 4.7.0 → 6.0.1
- **Recharts** 2.15.4 → 3.8.1
- **lucide-react** 0.469.0 → 1.7.0
- **jsPDF** 3.0.1 → 4.2.1 (security fix)
- **@tailwindcss/vite** 4.1.3 → 4.2.2
- **@types/react** 18.3.28 → 19.2.14
- **@types/react-dom** 18.3.7 → 19.2.3

### Changed
- Removed deprecated `baseUrl` from tsconfig.json (TypeScript 6 requirement)
- Renamed deprecated lucide icons: `HelpCircle` → `CircleHelp`, `AlertTriangle` → `TriangleAlert`, `Loader2` → `LoaderCircle`, `BarChart3` → `ChartBar`
- Adapted Recharts 3 type changes (`activeTooltipIndex`, deprecated `Cell`)
- Build time reduced from ~12s to ~1.5s thanks to Vite 8's Rolldown bundler
- 0 npm audit vulnerabilities

## [3.0.0] - 2026-03-31

### Added
- **Date Range Filter** with preset buttons (7T, 30T, Monat, Jahr, Alle)
- **Token-Analyse Redesign** — two separate charts for Cache and I/O tokens with independent Y-axes, solving the scale problem where Cache Read (4.5B) made Input/Output (3.2M) invisible
- **Per-Type 7-Tage Durchschnitt** for all four token types (Cache Read, Cache Write, Input, Output)
- **Total Tokens Chart** in zoom mode showing combined tokens with 7-day moving average
- **Per-Model 7-Tage Durchschnitt** in zoom mode for Kosten nach Modell
- **Zoom Stats Bar** showing Min, Max, Durchschnitt, Total, Datenpunkte for all charts
- **CSV Export** button in zoom mode for all charts
- **ExpandableCard stats** for Heatmap, Cache ROI, Periodenvergleich, Anomalie-Erkennung
- **Token Drill-Down** — click on token chart data points to open detail modal
- **Kostenprognose Trend** — week-over-week comparison and daily average in forecast card
- **Empty States** for Periodenvergleich and Anomalie-Erkennung with informative messages
- **Skeleton Loading** components replacing the plain "Laden..." text
- **Section Headers** with badges and descriptions for all dashboard sections
- **Help Panel** with keyboard shortcuts, metric explanations, and chart descriptions
- **Info Tooltips** (i) on all metric cards and chart headers
- **FormattedValue Tooltips** — hover over abbreviated numbers ($1.2k, 4.8B) to see exact values
- **Glassmorphism Theme** with backdrop-blur, gradient borders, and card shadows
- **Light Mode** fully polished alongside dark mode

### Fixed
- **PDF Export** — resolved html2canvas crash with Tailwind CSS v4 `oklab()` colors via canvas-based RGB conversion
- **Model Filter** — now correctly filters costs within each day (previously showed all models' costs if any matched)
- **MA7 Line invisible** — switched from `AreaChart` to `ComposedChart` so `<Line>` components render correctly alongside `<Area>`
- **Forecast Chart black** — removed opaque lower confidence band that masked data lines
- **Forecast in monthly/yearly view** — shows average cost summary instead of broken daily forecast
- **Forecast bridge point** — forecast line now connects from last actual data point
- **CostByModelOverTime misleading** — changed from stacked areas to individual lines per model
- **Tooltip clipping** — removed `overflow-hidden` from Card component
- **Tooltip delay** — reduced from 700ms to 100ms for responsive feel
- **Info labels** — ChartCard now uses InfoButton (Radix Tooltip) instead of native HTML title
- **CostByWeekday white hover** — replaced default cursor with themed overlay
- **Periodenvergleich timezone bug** — fixed UTC date shift in week calculations
- **Periodenvergleich data source** — uses full dataset (model-filtered only) instead of date-filtered data
- **Wochenstart Montag** — week comparison now starts on Monday (Swiss/European standard)
- **Cache-Rate Delta color** — higher cache rate now correctly shown in green (positive)
- **ViewMode bug** — day/month/year view selector now actually aggregates data
- **Gradient ID conflicts** — unique IDs via `useId()` prevent SVG conflicts in zoom mode

### Changed
- **Forecast colors** — Prognose line is teal (distinct from blue Ist-Kosten), Konfidenzband is transparent teal
- **CostByModelOverTime title** — removed misleading "7-Tage Ø" since chart shows individual model lines
- **Token chart layout** — split into Cache Tokens (top) + I/O Tokens (bottom) with summary tiles
- **CacheROI** — added FormattedValue, InfoButton, Ø Tageskosten metric, 4-column grid
- **Button/Badge transitions** — smooth `transition-all duration-200` on all interactive elements
- **FilterBar model pills** — added hover scale effect

## [2.0.0] - 2026-03-30

### Added
- Complete frontend rebuild with Vite + React + TypeScript + Tailwind CSS v4
- Interactive charts with Recharts (cost over time, model breakdown, tokens, heatmap, etc.)
- Command Palette (Cmd+K) for keyboard navigation
- PDF report export
- CSV data export
- Dark/Light theme toggle
- Framer Motion animations (FadeIn, CountUp)
- Drill-down modal for daily detail view
- Cost forecast with linear regression
- Cache ROI analysis
- Period comparison (week/month)
- Anomaly detection (2σ threshold)
- Heatmap calendar view

## [1.0.0] - Initial Release

### Added
- Node.js HTTP server with static file serving
- JSON data upload/download API
- Basic dashboard functionality
