# Changelog

## [6.2.1] - 2026-04-14

### Added

- **Tiefere Drilldown-Analyse für `Letzte Tage`** — der Detaildialog zeigt jetzt deutlich mehr Tages- und Periodenkontext, darunter modellbezogene Kosten-, Token- und Request-Kennzahlen, Provider-Zusammenfassungen, Token-Verteilungen sowie Benchmarks gegen Vorperiode und Kurzzeitschnitt
- **Direkte Navigation im `Letzte Tage`-Drilldown** — innerhalb des geöffneten Detaildialogs kann jetzt direkt zum vorherigen oder nächsten Tag bzw. zur nächsten Periode gewechselt werden, inklusive Positionsanzeige und Pfeiltasten-Navigation

### Improved

- **Umfassende UI-Qualität im gesamten Dashboard** — Filter, Overlays, Toasts, Heatmaps, Tabellen, Karten und Diagrammflächen wurden nach einem tiefen UI-Review gezielt gehärtet, mit besserer Accessibility, klarerer Zustandskommunikation, stärkerer Mobile-Discoverability und konsistenteren Focus-/Zoom-Flows
- **Detailqualität und Aussagekraft der Dashboard-Ansichten** — Modell- und Provider-Informationen, Chart-Lesbarkeit, Light-/Dark-Parität, Filterstatus-Klarheit und mobile Header-/Legend-Darstellung wurden über mehrere Oberflächen hinweg präzisiert, ohne das bestehende Nutzungsmodell zu verändern
- **Performance auf Start-, Filter- und Großdatensatzpfaden** — der Dashboard-Root remountet bei normalen Filterwechseln nicht mehr unnötig, Bootstrap-Settings werden ohne sofortigen Doppel-Fetch wiederverwendet, zentrale Datenableitungen laufen gebündelter, und große Tabellen-/Sekundärflächen skalieren spürbar besser
- **Ladeverhalten und Chunking des Dashboards** — Settings, Help, Drilldown, Auto-Import und viele schwerere Analyse-Sektionen werden jetzt lazy geladen, wodurch der Initialpfad schlanker bleibt, ohne sichtbare Funktionen, Inhalte oder Animationen zu verändern
- **Lokale Runtime und Report-I/O** — Upload-, Settings- und PDF-/Report-Pfade blockieren den Event Loop weniger stark, weil mehrere synchrone Dateisystemoperationen auf asynchronere Verarbeitung umgestellt wurden
- **Absicherung für die Weiterentwicklung** — neue und erweiterte Frontend-, Hook-, Daten- und E2E-Tests decken die UI-, Drilldown- und Performance-Verbesserungen gezielt ab

### Fixed

- **Semantik und Bedienbarkeit zentraler Filter- und Overlay-Flächen** — Date-Picker, Filter-Chips, Info-Buttons und Toasts verhalten sich jetzt konsistenter für Keyboard-, Screenreader- und Touch-Nutzung
- **Bewegungs- und Diagrammverhalten in Dashboard-Sektionen** — doppelte oder unpassende Reveal-/Chart-Animationen, unvollständige Reduced-Motion-Pfade und mehrere Timing-/Discoverability-Probleme in expandierbaren Analyseflächen wurden bereinigt
- **Skalierungsprobleme in `Letzte Tage` und sekundären Oberflächen** — große Tabellenansichten, Help-/Settings-Öffnung und weitere schwere UI-Pfade reagieren unter größeren Datenmengen robuster als zuvor

## [6.2.0] - 2026-04-14

### Added

- **Zentrales modellbasiertes Farbsystem** — bekannte Modellfamilien nutzen jetzt eine kuratierte, theme-aware Palette mit stabilen Familienfarben, kontrollierten Fallbacks für unbekannte Modelle und gezielten Tests für UI- und Report-Konsistenz

### Improved

- **Modellfarb-Integration im Dashboard und Report** — Filter, Tabellen und PDF-/Report-Ausgabe greifen jetzt auf dieselbe Farbquelle zu, Versionen innerhalb einer Modellfamilie lassen sich besser unterscheiden, und Light-/Dark-Kontexte werden sauberer berücksichtigt
- **PDF-Report-Qualität und Semantik** — Kostenachsen bleiben auch bei kleinen Werten wahrheitsgetreu, Charts erhalten beschreibende Alternativtexte und sichtbare Kurzsummaries, der Report trägt jetzt einen echten Dokumenttitel in den PDF-Metadaten, und der Seitenfluss vermeidet unnötige Leerflächen
- **PDF-Report-Absicherung für die Weiterentwicklung** — neue Unit- und Integrationstests prüfen Chart-Formatierung, Chart-Beschreibungen und zentrale PDF-Strukturmerkmale statt nur den reinen Binary-Exportpfad

## [6.1.9] - 2026-04-14

### Added

- **Klare Recovery-Flows für beschädigte lokale Daten** — die App zeigt korrupte Settings- oder Usage-Dateien jetzt als expliziten Fehlerzustand mit direkten Reset- und Löschaktionen statt als irreführenden Leerzustand
- **Architekturdokumentation für die aktuelle Systemstruktur** — eine neue Architekturübersicht beschreibt die Grenzen zwischen lokalem Server, Frontend, Shared-Domainlogik und Packaging für die weitere Wartung

### Improved

- **Barrierefreiheit und Informationsqualität in zentralen Dashboard-Flächen** — Top-Level-Filter haben jetzt stabile zugängliche Namen, Info-Buttons sind semantisch sauber von Headings getrennt, und das Help-Panel zeigt vollständig benannte und fachlich besser gruppierte Inhalte
- **Lokalisierung und Terminologiekonsistenz in Analyse- und Tooltip-Flächen** — gemischte deutsche und englische UI-Begriffe wurden bereinigt, Tooltip-Texte lokalisiert und die verbleibenden Accessibility-/i18n-Regressionen durch zusätzliche Tests abgesichert
- **Robustere lokale API-Grenzen und Auto-Import-Sicherheit** — mutierende Endpunkte akzeptieren nur noch erlaubte Request-Formen, Cross-Site-Zugriffe werden abgewehrt, Auto-Import verwendet keine mutierende `GET`-Route mehr, und non-loopback Binding erfordert jetzt ein explizites Remote-Opt-in
- **Sicherere lokale Persistenz und Exportpfade** — Daten- und Settings-Dateien werden restriktiver geschrieben, CSV-Exporte escapen Sonderzeichen korrekt, und serverseitige Fatal-Load-Fehler werden bis in die UI transparent durchgereicht
- **Nachhaltigere Architektur für Dashboard, Report und Server-Runtime** — gemeinsame Dashboard-/Report-Domainlogik, ein entschlackter Dashboard-Controller und erste Server-Module reduzieren Drift, verbessern Testbarkeit und schaffen klarere Verantwortungsgrenzen

### Fixed

- **Windows-Kompatibilität beim Auto-Import und Child-Process-Start** — die Runner-Ausführung funktioniert auf Windows jetzt zuverlässig ohne die zuvor fehleranfällige Prozessinitialisierung

## [6.1.8]

### Added

- **Claude-Code-Retention-Hinweis im README** — die Projektdokumentation erklärt jetzt kurz die nötige `cleanupPeriodDays`-Einstellung, damit ältere Claude-Code-Kostenhistorie für `toktrack` und `TTDash` nicht vorzeitig verschwindet

### Improved

- **Signierte Releases über 1Password und SSH** — der Release-Workflow lädt die Signing-Identität jetzt über den 1Password-Service-Account, erstellt signierte Release-Commits und signierte Tags, und versieht Release-Commits zusätzlich mit `on-behalf-of: @roastcodes <github@roast.codes>`
- **Release-Dokumentation für Signing-Setup** — die Maintainer-Doku beschreibt jetzt den 1Password-basierten SSH-Signing-Flow, die zusätzlichen Actions-Secrets und die Voraussetzungen für GitHub-`Verified`-Tags und den Organisations-Trailer

## [6.1.7] - 2026-04-13

### Added

- **Projektlinks direkt in der App** — die Versionsanzeige im Header öffnet jetzt die exakt laufende npm-Version, und das Help-/Info-Popup bietet direkte Links zu npm, GitHub und den GitHub Issues
- **Reproduzierbare README-Screenshots** — ein eigener Capture-Flow erzeugt datenreiche Dashboard-, Analyse- und Settings-Screenshots direkt aus geladenen Beispieldaten für die Projektdokumentation
- **Gezielte React-Query-Regressions-Tests** — neue Frontend-Tests decken optimistic Updates und Rollback-Verhalten in den App-Settings-Hooks explizit ab

### Improved

- **Release-Workflow auf aktuelle GitHub-App-Action aktualisiert** — der Publish-Pfad nutzt jetzt `actions/create-github-app-token@v3.1.1` und die nicht mehr empfohlene `app-id`-Konfiguration wurde auf `client-id` umgestellt; die Maintainer-Dokumentation wurde entsprechend angepasst
- **Dependency-Stand im Datenlayer** — `@tanstack/react-query` wurde auf `5.99.0` aktualisiert, ohne das Query-Verhalten im Dashboard oder in den Settings zu ändern
- **README als öffentliche Projektübersicht** — Badges, CLI-Referenz, Entwicklungsdokumentation und visuelle Projektpräsentation wurden auf einen kompakteren, release-tauglichen Stand gebracht

### Fixed

- **Flakey Background-Registry-Integrationstests** — die Tests für parallele `--background`-Starts und das Aufräumen veralteter Registry-Einträge warten jetzt auf stabile Zustände statt auf transiente Dateisnapshots, wodurch `npm run verify` wieder zuverlässig grün läuft

## [6.1.6] - 2026-04-13

### Added

- **Striktere Code-Quality-Gates** — ESLint, typed TypeScript-ESLint-Regeln und Prettier sind jetzt vollständig im Repo eingerichtet und als verbindliche Prüfungen in den lokalen Verify-Pfad sowie die GitHub-Workflows integriert
- **Gezielte Infrastruktur-Tests** — neue Unit-Tests decken die Server-Helfer für Runner-Auflösung und Portsuche sowie die gemeinsame Modellnormalisierung und die Limits-Badge-Logik explizit ab

### Improved

- **TypeScript-Hardening** — die Compiler-Konfiguration ist jetzt deutlich strenger und nutzt zusätzliche Best-Practice-Flags wie `noImplicitReturns`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` und weitere Konsistenz-Gates
- **Konsistente Modellnormalisierung** — UI und PDF-/Report-Pfad verwenden jetzt dieselbe datengetriebene Normalisierung und Provider-Zuordnung für aktuelle `toktrack`-Modellfamilien wie Claude, GPT, Gemini, Codex, OpenAI-`o` und OpenCode
- **Maintainer- und Release-Tooling** — README, Contribution-, Release- und Agent-Dokumentation wurden an die neuen Lint-, Format- und Verify-Workflows angepasst; GitHub Actions nutzt jetzt zusätzlich SHA-gepinnte Actions, minimale App-Token-Rechte und ein dediziertes Release-Environment
- **Konfigurationsklarheit** — die Vitest-Konfiguration dokumentiert jetzt explizit, warum die asynchrone Vite-Config vor dem Mergen manuell aufgelöst wird

### Fixed

- **Unbenutzter Code und Compiler-Warnpfade** — ungenutzte Imports, Helpers und Parameter wurden entfernt oder bereinigt, sodass die neuen Compiler- und Lint-Gates auf dem gesamten Repo sauber greifen
- **Server-Runner und Portsuche** — die Windows-/Cross-Platform-Runner-Auflösung ist weniger dupliziert, und die Portsuche für den lokalen Server läuft jetzt iterativ statt rekursiv
- **Kleine UI-Wartbarkeitsprobleme** — redundante Drill-Down-Modal-Logik und schwer lesbare Badge-Bedingungen in der Limits-Sektion wurden vereinfacht, ohne das Verhalten zu ändern

## [6.1.5] - 2026-04-12

### Added

- **Report insight callouts** — the Typst PDF report now highlights key findings such as sparse data coverage, provider concentration, cache contribution, and the strongest rolling 7-day cost window
- **Report chart test coverage** — dedicated unit tests now cover SVG chart formatting, localized axis rendering, and long-label truncation for the Typst report assets

### Improved

- **GitHub Actions Node 24 readiness** — the release workflow now pins `actions/create-github-app-token` to `v2.1.4`, aligning the release path with the current Node 24-compatible action runtime guidance
- **Typst report structure** — the PDF layout now uses a clearer executive-summary flow with localized headings, prepared report text blocks, and more robust section rendering for filtered report scenarios
- **Report localization and semantics** — peak-period labeling, interpretation text, filter summaries, and report-specific strings are now more precise and consistently localized in both German and English
- **Report metric consistency** — cache insights now appear whenever token-based cache activity exists, percentage strings are locale-aware across cards, labels, and insights, and compact token values are formatted consistently in charts, summaries, and tables
- **Aggregated report averages** — monthly and yearly PDF summaries now show average cost per selected period instead of reusing the daily average under period labels
- **Report smoke verification** — the report smoke runner now works from checked-in fixture data, covers multiple language/view combinations, and validates generated PDF content more thoroughly
- **Build and test config loading** — the Vite version injection path now reads `package.json` asynchronously, and the Vitest config resolves the async Vite config cleanly before merging test settings

### Fixed

- **Report temp-file cleanup** — server-side PDF generation now cleans up Typst working directories internally even when compilation fails
- **PDF response lifecycle** — the report API now returns the compiled PDF from memory instead of exposing temporary file paths, avoiding leaked temp directories and simplifying cleanup
- **Chart formatting consistency** — token-axis labels and font fallbacks no longer depend on hardcoded locale/font assumptions that caused inconsistent PDF output across environments
- **Report locale details** — the token-trend legend, German PDF header, German `n/v` fallback text, and top model/provider percentage labels now render consistently with the active report language
- **Report insight accuracy** — sparse-data coverage warnings no longer trigger just because the user switched aggregation, and cache contribution insights are no longer hidden when request counters are missing
- **Limits section code hygiene** — unused chart helpers, dead tooltip components, and stale icon/import leftovers were removed from the provider limits view to keep the implementation easier to maintain
- **CI verification error output** — GitHub workflow verification now truncates raw API error bodies to a short preview instead of echoing the full response into failure output

## [6.1.4] - 2026-04-11

### Added

- **GitHub-driven release flow** — releases can now be started manually from GitHub Actions with a target version input, instead of relying on a locally created tag on `main`
- **CI release gate** — the release workflow now verifies that the latest `CI` run for the current `main` commit completed successfully before any version bump, tag, or npm publish step begins
- **Release app verification** — a dedicated GitHub API helper now validates the `CI` precondition directly from the workflow, so release gating stays tied to the exact `main` SHA

### Improved

- **Single human-managed version source** — the frontend app version is now injected from `package.json` at build time instead of being maintained as a second manual version constant
- **Protected-branch compatibility** — the release workflow now uses the dedicated `ttdash-release` GitHub App token for checkout, push, tag creation, and GitHub release creation, so the release path works cleanly with branch rules and ruleset bypasses
- **Release recovery behavior** — rerunning a failed release with the same version now resumes cleanly when the version bump commit, tag, or npm publication already exists
- **Release documentation** — the maintainer guide now documents the GitHub App setup, ruleset expectations, workflow-dispatch release path, and the new post-publish verification model

## [6.1.0] - 2026-04-11

### Added

- **Background CLI mode** — `--background` starts the local server as a detached background process, and `ttdash stop` lists running instances so the selected one can be stopped directly
- **Settings backups and layout preferences** — the settings dialog now supports backup import/export, conservative usage-data restore, default dashboard filters, section visibility, and section ordering
- **Packaged CLI verification** — `npm run verify:package` now builds the real tarball and verifies that the packaged `ttdash` CLI can install, print help, and start outside the repo checkout
- **Scoped package release prep** — the package is now prepared for the first public scoped release as `@roastcodes/ttdash`

### Improved

- **Dashboard settings model** — provider limits, persisted filters, section visibility, and section order now behave as first-class stored settings across fresh starts and backup restore flows
- **CLI and installer UX** — terminal output, help text, and installer guidance now use English-first release-facing messaging
- **Metrics and report correctness** — aggregated dashboard metrics, provider day counting, filter-preset behavior, and PDF language handling were corrected and aligned with the current view state
- **Release workflow** — tagged releases now verify the packed artifact, publish the scoped package, and smoke-check both `npx` and `bunx` after publish
- **Repository documentation** — README, contribution, release, security, and conduct docs were rewritten for a public, maintainer-led npm project

### Fixed

- **Race-safe background registry** — parallel `--background` starts briefly lock the local instance registry so no running server gets dropped from the tracked list
- **Conservative data import** — backup imports add missing days, skip identical days, and keep conflicting local days instead of silently overwriting them
- **Playwright release validation** — the E2E configuration now supports an override port so local release verification does not fail when the default smoke-test port is already occupied

## [6.0.11] - 2026-04-10

### Fixed

- **Idempotent Bun installer** — `install.sh` and `install.bat` now clean existing `ttdash` entries from Bun’s global manifest before `bun add -g file:...` and remove the broken global `bun.lock` when needed, so repeated upgrades do not create duplicate `package.json` keys

## [6.0.10] - 2026-04-09

### Added

- **GitHub release workflow** — a dedicated `release.yml` now creates GitHub releases automatically on `v*` tags, verifies tests and build first, and only accepts tags on `main`

### Improved

- **README project context** — the documentation now points explicitly to `toktrack` as the primary data source and credits `mag123c`

## [6.0.9] - 2026-04-09

### Added

- **Automated test pyramid** — Vitest now covers data normalization, calculations, hook behavior, and the local server path; Playwright verifies the upload-to-dashboard smoke flow with real browser reports
- **CI test pipeline** — GitHub Actions now runs build, coverage, Playwright smoke tests, and report artifacts automatically on pushes and pull requests

### Improved

- **Public repo readiness** — package metadata, license, security/contribution docs, and publish surface were cleaned up for a public repository
- **Test isolation** — the Playwright web server uses its own local app environment and does not overwrite normal user data
- **Runtime hardening** — the local server now binds to `127.0.0.1` by default, returns stricter security headers, and avoids unnecessary external runtime requests

### Fixed

- **Bun/npm consistency** — lockfiles and published runtime contents now stay aligned so builds and installs remain reproducible

## [6.0.8] - 2026-04-08

### Added

- **CLI flags for `ttdash`** — `--port` / `-p`, `--help` / `-h`, `--no-open` / `-no`, and `--auto-load` / `-al` are now supported directly by the global CLI command
- **Persistent load metadata** — app settings now store when data was last loaded and from which path (`file`, `auto-import`, `cli-auto-load`)
- **Visible load hints in the UI** — the header and limits dialog now show the last load time, and `-al` also adds a dedicated `Auto-load on start` badge

### Improved

- **Shared auto-import path** — UI auto-import and CLI auto-load now use the same server logic so runtime behavior, persistence, and error handling stay consistent

## [6.0.7] - 2026-04-08

### Added

- **Cache-Hit-Rate in der Request-Analyse** — neue kombinierte Visualisierung mit Zeitverlauf links und Modell-Snapshot rechts, vollständig filterkompatibel und mit denselben Aufbauanimationen wie die übrigen Diagramme

### Improved

- **Modellabdeckung im Cache-Hit-Rate-Verlauf** — alle aktiven Modelle, inklusive `GPT-5` und `GPT-5.4`, erscheinen jetzt zuverlässig in der Zeitreihen-Legende und im Diagramm
- **Snapshot-Animation & Tooltip-Klarheit** — horizontale Balken bauen sich sauber von links nach rechts auf; Tooltips im Zeitverlauf blenden irrelevante `0.0%`-Serien aus und zeigen die aktiven Modelle lesbarer an

## [6.0.6] - 2026-04-08

### Added

- **Plattformgerechte Persistenz** — Nutzungsdaten und App-Einstellungen liegen jetzt in OS-konformen User-Verzeichnissen statt im Projekt- bzw. Installationsordner; bestehende `data.json` wird beim Start automatisch migriert

### Improved

- **Stabile Settings über Ports hinweg** — Sprache, Theme und Provider-Limits werden serverseitig in lokalen App-Settings gespeichert und bleiben dadurch auch bei automatischem Portwechsel erhalten
- **Robustere Dateischreibvorgänge** — `data.json` und `settings.json` werden atomar geschrieben, damit lokale Persistenz bei Abbruch oder Neustart nicht inkonsistent wird

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
