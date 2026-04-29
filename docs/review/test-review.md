# Test Review

## Kurzfazit

Die Testbasis ist breit, aber das Testsystem ist noch nicht auf maximale lokale und CI-Performance
ausgelegt. Der groesste Engpass ist nicht der Build, sondern die Kombination aus serieller Pipeline,
nicht isolierbarer Playwright-Ausfuehrung und hohem `frontend/jsdom`-Overhead.

Die wichtigsten Ziele fuer die naechste Umbauphase:

- E2E-Tests muessen worker-isoliert laufen koennen, ohne gemeinsamen Server- oder Datenzustand.
- Die CI-Pipeline soll aus unabhaengigen Jobs bestehen statt aus einem langen seriellen Job.
- Command-Palette- und Dashboard-Composition-Tests sollen mehr Logik in Vitest beweisen und weniger
  Browserzeit verbrauchen.
- Coverage soll risikogewichtet verbessert werden: zentrale Runtime- und Composition-Module zuerst,
  nicht blind globale Thresholds erhoehen.

## Baseline und Bottlenecks

Gemessene lokale Baseline am 2026-04-28:

| Gate                        |        Zeit | Bewertung                                            |
| --------------------------- | ----------: | ---------------------------------------------------- |
| `npm run check`             |   ca. `25s` | Statische Checks laufen komplett seriell.            |
| `npm run test:architecture` |  ca. `4.5s` | Stabil, aber aktuell explizit ohne File-Parallelism. |
| `npm run test:unit`         |   ca. `28s` | Wird vom `frontend`-Projekt dominiert.               |
| `npm run test:timings`      |   ca. `30s` | Coverage aktiv, gute Timing-Signale.                 |
| `npm run build:app`         | ca. `0.75s` | Kein relevanter Bottleneck.                          |
| `npm run verify:package`    |  ca. `7.4s` | Wertvoller Smoke, aber seriell im Full-Gate.         |
| `npm run test:e2e:ci`       |   ca. `47s` | Groesster Einzelblock, absichtlich single-worker.    |

Vitest-Projekte isoliert:

| Projekt                                |        Zeit | Hauptkosten                                                      |
| -------------------------------------- | ----------: | ---------------------------------------------------------------- |
| `frontend`                             | ca. `18.4s` | `jsdom` environment, imports, React setup, viele kleine Dateien. |
| `unit`                                 |  ca. `4.4s` | Einzelne echte Prozess-/Timer-Tests dominieren.                  |
| `integration + integration-background` |  ca. `4.6s` | Subprozesse und lokale Server, aber insgesamt gesund.            |
| `architecture`                         |  ca. `4.5s` | Source-Graph-/AST-Arbeit, aktuell seriell konfiguriert.          |

Playwright-Hotspots aus dem JUnit-Report:

| Test                                                               |        Zeit |
| ------------------------------------------------------------------ | ----------: |
| `command-palette.spec.ts` - dashboard section navigation           | ca. `14.5s` |
| `command-palette.spec.ts` - analysis section navigation            |  ca. `5.5s` |
| `command-palette.spec.ts` - scroll and filter navigation           |  ca. `5.1s` |
| `dashboard-settings-backups.spec.ts` - settings and backup imports |  ca. `4.4s` |

Ein Testlauf mit `npx playwright test --workers=2` war schneller (`ca. 35s`), aber nicht robust:
ein Settings-/Backup-Test erwartete `6` Usage-Tage und bekam `8`. Das ist echte State-Leakage, kein
Timing-Artefakt.

## Was bereits gut ist

- Die Testpyramide ist grundsaetzlich vorhanden: Unit, Frontend/jsdom, Integration, Architektur und
  E2E sind getrennt.
- Integration-Tests nutzen echte Server/Subprozesse nur dort, wo Prozess- oder CLI-Verhalten relevant
  ist.
- `test:timings` liefert verwertbare Slow-Suite- und Slow-Test-Auswertungen.
- Playwright-E2E deckt wichtige echte Journeys ab: Load/Upload, Forecast/Filter, Settings/Backups,
  Reporting und Command Palette.
- Coverage umfasst Produkt-Runtime wie `server/`, `shared/`, `src/` und `usage-normalizer.js`, nicht
  nur Frontend-Ausschnitte.

## Findings

### H-01 - Playwright ist nicht worker-isoliert

**Referenzen:** `playwright.config.ts`, `scripts/start-test-server.js`, `tests/e2e/helpers.ts`

Der Playwright-Server nutzt eine gemeinsame Runtime unter `.tmp-playwright/app`. Beim Start wird dieser
Ordner geloescht und neu aufgebaut. Die Testhelfer lesen ausserdem eine globale Auth-Session und
mutieren globalen App-Zustand ueber `/api/usage` und `/api/settings`.

Das blockiert sichere Parallelisierung:

- Mehrere Worker koennen denselben Datenordner loeschen oder ueberschreiben.
- `resetAppState()` loescht globale Usage/Settings waehrend andere Tests dieselbe App verwenden.
- Relative `page.request`-Aufrufe haengen am gemeinsamen `baseURL`.
- E2E-Tests, die Daten importieren oder loeschen, beeinflussen andere E2E-Tests.

**Impact:** `workers > 1` ist schneller, aber nicht verlaesslich. Der aktuelle CI-Befehl
`test:e2e:ci` erzwingt deshalb `--workers=1`, wodurch E2E zum groessten Full-Gate-Bottleneck wird.

**Improvement:** E2E muss auf worker-scoped App-Instanzen umgestellt werden:

- Jeder Playwright-Worker bekommt eigenen Port, Runtime-Root, Cache-, Config- und Data-Dir.
- Jeder Worker startet seinen eigenen Testserver und liest seine eigene Auth-Session.
- Die Playwright-Fixture ueberschreibt `baseURL` worker-spezifisch.
- `resetAppState()` darf nur noch den Server des aktuellen Workers betreffen.
- Der globale `webServer` in `playwright.config.ts` wird fuer die parallele Suite durch eine
  worker-scoped Server-Fixture ersetzt oder er startet mehrere isolierte Server vorab.

Akzeptanzkriterium fuer die spaetere Umsetzung: `npx playwright test --workers=2` und danach
`--workers=4` laufen mehrfach gruen, ohne Usage-Day-Mismatch, `socket hang up` oder Auth-Session-Race.

### H-02 - CI ist ein monolithischer serieller Full-Gate

**Referenzen:** `.github/workflows/ci.yml`, `package.json`

Der Haupt-CI-Job fuehrt Format, Lint, Docstring-Lint, Dependency-Cruiser, TypeScript, Architecture,
Vitest-Coverage, Build, Package-Smoke, Playwright-Install und E2E nacheinander aus.

Das ist robust, aber nicht maximal performant:

- Unabhaengige Gates warten aufeinander.
- Ein langer Job nutzt GitHub-Runner-Parallelitaet nicht aus.
- Vitest-Projekte werden nicht als CI-Matrix genutzt.
- Package-Smoke und E2E laufen nach allen anderen Gates, obwohl sie nur den gebauten App-Artifact
  benoetigen.

**Improvement:** CI als DAG aufbauen:

- `static`: Format, Lint, Dependency-Cruiser, TypeScript.
- `vitest-unit`, `vitest-frontend`, `vitest-integration`, `vitest-architecture`: getrennte Jobs.
- `build`: erzeugt `dist/` als Artifact.
- `package-smoke`: nutzt `dist/` Artifact und prueft Pack/Install/CLI/Server.
- `e2e`: nutzt `dist/` Artifact und worker-isolierte Playwright-Server.

Akzeptanzkriterium: Full-CI-Walltime sinkt deutlich, ohne Testumfang zu reduzieren. Jeder Job laedt
seine eigenen Reports hoch und blockiert nicht durch gemeinsame Output-Pfade.

**Umsetzungsstand Phase 5:** `ci.yml` ist jetzt als DAG geschnitten: `static`, Vitest-Projektmatrix,
dedizierter `coverage`-Job und `build` laufen unabhaengig; `package-smoke` und `e2e` verwenden das
einmal erzeugte `production-dist`-Artifact parallel.

### H-03 - Command-Palette-E2E mischt zu viele Testarten

**Referenzen:** `tests/e2e/command-palette.spec.ts`,
`src/components/features/command-palette/CommandPalette.tsx`

Die Command-Palette-Suite testet gleichzeitig:

- Vollstaendige Command-Liste.
- Search aliases und Scoring.
- Action command execution.
- Filter- und View-State.
- Dynamische Provider-/Model-Commands.
- Scroll-Ziele fuer fast alle Dashboard-Sections.
- Theme, Sprache, Help und Quick-Select.

Das ist ein klassischer Browser-Monolith: sehr wertvoll als Smoke, aber zu teuer und zu breit als
primaere Contract-Abdeckung. Besonders Scroll-Navigation durch viele Sections verursacht hohe
Browserzeit.

**Impact:** Ein einzelnes Feature dominiert den E2E-Gate, obwohl viele Assertions keine echte
Browser-Integration brauchen.

**Improvement:** Command-Palette in testbare Logik und E2E-Smoke trennen:

- Pure Command-Erzeugung, Search-Scoring, Quick-Select-Mapping und Section-Command-Filterung in eine
  testbare Helper-/Builder-Schicht extrahieren.
- Vitest-Tests fuer alle Command-IDs, Gruppen, Aliases, Visibility-Regeln, Provider/Model-Dynamik und
  Section-Order.
- E2E nur fuer wenige representative Flows behalten:
  - Palette oeffnet per Keyboard.
  - Ein Action-Command triggert Download oder Dialog.
  - Ein Filter-Command veraendert sichtbaren UI-State.
  - Ein Section-Command scrollt zu genau einer representative Section.

Akzeptanzkriterium: Command-Palette-E2E-Zeit sinkt signifikant, waehrend die Command-Contract-Coverage
in Vitest steigt.

### H-04 - Report- und Coverage-Ausgaben sind nicht matrix-sicher

**Referenzen:** `vitest.config.ts`, `playwright.config.ts`, `package.json`

Vitest schreibt standardmaessig nach `test-results/vitest.junit.xml`. Playwright schreibt nach
`test-results/playwright.junit.xml` und `playwright-report/`. Das ist fuer einen seriellen lokalen Lauf
okay, kollidiert aber bei parallelen CI-Jobs, Shards oder mehreren Vitest-Prozessen.

**Impact:** Sobald Vitest-Projekte oder Playwright-Shards parallel laufen, koennen Reports
ueberschrieben oder unvollstaendig hochgeladen werden.

**Improvement:** Output-Pfade pro Projekt/Shard/Job trennen:

- `test-results/vitest-unit.junit.xml`
- `test-results/vitest-frontend-1.junit.xml`
- `test-results/vitest-integration.junit.xml`
- `test-results/playwright-e2e-1.junit.xml`
- Coverage je Shard in eigene Verzeichnisse schreiben und danach bewusst mergen oder dediziert in
  einem Coverage-Job erzeugen.

### M-01 - `frontend/jsdom` ist der Vitest-Hauptkostentreiber

**Referenzen:** `vitest.config.ts`, `vitest.setup.frontend.ts`, `tests/frontend`

Das `frontend`-Projekt hat `75` Testdateien und braucht isoliert ca. `18.4s`. Die aggregierten
Vitest-Metriken zeigen hohe Kosten fuer `environment`, `import` und `setup`. Ein Lauf mit mehr
Workern (`--maxWorkers=80%`) war sogar etwas langsamer als die aktuelle `50%`-Einstellung.

**Impact:** Einfach mehr Worker zu geben ist aktuell keine Loesung. Die Kosten liegen stark in
Environment-Erzeugung und schweren Importbaeumen.

**Improvement:**

- Aktuelle `maxWorkers: '50%'` beibehalten, bis Setup-/Import-Kosten reduziert sind.
- Frontend-Tests nach schweren Importbaeumen pruefen und dort konsolidieren, wo viele kleine Dateien
  dieselbe Dashboard-/Chart-Struktur laden.
- Gemeinsame Recharts-, IntersectionObserver-, ResizeObserver- und Motion-Mocks zentralisieren.
- Kleine pure Daten-/Formatierungsfaelle aus jsdom-Tests in Node-Unit-Tests verschieben.
- Optional nach dem Umbau `happy-dom` nur dann evaluieren, wenn React/Radix/cmdk-Tests kompatibel
  bleiben. Nicht blind wechseln.

### M-02 - Node-Projekte laden unnoetiges React-Test-Setup

**Referenzen:** `vitest.setup.ts`, `vitest.setup.frontend.ts`, `vitest.config.ts`

`vitest.setup.ts` importiert `@testing-library/jest-dom/vitest` und `@testing-library/react`
`cleanup()`. Diese Datei wird auch fuer Node-only Projekte wie `unit`, `integration`,
`integration-background` und `architecture` geladen.

**Impact:** Node-Tests zahlen React-/Testing-Library-Importkosten, obwohl sie kein DOM brauchen.

**Improvement:** Setup splitten:

- `vitest.setup.node.ts`: nur Timer/MOCK cleanup, keine Testing Library.
- `vitest.setup.frontend.ts`: `jest-dom`, `cleanup`, i18n, browser API shims.
- Architecture entweder ohne Setup oder mit minimalem Node-Setup.

Akzeptanzkriterium: Node-Projekt-Setupzeit sinkt, ohne Cleanup-Sicherheit in Frontend-Tests zu
verlieren.

### M-03 - Coverage ist global gruen, aber risikogewichtet schwach

Die globale Coverage lag zuletzt bei ca. `75%` Statements, `64%` Branches, `76%` Functions und
`76%` Lines. Das reicht fuer den Gate, verdeckt aber zentrale Luecken.

Wichtige Low-Coverage-Module:

| Modul                                                                             |     Lines |  Branches | Risiko                                              |
| --------------------------------------------------------------------------------- | --------: | --------: | --------------------------------------------------- |
| `server/app-runtime.js`                                                           |      `0%` |      `0%` | Runtime-Wiring, CLI/Server-Komposition.             |
| `DashboardSections.tsx`                                                           | ca. `22%` |      `0%` | Haupt-Komposition der Dashboard-Sections.           |
| `server/background-runtime.js`                                                    | ca. `40%` | ca. `41%` | Hintergrundinstanzen, Registry, Prozess-Handling.   |
| `server/data-runtime.js`                                                          | ca. `50%` | ca. `29%` | Daten-/Settings-Persistenz, Locking, Import/Export. |
| `server/http-router.js`                                                           | ca. `54%` | ca. `39%` | API-Routing, Mutation Guards, Fehlerfaelle.         |
| `CommandPalette.tsx`                                                              | ca. `47%` | ca. `35%` | Keyboard/Search/Command-Vertraege.                  |
| `CostByWeekday.tsx`, `ModelMix.tsx`, `TokensOverTime.tsx`, `PeriodComparison.tsx` |      `0%` |      `0%` | Lazy dashboard sections ohne Vitest-Signal.         |

**Improvement:** Coverage risikogewichtet erhoehen:

- `server/app-runtime.js`: Wiring-Test mit gemockten Factory-Abhaengigkeiten, der sicherstellt, dass
  Runtimes korrekt komponiert werden.
- `server/data-runtime.js`: Pfadprioritaeten, Settings-/Usage-Import, Lock-Timeouts, stale locks,
  corrupted state und Recovery.
- `server/http-router.js`: Route-Matrix fuer Methoden, Auth, Mutation Guards, Payload-Fehler,
  statische Dateien, SPA-Fallback und API-Prefix.
- `DashboardSections.tsx`: Section visibility/order, request section availability, lazy fallback,
  forecast dialog, preload scheduling und ErrorBoundary.
- `CommandPalette.tsx`: Command Builder/Scoring/Visibility als pure Unit/Frontend-Tests.
- Lazy charts: je ein kleiner render-/empty-state-/branch Test pro `0%` Modul.

Nicht empfohlen: globale Thresholds sofort stark erhoehen. Zuerst gezielte Coverage fuer die oben
genannten Module schaffen, dann file-/directory-spezifische Mindestwerte einfuehren.

### M-04 - Einige Unit-Tests nutzen echte Zeit oder echte Prozesse

**Referenzen:** `tests/unit/server-helpers-runner-process.test.ts`,
`tests/unit/server-helpers-file-locks.test.ts`, `tests/integration/server-auto-import.test.ts`

Einzelne Tests sind bewusst prozessnah. Das ist richtig, weil genau Prozess-/CLI-Verhalten getestet
wird. Einige Faelle nutzen aber echte Sleeps, echte Child-Prozesse oder Timeout-Fenster.

**Impact:** Diese Tests sind wertvoll, aber koennen lokal variieren und setzen eine Untergrenze fuer
Suite-Zeit.

**Improvement:**

- Prozessnahe Tests behalten, aber streng auf wenige Smoke-Faelle begrenzen.
- Timeout-/Fallback-Logik dort, wo moeglich, ueber injizierte Clock/Sleep/Spawn-Fakes testen.
- Echte Subprozess-Tests als Integration einstufen, wenn sie Shell/PATH/Cross-Process-Verhalten
  pruefen.
- Slow-Test-Budget dokumentieren: kein neuer Unit-Test sollte ohne Begruendung > `300ms` brauchen.

### M-05 - Statische Checks haben Doppelarbeit

**Referenzen:** `package.json`, `eslint.config.mjs`

`npm run check` fuehrt `eslint .` und danach `lint:docstrings` als zweiten ESLint-Lauf aus. Der zweite
Lauf ist enger, aber Regeln und Dateien ueberschneiden sich deutlich.

**Impact:** Static-Gate-Zeit steigt, obwohl die meisten Inputs bereits im ersten ESLint-Lauf gesehen
werden.

**Improvement:**

- Pruefen, ob `lint:docstrings` vollstaendig in `eslint .` enthalten ist. Falls ja, `lint:docstrings`
  als separaten Gate entfernen.
- Falls getrennt noetig, ESLint Cache aktivieren und unterschiedliche Cache-Keys fuer beide Laeufe
  verwenden.
- Prettier Cache und TypeScript incremental fuer lokale Gates nutzen.

**Umsetzungsstand Phase 5:** `test:static` nutzt einen einzigen `lint`-Lauf fuer den regulaeren Gate,
waehrend `lint:docstrings` als gezielter Diagnosebefehl erhalten bleibt. Prettier, ESLint und
TypeScript schreiben lokale Cache-Dateien unter `.cache/`.

### M-06 - Package-Smoke ist wichtig, aber gehoert in einen eigenen CI-Job

**Referenzen:** `scripts/verify-package.js`, `package.json`

`verify:package` packt das Projekt, installiert den Tarball in ein Temp-Projekt, prueft CLI-Help,
`npm exec` und Server-Startup. Das ist ein guter Release-Smoke, aber er muss nicht denselben seriellen
Job wie Unit, Integration und E2E blockieren.

**Impact:** Im lokalen Full-Gate addiert er ca. `7s`. In CI kann er parallel zu E2E laufen, sobald
`dist/` als Artifact gebaut wurde.

**Improvement:**

- `build` erzeugt `dist/` einmal.
- `package-smoke` und `e2e` nutzen dieses Artifact parallel.
- Package-Smoke bleibt im Full-Gate, aber nicht als serieller Nachklapp nach allen Tests.

**Umsetzungsstand Phase 5:** Der CI-`build`-Job laedt `production-dist` hoch; `package-smoke` und
`e2e` laden dieses Artifact herunter und laufen nur noch mit `needs: build`.

### M-07 - Timing-Regressions sind sichtbar, aber nicht budgetiert

`test:timings` listet Slow-Suites und Slow-Tests, erzwingt aber kein Budget und vergleicht nicht gegen
eine Baseline.

**Improvement:**

- Im Review/CI einen Timing-Budget-Abschnitt pflegen.
- Optional spaeter Script erweitern:
  - Warnung fuer neue Tests > `500ms`.
  - Warnung fuer Suites > `2s`.
  - Separates Ranking nach Projekt.
  - Trendvergleich gegen eine gespeicherte Baseline in CI-Artefakten.

**Umsetzungsstand Phase 6:** `scripts/report-test-timings.js` wertet JUnit-Reports jetzt mit
Warn- und Hard-Budgets aus. Lokal bleibt `test:timings` diagnostisch; `test:timings:budget` nutzt
einen separaten JUnit-Output und scheitert bei Suiten > `20s` oder Tests > `12s`. Die CI-Matrix
wendet denselben Hard-Budget-Check auf die bereits erzeugten Vitest-Projektreports an, ohne eine
zusaetzliche Vitest-Runde zu starten.

### N-01 - macOS-Sandbox kann Playwright-False-Negatives erzeugen

Ein sandboxed Playwright-Lauf scheiterte mit Chromium
`MachPortRendezvousServer ... Permission denied`. Derselbe Lauf ausserhalb der Sandbox bestand.

**Impact:** Agent-/Sandbox-Umgebungen koennen Browser-Failures erzeugen, die nicht repo-bezogen sind.

**Improvement:** In Review- und Agent-Doku festhalten: Playwright auf macOS ggf. ausserhalb strenger
Sandbox ausfuehren. Das ist kein Produktfix.

## Zielarchitektur fuer das Testsystem

### Lokale Befehle

Empfohlene Zielstruktur:

- `npm run test:static`: Format, Lint, Dependency-Cruiser, TypeScript.
- `npm run test:vitest`: alle Vitest-Projekte ohne Coverage.
- `npm run test:vitest:coverage`: Coverage-Gate mit getrennten Outputs.
- `npm run test:e2e:parallel`: Playwright mit worker-isolierter App.
- `npm run verify:ci`: CI-kompatibler Full-Gate ohne doppelte Builds.
- `npm run verify:full`: lokaler kompletter Gate, der dieselbe Logik wie CI nutzt.

### E2E-Isolation

Die spaetere Playwright-Fixture soll worker-scoped sein:

- Worker startet eigenen Serverprozess.
- Worker bekommt eigenen Runtime-Root: `.tmp-playwright/workers/<workerIndex>/app`.
- Worker bekommt eigenen Port, z. B. ueber freien Port oder deterministisch aus Basisport und Worker.
- Worker wartet auf eigene `session-auth.json`.
- `baseURL`, `bootstrapUrl` und Auth-Header kommen aus der Worker-Fixture.
- Tests importieren `test` und `expect` aus einem lokalen E2E-Fixture-Modul statt direkt aus
  `@playwright/test`.

Damit koennen Tests parallel laufen, ohne Daten zu teilen.

### CI-DAG

Ziel-CI:

- `static`
- `vitest-unit`
- `vitest-frontend` optional geshardet
- `vitest-integration`
- `vitest-architecture`
- `build`
- `package-smoke` mit Build-Artifact
- `e2e` mit Build-Artifact und worker-isolierten Servern
- `reports` oder Artifact Upload pro Job

Coverage-Strategie:

- Einfachste robuste Variante: ein dedizierter `coverage`-Job, der alle Vitest-Projekte mit Coverage
  seriell oder kontrolliert parallel ausfuehrt.
- Schnellere Variante: Coverage je Vitest-Shard erzeugen und danach mergen. Diese Variante erst
  waehlen, wenn Report-Merging sauber automatisiert ist.

## Priorisierte Roadmap

1. **Dokumentation aktualisieren.** Diese Review-Datei als aktuelle Master-Analyse nutzen.
2. **E2E worker-isolieren.** Ohne das bleibt jede Playwright-Parallelisierung instabil.
3. **Command-Palette-Teststrategie umbauen.** Contract-Logik in Vitest, wenige Browser-Smokes.
4. **Vitest-Setup splitten.** Node-Projekte von React Testing Library und `jest-dom` entkoppeln.
5. **Coverage-Luecken gezielt schliessen.** Runtime-Komposition und Dashboard-Composition zuerst.
6. **CI in Jobs/Matrix aufteilen.** Erst nachdem Output-Pfade und E2E-Isolation parallel-sicher sind.
7. **Budgets einfuehren.** Slow-Test- und Coverage-Budgets als Regressionsschutz.

## Akzeptanzkriterien fuer die spaetere Umsetzung

- `npx playwright test --workers=2` und `--workers=4` laufen mehrfach gruen.
- `npm run verify:full` laeuft lokal vollstaendig und robust unter der neuen Struktur.
- CI-Full-Gate nutzt mehrere Jobs und ist deutlich schneller als der aktuelle serielle Job.
- Keine JUnit-, Coverage- oder Playwright-Reports werden durch parallele Jobs ueberschrieben.
- `frontend/jsdom`-Zeit sinkt oder bleibt trotz hoeherer Coverage stabil.
- Coverage steigt gezielt bei `server/app-runtime.js`, `server/data-runtime.js`,
  `server/http-router.js`, `DashboardSections.tsx` und `CommandPalette.tsx`.
- E2E-Suite bleibt fokussiert auf echte Browserintegration statt auf exhaustive Contract-Tests.
