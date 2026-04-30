# Test Review

## Kurzfazit

Stand: 2026-05-01, lokale Arbeitskopie nach den bisherigen
Testsystem-Fixes.

Die Testpipeline ist inzwischen solide strukturiert: Vitest ist in Projekte
getrennt, die CI laeuft als DAG, lokale Timing-Kommandos schreiben
projektbezogene Reports, Playwright nutzt worker-isolierte Server, und das
optionale lokale Parallel-Gate ist lastbewusst. Der naechste grosse
Performance- und Robustheitsschritt liegt deshalb nicht in pauschal mehr
Parallelisierung, sondern in gezielter Reduktion von jsdom-, Prozess-,
Registry- und Coverage-Kosten.

Groesste verbleibende Hebel:

- `tests/frontend` ist mit Abstand der groesste Vitest-Walltime-Block.
- `integration-background` ist der kritischste Robustheitsbereich, weil echte
  Background-Prozesse parallel starten und Registry-/Port-/Readiness-Zustand
  teilen.
- Prozess-, Port-, Lock-, PATH-, Runner- und CLI-Tests sind fachlich wertvoll,
  duerfen aber nicht fuer reine Branch-Coverage missbraucht werden.
- Coverage ist global gut, aber die wichtigsten Branch-Luecken liegen weiter
  in Server-Runtime, HTTP-Router, Report, Auto-Import und
  Dashboard-Controller-Actions.
- Die CI ist schon sinnvoll parallelisiert. Weitere Beschleunigung muss anhand
  echter Timing-Daten erfolgen, damit keine Report-Kollisionen oder neue
  Flakes entstehen.

Keine der folgenden Verbesserungen darf App-Aussehen, Texte, Layout,
Animationen, User-Flows oder produktives Verhalten aendern. Der Umbau betrifft
Tests, Testhelfer, Testkonfiguration, CI-Orchestrierung und Dokumentation.

## Aktuelle Messbasis

Frischer lokaler Lauf:
`node scripts/run-vitest-project-timings.js --projects=architecture,unit,frontend,integration,integration-background --repeat=1`

| Projekt | Umfang | Walltime | Aufsummierte Kosten | Bewertung |
| --- | ---: | ---: | --- | --- |
| `architecture` | 10 Dateien, 22 Tests | `4.78s` | Import `1.40s`, Tests `1.04s` | Stabil, nicht Hauptproblem. |
| `unit` | 57 Dateien, 380 Tests | `4.40s` | Import `3.58s`, Tests `3.76s` | Schnell; Hotspots sind echte Prozess-/Lock-Smokes. |
| `frontend` | 76 Dateien, 204 Tests | `30.66s` | Setup `17.90s`, Import `31.28s`, Tests `34.66s`, Environment `71.10s` | Groesster Block und wichtigster Performance-Hebel. |
| `integration` | 13 Dateien, 44 Tests | `4.03s` | Tests `9.08s` | Meist gesund; teuer durch echte Server/HTTP/CLI. |
| `integration-background` | 4 Dateien, 5 Tests | `3.07s` | Tests `4.03s` | Klein, aber robustheitskritisch durch echte Background-Prozesse. |

Aktuelle Coverage aus `coverage/lcov.info`:

| Kennzahl | Wert |
| --- | ---: |
| Lines | `83.96%` |
| Branches | `70.02%` |
| Functions | `83.12%` |

Die globale Coverage ist damit gruen. Der relevante naechste Schritt ist nicht,
beliebige einfache UI-Wrapper auf 100% zu bringen, sondern kritische
Fehler-, Timeout-, Permission-, Registry-, Import-, Export- und Report-Branches
zu schliessen.

## Bottlenecks

### 1. Frontend/jsdom dominiert die Walltime

`frontend` braucht lokal rund `30s`; die aufsummierte Environment-Zeit von
`71.10s` und Import-Zeit von `31.28s` zeigt den Kern des Problems. Viele
Dateien bezahlen wiederholt jsdom, React Testing Library, i18n,
Browser-API-Shims, Radix, Recharts, cmdk und Framer Motion. Mehr Worker kann
diese Kosten nur teilweise verdecken; ab einem Punkt steigen CPU- und
Speicherdruck.

Aktuelle Hotspots:

| Suite/Testbereich | Signal | Ursache |
| --- | ---: | --- |
| `filter-bar-date-picker.test.tsx` | `1.353s` | Kalenderdialog, Focus, Fake-Timer, Keyboard. |
| `drill-down-modal-motion.test.tsx` | `1.322s` | Modal, Motion, Re-Render und Positioning. |
| `settings-modal-sections.test.tsx` | `1.279s` | Settings-Provider, Draft-State, Save-Flow. |
| `settings-modal-tabs.test.tsx` | `1.240s` | Modal-Tabs, i18n, Re-Render. |
| `settings-modal-provider-limits.test.tsx` | `1.215s` | Provider-Limits, Draft-Mapping, Controls. |
| `sortable-table-recent-days.test.tsx` | `1.064s` | Tabelleninteraktion und ARIA-Sort-State. |
| `drill-down-modal-regressions.test.tsx` | `1.040s` | Breite Modal-Regressionen. |
| `request-quality.test.tsx` | `0.930s` | IntersectionObserver, Reveal-Animation, Metric Cards. |

Die teuersten Einzeltests bestaetigen das Muster: DOM-/ARIA-/Focus-Verhalten
ist wertvoll, aber pure Datenableitung, Sortierung, Labelbildung und
Konfigurationsmapping sollten nicht in jsdom liegen.

Optimierung:

- Jede `tests/frontend`-Datei klassifizieren: pure logic, hook state,
  component interaction, chart rendering, accessibility/ARIA, motion/reveal,
  regression smoke.
- Pure Logik nach `tests/unit` verschieben: Command-Building,
  Tabellen-Sortierung, Datepicker-Daten, Settings-Transformationen,
  Chart-Datenformung, Label-/Formatierungslogik.
- Komponententests fokussieren: ein User-observable Verhalten pro Test,
  keine langen Multi-Regression-Renders.
- Zentrale Mocks/Helper ausbauen fuer Recharts, IntersectionObserver,
  ResizeObserver, matchMedia, requestAnimationFrame und Motion.
- `initI18n(...)` nur in Dateien explizit aufrufen, die Sprache variieren oder
  lokalisierte Ausgabe testen. Der globale Frontend-Setup initialisiert bereits
  Deutsch.
- `waitFor(...)` auditieren: behalten fuer React Query, async effects, Timer,
  Observer und echte eventual consistency; ersetzen durch direkte Assertions,
  `findBy...`, Fake-Timer-Flushing oder explizite User-Event-Schritte, wenn
  der Zustand synchron ist.

Nicht empfohlen:

- `frontend.maxWorkers` blind ueber `'80%'` erhoehen.
- `happy-dom` als schnellen Drop-in versuchen, bevor Radix/cmdk/Focus- und
  Accessibility-Verhalten gezielt validiert ist.
- Breite Dashboard-Smokes in jsdom ergaenzen, wenn ein Node-Unit-Test denselben
  Vertrag guenstiger pruefen kann.

### 2. Background-Concurrency ist der groesste Robustheitsblocker

`tests/integration/server-background-concurrency.test.ts` prueft einen
wichtigen Vertrag: zwei gleichzeitige `ttdash --background --no-open` Starts
sollen beide in der Registry landen und erreichbar sein. Dieser Bereich ist
klein, aber riskant, weil er echte CLI-Prozesse, Portwahl, Registry-Dateien,
Locks, Logfiles, Auth-Header und Readiness kombiniert.

Aktuelle Risikoflaechen:

- Zwei Prozesse konkurrieren um Registry-Read/Write, Portwahl und Pruning.
- Ein Prozess kann vor dem erwarteten Registry-Zustand aussteigen.
- Tests warten auf Registry und URL-Readiness, aber Diagnose muss im Fehlerfall
  sofort Port-, Registry-, Startup- und Logursache unterscheidbar machen.
- Weitere Parallelisierung des Background-Projekts wuerde Robustheit eher
  verschlechtern als verbessern.

Optimierung:

- `integration-background.maxWorkers` bei `2` lassen.
- Background-Fehlerdiagnostik weiter schaerfen: Exitcode, Signal, stdout,
  stderr, Runtime-Root, Registry-Datei, Registry-Inhalt, Log-Snippets,
  erwartete Ports und relevante Env-Werte.
- Registry-, Selection-, Prune-, EPERM-/ESRCH- und Startup-Branches mit
  Fake-FS/Fake-Clock/Fake-Spawn als Unit-Tests abdecken.
- Echte Cross-Process-Smokes auf wenige Vertraege begrenzen: concurrent
  startup, selected stop, custom prefix/permissions.
- Nach jedem Fix mindestens drei Wiederholungen von
  `node scripts/run-vitest-project-timings.js --projects=integration-background --repeat=3`
  verlangen.

### 3. Prozessnahe Tests sind wertvoll, aber teilweise zu breit

Unit-Hotspots:

| Suite | Signal | Bewertung |
| --- | ---: | --- |
| `server-helpers-runner-process.test.ts` | `1.215s` | Echte `bunx`/`npx`/PATH-Pfade; als Smoke wertvoll, fuer Branch-Matrix teuer. |
| `server-helpers-file-locks.test.ts` | `0.479s` | Cross-Process-Locking; echte Prozesskoordination nur fuer wenige Faelle noetig. |
| `playwright-config.test.ts` | `0.428s` | Config-Load und worker-scoped Server-Vertrag. |
| `toktrack-version.test.ts` | `0.283s` | Package-/Version-Guardrails. |

Integration-Hotspots:

| Suite | Signal | Bewertung |
| --- | ---: | --- |
| `server-auto-import.test.ts` | `1.798s` | Auto-Import-Streaming, Fake Toktrack Runner, Singleton-Start. |
| `server-local-auth.test.ts` | `1.687s` | Echter Server, Bootstrap-Cookie/Bearer, Guards. |
| `server-api-reporting.test.ts` | `0.865s` | PDF/Typst-Pfad und Report-Router. |
| `server-startup-cli.test.ts` | `0.845s` | CLI-Startup, Host/Port/Permission-Vertraege. |
| `server-api-persistence.test.ts` | `0.760s` | Echte Persistenz- und Runtime-Root-Vertraege. |

Optimierung:

- Echte Prozesse nur fuer Shell, PATH, Portbindung, Signalhandling,
  Cross-Process-Locking, Registry-Koordination und CLI-Startup verwenden.
- Statusmapping, Error-Mapping, Timeout, Retry, Cache, Permission-Branches,
  Request-Shaping und malformed payloads mit Fake-Spawn/Fake-FS/Fake-Clock
  testen.
- Fixed sleeps in Testhelfern weiter durch Readiness-Endpoints,
  Sentinel-Dateien, Stream-Events oder explizite Child-Process-Signale
  ersetzen.
- `server-api-reporting` in Router-Fehlerpfade mit Fake-Report-Generator und
  einen echten PDF-Smoke trennen.
- Auth-Guard-Matrix so weit wie moeglich auf Router-/HTTP-Unit-Ebene testen;
  echte Server-Integration nur fuer Cookie/Bearer/Origin-Zusammenspiel
  behalten.

### 4. CI ist gut parallelisiert, aber weitere Daten fehlen

`.github/workflows/ci.yml` ist bereits als DAG aufgebaut:

- `static`
- Vitest-Matrix fuer `architecture`, `unit`, `frontend`, `integration`,
  `integration-background`
- dedizierter `coverage`-Job
- `build`
- `package-smoke` nach `build`
- `e2e` nach `build`
- `windows-smoke`

Verbleibende CI-Kosten sind wahrscheinlich:

- `npm ci --ignore-scripts` pro Job
- Playwright-Browser-Install im E2E-Job
- Coverage-Instrumentierung und HTML/LCOV-Erzeugung
- Artifact upload/download fuer `dist`, Coverage und Reports

Optimierung:

- Vor CI-Umbauten echte Job-Timings aus GitHub Actions auswerten.
- Coverage nicht in jede Matrix duplizieren; dedizierten Coverage-Job
  beibehalten.
- E2E-Sharding erst einfuehren, wenn HTML-/JUnit-/Artifact-Pfade shard-sicher
  sind.
- `verify:full` als serielle Referenz behalten und `verify:full:parallel` als
  lokalen Fast Path dokumentieren.
- Jede Worker- oder Shard-Aenderung mit mindestens drei Wiederholungen messen:
  Median und Worst Run dokumentieren.

## Coverage-Luecken

Aktuelle Low-Coverage-Signale aus `coverage/lcov.info`:

| Bereich | Lines | Branches | Risiko |
| --- | ---: | ---: | --- |
| `src/App.tsx` | `0.0%` | `0.0%` | Entry-Wiring; nur testen, wenn App-shell-Vertrag nicht anders abgedeckt ist. |
| `src/components/features/risk/ConcentrationRisk.tsx` | `0.0%` | `0.0%` | Feature ist ohne Testsignal; zuerst entscheiden, ob Smoke oder Exclude sinnvoll ist. |
| `server/report/index.js` | `40.9%` | `41.7%` | Typst-Erkennung, Compile-Fehler, Cleanup, PDF-Ausgabe. |
| `src/lib/app-settings.ts` | `40.0%` | `50.0%` | Defaults, Settings-Mapping, Recovery-Faelle. |
| `src/components/layout/Header.tsx` | `45.0%` | `35.7%` | Header-Actions, Links, Statusanzeigen. |
| `src/lib/csv-export.ts` | `46.7%` | n/a | Export-Korrektheit, Escaping, leere Daten. |
| `server/background-runtime.js` | `59.5%` | `53.9%` | Background-Start/Stop, Registry, EPERM/ESRCH, Pruning. |
| `server/http-router.js` | `68.0%` | `54.6%` | API-Fehlerpfade, Mutationsschutz, malformed JSON. |
| `server/auto-import-runtime.js` | `69.4%` | `54.7%` | Stream, Kill, Timeout, malformed output. |
| `src/hooks/use-dashboard-controller-actions.ts` | `69.0%` | `42.0%` | Upload/Delete/Export/Backup/PDF/toast side effects. |
| `src/components/features/auto-import/AutoImportModal.tsx` | `66.7%` | `51.4%` | Stream-Status, Cancel, Error, Success. |
| `src/components/features/command-palette/CommandPalette.tsx` | `67.4%` | `58.1%` | Visibility, action dispatch, keyboard/empty states. |
| `server/report/charts.js` | `75.7%` | `37.5%` | Chart asset edge cases and formatting. |

Prioritaet fuer Coverage-Erhoehung:

1. `server/background-runtime.js`
   - EPERM/ESRCH, stale registry, invalid registry, selected stop,
     startup failure, readiness timeout, no-open path, custom prefix.
2. `server/http-router.js`
   - malformed JSON, unsupported methods, missing/invalid auth, origin/host
     guards, permission denied, corrupt data/settings recovery, report
     success/failure.
3. `server/auto-import-runtime.js`
   - malformed toktrack output, child error, timeout, kill escalation, stream
     tail flush, singleton guard.
4. `server/report/index.js` und `server/report/charts.js`
   - missing Typst, compile stderr, cleanup failure tolerance, invalid payload,
     chart edge values.
5. `src/hooks/use-dashboard-controller-actions.ts`
   - upload success/error, delete/reset, backup import/export, PDF request,
     blob download, toast side effects, mutation invalidation.
6. `src/components/features/auto-import/AutoImportModal.tsx`
   - idle/running/success/error/cancel states, stream event rendering,
     disabled controls.
7. Branch-heavy UI-Workflows
   - Header, Command Palette, Settings sections, sortable tables, date picker.
8. Kleine Lib-Module
   - `app-settings.ts`, `csv-export.ts`, `csv.ts`, `model-utils.ts` mit
     parametrisierten Node-Unit-Tests.

Nicht jede 0%-Datei ist automatisch ein Problem. Primitive Wrapper,
Entry-Points oder rein deklarative UI sollten entweder mit einem guenstigen
Smoke abgedeckt oder bewusst vom Coverage-Ratchet ausgenommen werden. Der
entscheidende Massstab ist Produktionsrisiko, nicht kosmetische Prozentzahl.

## Nicht optimale Einstellungen

| Bereich | Aktuell | Bewertung | Empfehlung |
| --- | --- | --- | --- |
| `architecture.fileParallelism` | `false` | Stabil und klein; Parallelisierung bringt wenig und kann Source-Graph-Arbeit duplizieren. | Beibehalten, nur nach 3-run Benchmark aendern. |
| `unit.maxWorkers` | `'80%'` | Schnell; einzelne Prozess-Smokes dominieren. | Beibehalten, Branch-Matrix aus echten Prozess-Smokes entfernen. |
| `frontend.maxWorkers` | `'80%'` | Aktuell sinnvoll, aber varianzreich. | Nicht erhoehen; zuerst jsdom-Dateien und Importkosten reduzieren. |
| `integration.maxWorkers` | `'50%'` | Gute Balance fuer HTTP/I/O. | Erst nach besserer Tempdir-/Port-Isolation neu messen. |
| `integration-background.maxWorkers` | `2` | Richtig wegen echter Background-Prozesse. | Nicht erhoehen, bis Concurrency mehrfach stabil ist. |
| `frontend.testTimeout` | `30_000` | Robust unter Coverage, kann langsame Tests verdecken. | Timing-Budgets schaerfen statt Timeout zuerst senken. |
| Playwright CI workers | `2` | Runnerfreundlich und stabil. | `4` oder Sharding nur nach report-sicherem Mehrfachbenchmark. |
| Coverage | dedizierter Lauf | Richtig, aber teuer. | Beibehalten; spaeter gezielte Threshold-Ratchets. |
| Direkte Parallelaufrufe | feste Reportpfade moeglich | Manuelle Parallelitaet kann JUnit/HTML/Coverage ueberschreiben. | Nur scripts mit eindeutigen Output-Pfaden parallel nutzen. |

## Verbesserungsplan

### Phase 1 - Background-Concurrency stabilisieren

Ziel: Den kritischsten Flake-Bereich stabilisieren, bevor mehr
Parallelisierung oder scharfere Budgets eingefuehrt werden.

Umsetzung:

- Background-Testhelfer so erweitern, dass jeder CLI-Fehler Registry,
  Logfiles, Ports, Runtime-Root und Env-Kontext ausgibt.
- Concurrent-Startup-Test auf konkrete Zwischenzustaende pruefen:
  Prozess beendet erfolgreich, Registry enthaelt zwei Eintraege, beide Ports
  sind erreichbar, Readiness-Endpoint antwortet mit Auth.
- Registry-/Startup-/Prune-Branches in Unit-Tests mit Fakes abdecken.
- Echte Background-Smokes auf wenige Prozessvertraege begrenzen.

Akzeptanz:

- `integration-background` laeuft drei Wiederholungen ohne Flake.
- Fehlerdiagnose reicht aus, um Port-, Registry-, Auth- und Startup-Ursache zu
  unterscheiden.
- `maxWorkers` bleibt `2`.

### Phase 2 - Frontend/jsdom-Kosten senken

Ziel: Weniger jsdom-Fixkosten pro Assertion, ohne UI-Verhalten zu verlieren.

Umsetzung:

- `tests/frontend` klassifizieren und pure Logik in Node-Unit-Tests
  verschieben.
- Schwere Settings-, Drilldown-, FilterBar- und Table-Tests in kleinere,
  vertragsscharfe Tests schneiden.
- Shared Helper fuer Recharts, Observer, Motion, rAF und App-Provider
  konsolidieren.
- Unnoetige i18n-Initialisierung und unnoetige `waitFor(...)`-Nutzung
  entfernen.
- Danach `frontend` dreimal benchmarken und Median/Worst Run dokumentieren.

Akzeptanz:

- Frontend-Median oder Frontend-Worst-Run sinkt messbar.
- ARIA-, Keyboard-, Focus-, i18n-, Motion- und Chart-Verhalten bleibt
  abgedeckt.
- Keine Snapshots oder Layout-Goldens einfuehren.

### Phase 3 - Prozessnahe Tests trennen

Ziel: Echte Prozesse nur fuer echte Prozessvertraege verwenden; Branch-Logik
billiger und deterministischer testen.

Umsetzung:

- Runner-/PATH-Smokes in `server-helpers-runner-process.test.ts` behalten,
  Cache-/Timeout-/stderr-/stdout-Branches in Fake-Spawn-Tests verschieben.
- File-Lock-Smokes behalten, stale-lock-, permission- und cleanup-Branches mit
  Fake-FS/Fake-Clock testen.
- Auto-Import-Integration um fixed sleeps bereinigen und Branch-Matrix auf
  Runtime-/Router-Unit-Tests verlagern.
- Reporting in Fake-Generator-Routertests und einen echten PDF-Smoke trennen.

Akzeptanz:

- Integration-Worst-Run steigt nicht durch neue Coverage.
- Jeder echte Prozess-Smoke prueft einen Prozessvertrag, nicht nur
  Branch-Logik.
- Keine neuen fixed sleeps ohne konkrete Begruendung.

### Phase 4 - Coverage risikogewichtet erhoehen

Ziel: Branch-Coverage dort erhoehen, wo Fehler teuer waeren.

Umsetzung:

- Server-Runtime zuerst: Background, HTTP-Router, Auto-Import, Report.
- Danach Controller-Actions und browsernahe Side Effects.
- Danach UI-Workflow-Branches mit echten DOM-Vertraegen.
- Kleine Lib-Module per parametrisierten Node-Unit-Tests abdecken.
- Nach jeder Coverage-Phase `npm run test:vitest:coverage` auswerten und
  globale Werte plus betroffene Dateien dokumentieren.

Akzeptanz:

- Globale Coverage faellt nicht.
- Branch-Coverage steigt zuerst in `server/` und branch-heavy Hooks.
- Neue Tests liegen auf dem schmalsten sinnvollen Layer.

### Phase 5 - Gates datenbasiert schaerfen

Ziel: Lokale und CI-Gates schneller machen, ohne Strenge zu verlieren.

Umsetzung:

- `verify:full` als serielle Referenz behalten.
- `verify:full:parallel` als lokalen Fast Path dokumentieren und regelmaessig
  gegen CI-DAG spiegeln.
- Timing-Budgets projektweise schaerfen, aber erst nach Background-Stabilitaet.
- CI-Timing-Artefakte auswerten, bevor Dependency-Install, Browser-Install,
  Coverage oder Artifacts umgebaut werden.
- Sharding nur einfuehren, wenn alle Reportpfade shard-sicher sind.

Akzeptanz:

- Keine parallelen Jobs ueberschreiben JUnit, Coverage oder Playwright-HTML.
- CI-DAG bleibt lesbar und liefert aussagekraeftige Failures.
- Lokaler Fast Path ist schneller, aber nicht weniger streng.

### Phase 6 - Playwright klein und wertvoll halten

Ziel: Browserzeit nur fuer echte User Journeys verwenden.

Behaltene E2E-Vertraege:

- Dashboard load/upload.
- Settings/backups.
- Forecast/filter flow.
- Reporting smoke.
- Representative Command Palette smoke.

Nicht in E2E ausweiten:

- Vollstaendige Command-Liste, IDs, Aliases und Visibility.
- Exhaustive Sortier-, Label- und Filter-Matrizen.
- Reine Datenformung oder Settings-Mapping.

Akzeptanz:

- Playwright bleibt kurz und prueft echte Browserintegration.
- Worker-scoped Server, Port, Runtime-Root und Auth-Session bleiben erhalten.
- Kein User-Flow wird ausschliesslich durch pure Unit-Tests ersetzt, wenn der
  Browser selbst Teil des Risikos ist.

## Zielarchitektur

| Testlevel | Zweck | Performance-Regel |
| --- | --- | --- |
| Node Unit | Pure Logik, Branches, Formatierung, Runtime-Factories | Schnell, fake by default. |
| Frontend jsdom | DOM, ARIA, Keyboard, Focus, Motion, Provider-Zusammenspiel | Zielgenau, keine breiten Dashboard-Smokes. |
| Integration Node | Echter Server, HTTP, CLI, FS, Ports, Cross-Process | Wenige echte Vertraege, gute Diagnose. |
| Architecture | Import-, Layer- und Strukturregeln | Klein halten, shared source graph nutzen. |
| E2E | Echte Browser-Journeys | Kurz, worker-isoliert, keine Contract-Matrix. |
| Coverage | Breiter Denominator und Risk Ratchet | Separater Lauf, nicht in jede Matrix duplizieren. |

## Empfohlene Reihenfolge

1. Background-Concurrency diagnostizieren und stabilisieren.
2. Frontend/jsdom-Testklassifizierung durchfuehren.
3. Pure Logik aus Frontendtests in Node-Unit-Tests verschieben.
4. Prozessnahe Tests in Fake-Branch-Tests und echte Smokes trennen.
5. Server-Runtime-Coverage fuer Background, Router, Auto-Import und Report
   erhoehen.
6. Controller-/Hook-Coverage fuer Dashboard Actions, Settings, CSV und Model
   Utils erhoehen.
7. Timing-Budgets projektweise schaerfen.
8. CI- und Playwright-Sharding nur nach report-sicherem Mehrfachbenchmark
   erweitern.

## Validierung

Da diese Datei nur Review und Plan enthaelt:

- `npx prettier --check docs/review/test-review.md`
- `git diff --check -- docs/review/test-review.md`

Fuer spaetere Implementierungsphasen:

- Nach Performance-Aenderungen:
  `node scripts/run-vitest-project-timings.js --projects=<project> --repeat=3`
- Nach Coverage-Aenderungen: `npm run test:vitest:coverage`
- Nach Pipeline-Aenderungen:
  `PLAYWRIGHT_TEST_PORT=3016 npm run verify:full:parallel`
- Nach E2E-Aenderungen: `npm run test:e2e:ci` und bei Sharding/Worker-Aenderung
  mehrere Wiederholungen mit eindeutigen Reportpfaden.
