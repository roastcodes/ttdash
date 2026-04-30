# Fixed Findings

## 2026-05-01

### test-review.md / Phase 1 - Background-Concurrency stabilisieren

- Status: fixed
- Scope: Die Background-Runtime-Branch-Coverage wurde ohne weitere echte Prozesse erweitert.
  Stop-Noop, Multi-Instance-Cancel, Stop-Timeout mit Logausgabe und erfolgreicher Background-Start
  laufen jetzt im schnellen Fake-basierten Unit-Layer. Die vorhandenen echten
  `integration-background`-Smokes bleiben unveraendert und pruefen weiter Concurrent Startup,
  selected stop, Registry pruning und custom prefix/log permissions.
- Fix reference: phase commit `Expand background runtime branch coverage`
- Closed findings:
  - `test-review.md / Phase 1` - Background-Concurrency stabilisieren, Restabdeckung fuer
    Stop-/Start-Branches.
  - `test-review.md / Coverage-Luecken` - `server/background-runtime.js`, Teil Stop-Cancel,
    Stop-Timeout und erfolgreicher Start.
- Guardrails:
  - Keine Produktionslogik wurde geaendert.
  - Neue Tests verwenden Fake-FS, Fake-Spawn, Fake-Readline, Fake-Clock und Spy-Ausgaben statt
    zusaetzlicher Subprozesse.
  - `integration-background.maxWorkers` bleibt unveraendert bei `2`.
  - Der dreifache Background-Benchmark lief ohne Concurrency-Flake.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/background-runtime.test.ts --reporter=verbose` -> passed with `14` tests.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:integration-background` ->
    passed with `4` files and `5` tests.
  - `node scripts/run-vitest-project-timings.js --projects=integration-background --repeat=3` ->
    passed with median `2.74s`, worst `3.12s`.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:unit` -> passed with `383`
    passed and `1` skipped.
  - `coderabbit review --agent -t uncommitted -c AGENTS.md -c .coderabbit.yaml -f docs/review/fixed-findings.md -f tests/unit/background-runtime.test.ts` -> CodeRabbit raised 0 issues.

### test-review.md / Phase 2 - Frontend/jsdom-Kosten senken

- Status: fixed
- Scope: Der Chart-Legend-Wrapping-Vertrag wird nicht mehr ueber drei schwere Chart-Integrationen
  mit Recharts-Mocks und i18n geprueft. `tests/frontend/chart-legend-integration.test.tsx` rendert
  jetzt direkt `ChartLegend` und deckt Default-Labels, custom `renderLabel`, `filterEntry`,
  `flex-wrap` und den Verzicht auf horizontales Overflow ab.
- Fix reference: phase commit `Lighten chart legend frontend test`
- Closed findings:
  - `test-review.md / Phase 2` - Frontend/jsdom-Kosten senken, Teil Reduktion schwerer
    Chart-/Recharts-Importe.
  - `test-review.md / Bottlenecks / Frontend/jsdom` - pure gemeinsame Legend-Layout-Logik bleibt im
    jsdom-Layer, aber ohne die nicht noetigen Chart-Integrationen.
- Guardrails:
  - Keine Produktionslogik wurde geaendert.
  - Der User-visible Legend-Vertrag bleibt erhalten: Labels rendern, Wrapping bleibt aktiv,
    horizontales Scroll-Layout kehrt nicht zurueck.
  - Die bestehenden chart-spezifischen Tests fuer `CostByModel`, `RequestsOverTime`,
    `TokenTypes`-nahe Datenpfade und `CostOverTime` bleiben separat erhalten.
  - `.gitignore` erlaubt nur die getrackten Review-Markdown-Dateien `test-review.md` und
    `fixed-findings.md`, damit lokale Review-Notizen nicht in scoped CodeRabbit-Laeufe geraten.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project frontend tests/frontend/chart-legend-integration.test.tsx --reporter=verbose` -> passed with `3` tests; targeted run reported import `25ms`, tests `86ms`.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:frontend` -> passed with `76`
    files and `204` tests.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `coderabbit review --agent -t uncommitted -c AGENTS.md -c .coderabbit.yaml -f .gitignore -f docs/review/fixed-findings.md -f tests/frontend/chart-legend-integration.test.tsx` -> CodeRabbit raised 0 issues.
- Measurement notes:
  - The frontend project run was load-distorted at `80.80s`; the refactored Legend test itself
    completed as a small direct component test at `269ms` inside that run.

### test-review.md / Phase 3 - Prozessnahe Tests trennen

- Status: fixed
- Scope: Die verbleibenden Runner-Resolution-Error-Branches fuer lokale Startfehler und komplett
  fehlende Runner sind jetzt im Fake-basierten Unit-Layer abgedeckt. Die echten
  `server-helpers-runner-process`-Smokes bleiben auf Shell/PATH/Timeout/stdout-Vertraege begrenzt.
- Fix reference: phase commit `Cover runner resolution error branches`
- Closed findings:
  - `test-review.md / Phase 3` - Prozessnahe Tests trennen, Teil Branch-Matrix aus echten
    Prozess-Smokes herausziehen.
  - `test-review.md / Prozessnahe Tests` - Error-Mapping fuer Runner-Resolution ohne Subprozesse.
- Guardrails:
  - Keine Produktionslogik wurde geaendert.
  - Die neuen Tests rufen `toAutoImportRunnerResolutionError(...)` direkt mit kontrollierten
    Diagnosedaten auf.
  - Echte Runner-Smokes fuer lokale Installation, PATH-Fallback, Timeout und stdout-Fehler bleiben
    unveraendert.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/server-helpers-runner-core.test.ts tests/unit/server-helpers-runner-process.test.ts --reporter=verbose` -> passed with `24` passed and `1` skipped.
  - `node scripts/run-vitest-project-timings.js --projects=unit --repeat=1` -> passed with unit
    median `4.90s`, worst `4.90s`.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `coderabbit review --agent -t uncommitted -c AGENTS.md -c .coderabbit.yaml -f docs/review/fixed-findings.md -f tests/unit/server-helpers-runner-core.test.ts` -> CodeRabbit raised 0 issues.

## 2026-04-30

### test-review.md / Phase 1 - Background-Concurrency stabilisieren

- Status: fixed
- Scope: Background-Concurrency-Smoke behält den echten Cross-Process-Vertrag, liefert aber im
  Fehlerfall jetzt verwertbare Diagnose zu CLI-Ausgaben, Registry, Runtime-Root, Ports und
  Background-Logs. Background-Registry-/Lock-/Runtime-Identity-Branches sind zusätzlich auf dem
  schnellen Unit-Layer abgedeckt.
- Fix reference: `b7fbe80` `Stabilize background concurrency tests`
- Closed findings:
  - `test-review.md / H-01` - Background-Concurrency flakt unter wiederholter Last, Teil
    Diagnostik und Lock-/Registry-Branch-Abdeckung.
  - `test-review.md / Phase 1` - Background-Concurrency stabilisieren.
- Guardrails:
  - `runCli` trennt stdout/stderr und liefert Signal, Args und kombinierten Output weiterhin
    kompatibel fuer bestehende Tests.
  - `waitForBackgroundRegistry` meldet bei Timeout Registry-Inhalt und Background-Log-Snippets.
  - Der Concurrent-Startup-Test prueft nach Readiness erneut, dass beide Registry-Eintraege noch
    vorhanden sind und eindeutige URLs besitzen.
  - Background-Logdateien enthalten jetzt den Parent-PID-Suffix, damit parallele Starts keine
    Diagnose-Logs teilen.
  - Unit-Tests decken Runtime-Identity Fetch, nicht verfuegbare Runtime-Responses, stale Locks,
    Lock-Timeout, invalid Registry Payloads, ESRCH beim Stop und Browser-Open-Env fuer
    Background-Kinder ab.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/background-runtime.test.ts --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project integration-background tests/integration/server-background-concurrency.test.ts --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:integration-background` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:timings:benchmark -- --projects=integration-background` -> passed with median `4.95s`, worst `5.51s` in the final isolated run; an earlier same-session isolated control before extra load measured median `2.52s`, worst `2.66s`.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:unit` -> passed with `361 passed | 1 skipped`.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:coverage` -> passed with `151`
    files, `616 passed | 1 skipped`.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run verify:full:parallel` -> passed with Playwright `11 passed`.
- Measurement notes:
  - Coverage summary after this phase: Statements `81.98%`, Branches `69.51%`, Functions
    `83.06%`, Lines `83.43%`.
  - `server/background-runtime.js` improved to Statements `58.60%`, Branches `53.89%`, Functions
    `73.52%`, Lines `59.52%`.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` -> 0
    issues.
  - Commit is SSH-signed.

### test-review.md / Phase 2 - Frontend/jsdom-Kosten senken

- Status: fixed
- Scope: Command-Palette-Gruppen- und ID-Vertraege laufen jetzt im schnellen
  Node-Unit-Layer; ein schmaler Command-Palette-Render-Smoke bleibt in einer bestehenden
  i18n-jsdom-Datei. Der redundante FilterBar-Preset-Order-DOM-Test wurde entfernt, weil die
  gemeinsame Preset-Reihenfolge bereits im Unit-Layer abgesichert ist.
- Fix reference: `1657822` `Move command palette contracts to unit tests`
- Closed findings:
  - `test-review.md / H-02` - Frontend/jsdom dominiert die Vitest-Walltime, Teil Command-Palette
    Contract-Tests und redundante Preset-Assertion.
  - `test-review.md / Phase 2` - Frontend/jsdom-Kosten senken.
- Guardrails:
  - Command-IDs fuer Load-Data-, Export- und Maintenance-Aktionen bleiben im Builder-Vertrag
    explizit stabil.
  - Lokalisierte Command-Gruppen werden im Unit-Layer ueber einen kontrollierten Translator
    geprueft.
  - Der verbleibende jsdom-Smoke prueft weiterhin, dass die Command Palette gerendert werden kann
    und representative Commands in deutscher UI sichtbar sind.
  - FilterBar-Preset-Reihenfolge bleibt ueber `DASHBOARD_QUICK_DATE_PRESETS` im Unit-Test
    abgesichert.
  - Keine Produktionsdateien, kein Layout und kein App-Verhalten wurden geaendert.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/command-palette-commands.test.ts tests/unit/dashboard-preferences.test.ts --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project frontend tests/frontend/filter-bar-presets.test.tsx --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project frontend tests/frontend/dashboard-language-regressions.test.tsx --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:unit` -> passed with
    `363 passed | 1 skipped`.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:frontend` -> passed with `76`
    files and `204 passed`.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:timings:projects -- --projects=frontend` -> passed with `76` files, `204 passed`, and `55.86s` measured under high local system load.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:coverage` -> passed with global
    coverage unchanged from Phase 1.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run verify:full:parallel` -> passed with Playwright `11 passed`.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` ->
    CodeRabbit raised 0 issues.
- Measurement notes:
  - Frontend/jsdom files dropped from `77` to `76`.
  - Frontend project now runs `204` jsdom tests; removed broad Command-Palette group coverage was
    replaced by cheaper Unit-Contract coverage plus one existing-file render smoke.
  - Coverage summary after this phase: Statements `81.98%`, Branches `69.51%`, Functions
    `83.06%`, Lines `83.43%`.
  - Current absolute frontend timings are load-distorted; the structural improvement is lower
    jsdom file count with no coverage regression.
  - Commit is SSH-signed.

### test-review.md / Phase 3 - Prozessnahe Tests weiter in Vertraege und Branches trennen

- Status: fixed
- Scope: Runner-Resolution-, Command-Error-, stderr-streaming-, external-close- und Timeout-
  Branches laufen jetzt im Fake-Spawn-Unit-Layer; der echte Cross-Process-File-Lock-Smoke nutzt
  ein explizites IPC-Release statt eines fixed `250ms` Sleeps. Shared Dashboard-Preference-
  Normalisierungs-Branches sind als billige Node-Unit-Tests stabilisiert, damit Coverage nicht von
  teuren jsdom- oder Prozess-Smokes abhaengt.
- Fix reference: `7555c0e` `Harden process-adjacent test coverage`
- Closed findings:
  - `test-review.md / H-03` - Prozessnahe Tests sind teilweise zu breit, Teil Runner-Branch-
    Coverage und File-Lock-Smoke-Wartezeit.
  - `test-review.md / H-04` - Kritische Runtime-/Config-Branches sind unterdurchschnittlich
    abgedeckt, Teil Auto-Import-Runner und Dashboard-Preference-Normalisierung.
  - `test-review.md / Phase 3` - Prozessnahe Tests weiter in Vertraege und Branches trennen.
- Guardrails:
  - Echte Runner-Smokes fuer lokale Installation, PATH-Fallback, Timeout und stdout-Fehler bleiben
    erhalten; neue Fake-Spawn-Tests decken die branchigen Fehler- und Fallback-Pfade zusaetzlich
    deterministisch ab.
  - Der Fake-Timer-Timeout-Test beweist, dass `runToktrack` erst nach Child-Exit rejected und nicht
    direkt beim Timeout-Alarm settled.
  - `signalOnClose`, stderr streaming und Spawn-Error-Wrapping werden ohne echte Subprozesse
    getestet.
  - Der Cross-Process-File-Lock-Test wartet nicht mehr ueber elapsed time, sondern haelt den
    Child-Lock bis zum expliziten Parent-Release.
  - Dashboard-Preference-Tests sichern malformed config, defensive default filters, visibility,
    ordering und custom active range ohne jsdom ab.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/dashboard-preferences.test.ts tests/unit/server-helpers-runner-core.test.ts tests/unit/server-helpers-runner-process.test.ts tests/unit/server-helpers-file-locks.test.ts --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:timings:projects -- --projects=unit` -> passed, but absolute timing was distorted by local system CPU load.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:coverage` -> passed with `150`
    files, `623 passed | 1 skipped`.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run verify:full:parallel` -> passed with Playwright `11 passed`.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` ->
    CodeRabbit raised 0 issues.
- Measurement notes:
  - Coverage summary after this phase: Statements `82.07%`, Branches `69.58%`, Functions
    `83.11%`, Lines `83.52%`.
  - `server/auto-import-runtime.js` improved to Statements `69.95%`, Branches `54.72%`,
    Functions `79.03%`, Lines `69.43%`.
  - `shared/dashboard-preferences.js` improved to Statements `99.13%`, Branches `94.11%`,
    Functions `100%`, Lines `99.09%`.
  - Full gate timing under high local load: Unit `9.54s`, Frontend `73.51s`, Background
    Integration `7.97s`, Playwright `11 passed` in `42.3s`; `ps aux` showed heavy non-test load
    from WindowServer, ControlCenter, IDEA, Bitdefender and WebKit, so these absolute timings are
    not a stable performance baseline.
  - Commit is SSH-signed.

### test-review.md / Phase 4 - Coverage risikogewichtet erhoehen

- Status: fixed
- Scope: HTTP-Router-Branch-Coverage wurde auf die produktionskritischen Auto-Import-Stream- und
  Report-Request-Fehlerpfade erweitert, ohne echte Server, Browser oder Typst-Prozesse zu starten.
- Fix reference: `f2b3400` `Cover router auto-import error paths`
- Closed findings:
  - `test-review.md / H-04` - Kritische Runtime-Branches sind unterdurchschnittlich abgedeckt,
    Teil HTTP-Router Auto-Import-Stream, Lease-Handling und Report-Body-Fehler.
  - `test-review.md / Phase 4` - Coverage risikogewichtet erhoehen.
- Guardrails:
  - Der Router-Mock unterstuetzt jetzt `res.write(...)`, damit Server-Sent-Event-Streams im
    Unit-Layer realistisch akkumuliert werden.
  - Auto-Import-Erfolg prueft `check`, `progress`, `stderr`, `success` und `done` Events sowie die
    Weitergabe der erworbenen Lease an `performAutoImport`.
  - Concurrent Auto-Import Starts werden als lokalisierte `409`-Antwort abgebildet.
  - Strukturierte Auto-Import-Fehler pruefen `error` und `done` Stream-Events und stellen sicher,
    dass die Lease auch im Fehlerpfad genau einmal freigegeben wird.
  - Malformed Report-Requests liefern `400` mit `Invalid report request`, getrennt von oversized
    Request- und fehlendem Typst-Fehlerpfad.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/http-router-mutations.test.ts --reporter=verbose` -> passed with `21` tests.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:timings:projects -- --projects=unit`
    -> passed with unit median `3.69s` in the local timing summary.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:coverage` -> passed with `150`
    files, `626 passed | 1 skipped`.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run verify:full:parallel` -> passed with Playwright `11 passed`.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f tests/unit/http-router-mutations.test.ts` -> CodeRabbit raised 0 issues.
- Measurement notes:
  - Coverage summary after this phase: Statements `82.46%`, Branches `70.01%`, Functions
    `83.11%`, Lines `83.95%`.
  - `server/http-router.js` improved to Statements `68%`, Branches `54.63%`, Functions `68%`,
    Lines `68%`.
  - Full gate timing in the normalized local run: Integration `2.69s`, Unit `2.64s`, Frontend
    `22.34s`, Architecture `3.49s`, Integration-Background `1.95s`, Playwright `11 passed` in
    `14.7s`.
  - Commit is SSH-signed.

### test-review.md / Phase 5 - Lokale und CI-Gates datenbasiert nachschaerfen

- Status: fixed
- Scope: Das lokale Parallel-Gate deklariert jetzt die Report-/Artefakt-Outputs der parallel
  laufenden Tasks, prueft vor dem Spawn auf Output-Kollisionen und gibt nach jedem Run eine
  per-Task-Timing-Zusammenfassung aus. Die bestehende serielle Referenz bleibt unveraendert.
- Fix reference: `eab08c5` `Harden parallel gate diagnostics`
- Closed findings:
  - `test-review.md / M-02` - Timing-Budgets erkennen Ausreisser, Teil lokale Task-Walltime-
    Sichtbarkeit im Full-Gate.
  - `test-review.md / Phase 5` - Lokale und CI-Gates datenbasiert nachschaerfen.
- Guardrails:
  - `node scripts/run-parallel-gate.js --dry-run --e2e` zeigt jetzt Task-Wellen und deklarierte
    Outputs wie `test-results/vitest-frontend.junit.xml`, `playwright-report/` und
    `test-results/`.
  - `findParallelOutputCollisions(...)` verhindert, dass zwei Tasks in derselben Welle denselben
    Output-Pfad deklarieren.
  - Erfolgreiche und fehlschlagende Gate-Runs drucken eine Timing-Summary der bereits beendeten
    Tasks, damit lokale Engpaesse ohne JUnit-Inspektion sichtbar sind.
  - `tests/frontend/metric-ratio-locale.test.tsx` fixiert den aktuellen Monat selbst und stellt
    Timer/Globals wieder zurueck; der MonthMetrics-Test ist damit nicht mehr vom echten Datum oder
    von fremden Fake-Timer-Zustaenden abhaengig.
  - `docs/testing.md` dokumentiert Dry-Run, Output-Pruefung und Timing-Summary als Gate-Runbook.
- Validation:
  - `node scripts/run-parallel-gate.js --dry-run --e2e` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/run-parallel-gate.test.ts --reporter=verbose` -> passed with `7` tests.
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project frontend tests/frontend/metric-ratio-locale.test.tsx --reporter=verbose` -> passed with `3` tests.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:timings:projects -- --projects=unit`
    -> passed with unit median `3.29s`, worst `3.29s`.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:coverage` -> passed with `150`
    files, `629 passed | 1 skipped`.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run verify:full:parallel` -> passed with Playwright `11 passed`.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` ->
    CodeRabbit raised 0 issues.
- Measurement notes:
  - Coverage summary after this phase: Statements `82.30%`, Branches `69.78%`, Functions
    `83.06%`, Lines `83.80%`.
  - Full gate timing summary: Static `6.73s`, Integration `4.01s`, Build `1.07s`, Unit `5.65s`,
    Frontend `52.49s`, Architecture `6.24s`, Integration-Background `3.39s`,
    Package-Smoke `21.34s`, E2E `25.67s`.
  - The Full-Gate bottleneck in this run is still frontend/jsdom, followed by Playwright and the
    package smoke.
  - Commit is SSH-signed.

### test-review.md / Phase 6 - Playwright klein und wertvoll halten

- Status: fixed
- Scope: Playwright-Scope, worker-isolierte Fixtures, CI-Worker-Cap und Reportpfade sind jetzt im
  schnellen Unit-Layer abgesichert. Die Browser-Suite bleibt bei den bestehenden `11`
  representative Smoke-Flows.
- Fix reference: `efb9cee` `Guard Playwright smoke scope`
- Closed findings:
  - `test-review.md / M-03` - E2E-Sharding ist erst nach Report-Isolation sinnvoll, Teil
    Reporterpfad-Guardrail.
  - `test-review.md / Phase 6` - Playwright klein und wertvoll halten.
- Guardrails:
  - `tests/unit/playwright-config.test.ts` prueft `testDir`, `fullyParallel`, CI-Worker-Cap,
    fehlenden globalen `webServer`, Trace/Screenshot/Video-Policy und stabile HTML-/JUnit-
    Reporterpfade.
  - E2E-Specs muessen `test`/`expect` aus `tests/e2e/fixtures.ts` importieren und duerfen nicht
    direkt `@playwright/test` verwenden; damit bleiben Worker-Port, Runtime-Root und Auth-Session
    isoliert.
  - Die erlaubte Journey-Liste ist explizit: Command Palette, Forecast/Filters, Load/Upload,
    Reporting und Settings/Backups.
  - Die Browser-Suite bleibt auf `11` Tests und hat eine obere Guardrail von `12`, damit neue
    Contract-Matrizen nicht unbemerkt in Playwright wachsen.
  - `docs/testing.md` dokumentiert, dass dieser Vertrag bewusst angepasst werden muss, wenn eine
    neue echte Browser-Journey dazukommt.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/playwright-config.test.ts --reporter=verbose` -> passed with `4` tests.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:coverage` -> passed with `150`
    files, `632 passed | 1 skipped`.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run verify:full:parallel` -> passed with Playwright `11 passed`.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` ->
    CodeRabbit raised 0 issues.
- Measurement notes:
  - Coverage summary after this phase: Statements `82.30%`, Branches `69.78%`, Functions
    `83.06%`, Lines `83.80%`.
  - Full gate timing summary: Static `6.12s`, Integration `3.94s`, Build `1.30s`, Unit `3.62s`,
    Frontend `23.68s`, Architecture `5.07s`, Integration-Background `2.96s`,
    Package-Smoke `13.16s`, E2E `17.02s`.
  - Playwright stayed at `11` browser tests and `workers=2` for CI-style runs.
  - Commit is SSH-signed.

### test-review.md / Phase 5 - Lokales Full-Gate parallelisieren

- Status: fixed
- Scope: neues lokales, lastbewusstes Parallel-Gate fuer statische Checks, Vitest-Projekte, Build,
  Package-Smoke und optionalen E2E-Full-Gate.
- Fix reference: `67db759` `Add parallel verification gate`
- Closed findings:
  - `test-review.md / H-04` - Lokales Full-Gate laeuft unnoetig seriell, obwohl grosse Teile
    unabhaengig sind.
  - `test-review.md / Phase 5` - Lokale und CI-nahe Verifikation parallel und robuster
    orchestrieren.
- Guardrails:
  - `verify:parallel` ueberlappt nur die gut kombinierbaren Gates `test:static`,
    `test:integration` und `build:app`.
  - Die intern bereits stark parallelen oder prozessnahen Suites laufen in eigenen Wellen:
    `test:unit`, `test:frontend`, `test:architecture` und `test:integration:background`.
  - `verify:package` laeuft erst nach erfolgreichem Build und erfolgreichen Testwellen, damit der
    Paket-Smoke weiterhin gegen das frische Produktionsbundle prueft.
  - `verify:full:parallel` haengt Playwright an die finale Welle.
  - Der E2E-Datepicker-Test fokussiert einen stabilen mittleren Monatstag, damit der Test am
    Monatsletzten nicht faelschlich erwartet, dass `ArrowRight` ueber das Monatsende hinaus
    navigiert.
  - Unit-Tests decken Dry-Run, E2E-Plan, Spawn-Argumente, Fehlerweitergabe und Paket-Smoke-
    Abhaengigkeit ab.
- Validation:
  - `node scripts/run-parallel-gate.js --dry-run --e2e` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/run-parallel-gate.test.ts tests/unit/test-pipeline-scripts.test.ts --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npx playwright test tests/e2e/dashboard-forecast-filters.spec.ts -g 'exposes pressed filter state' --workers=1 --reporter=line` -> passed.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run verify:full:parallel` -> passed with Playwright `11 passed`.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:coverage` -> passed with `151`
    files, `609 passed | 1 skipped`.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` -> 0
    issues.
- Measurement notes:
  - Naive "alles parallel" war nicht robust: Architektur konnte unter CPU-Saettigung in das 5s-
    Testtimeout laufen; `integration-background` konnte unter voller Last beim parallelen
    Background-Start nur eine Registry-Instanz sehen.
  - Balancierte finale Messung: Integration `3.06s`, Unit `3.25s`, Frontend `25.89s`,
    Architektur `4.44s`, Integration-Background `3.08s`, Playwright `11 passed` in `51.8s`.
  - Coverage summary nach dieser Phase: Statements `81.54%`, Branches `69.33%`, Functions
    `82.59%`, Lines `82.97%`.
  - Commit is SSH-signed.

### test-review.md / Phase 4 - Runtime-Branch-Coverage

- Status: fixed
- Scope: gezielte Branch-Tests fuer Prozess-Utilities und Background-Stop-Fehlerpfad.
- Fix reference: `44c073d` `Cover process runtime edge cases`
- Closed findings:
  - `test-review.md / H-03` - Coverage-Luecken liegen in kritischen Runtime-Branches, Teil
    `server/process-utils.js` und `server/background-runtime.js`.
  - `test-review.md / Phase 4` - Coverage risikogewichtet erhoehen.
- Guardrails:
  - `process-utils.test.ts` prueft `isProcessRunning` fuer invalid PID, laufenden Prozess, ESRCH
    und EPERM sowie `sleep` mit Fake Timers.
  - `background-runtime.test.ts` prueft, dass `ttdash stop` bei EPERM den Fehlerpfad und Exitcode
    korrekt setzt, ohne echte Prozesse zu signalisieren.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/process-utils.test.ts tests/unit/background-runtime.test.ts --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:vitest:coverage` -> passed with `150`
    files, `605 passed | 1 skipped`.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` -> 0
    issues.
- Coverage notes:
  - Global coverage after this phase: Statements `81.46%`, Branches `69.09%`, Functions `82.54%`,
    Lines `82.86%`.
  - `server/process-utils.js` now reports Statements `100%`, Functions `100%`, Lines `100%`,
    Branches `80%`.
  - `server/background-runtime.js` improved to Statements `46.51%`, Branches `47.90%`,
    Functions `47.05%`, Lines `47.14%`.
  - Commit is SSH-signed.

### test-review.md / Phase 3 - Prozessnahe Runner-Tests straffen

- Status: fixed
- Scope: reine Latest-Version Timeout-/Cache-Branches laufen jetzt mit Fake Spawn im Node-Unit-
  Test statt mit echten PATH-Skripten und Subprozessen.
- Fix reference: `c4882ae` `Move toktrack cache tests to fake spawn`
- Closed findings:
  - `test-review.md / H-02` - Prozessnahe Tests mischen Vertragspruefung und Branch-Coverage,
    Teil Toktrack-Latest-Version Cache/Timeout.
  - `test-review.md / Phase 3` - Prozessnahe Tests straffen.
- Guardrails:
  - Echte Prozess-Smokes bleiben fuer lokale Binary, PATH-Fallback, Runner-Timeout und stdout-
    Fehler bestehen.
  - Cache-Erfolg, Cache-Fehler und Lookup-Timeout werden ueber Fake Spawn, Fake Timers und
    kontrolliertes `Date.now()` abgedeckt.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/server-helpers-runner-core.test.ts tests/unit/server-helpers-runner-process.test.ts --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:timings:projects -- --projects=unit` ->
    passed.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` -> 0
    issues.
- Measurement notes:
  - `tests/unit/server-helpers-runner-process.test.ts` dropped from earlier `3.105s` suite time to
    `0.878s` in the unit project timing run.
  - Unit project timing summary for this phase: median `6.41s`.
  - Commit is SSH-signed.

### test-review.md / Phase 2 - Frontend/jsdom Worker-Parallelitaet

- Status: fixed
- Scope: datenbasierte Anpassung der Frontend/jsdom Worker-Obergrenze von `50%` auf `80%`.
- Fix reference: `2932697` `Tune frontend test parallelism`
- Closed findings:
  - `test-review.md / H-01` - Frontend/jsdom ist der aktuelle Hauptkostentreiber.
  - `test-review.md / Phase 2` - Frontend/jsdom-Kosten senken, Teil Worker-Kalibrierung.
- Guardrails:
  - `vitest-coverage-config.test.ts` prueft, dass das Frontend-Projekt `maxWorkers: '80%'`
    nutzt und nicht auf volle CPU-Saettigung gestellt wird.
  - `docs/testing.md` dokumentiert die gemessene Begruendung und das Re-Benchmark-Kommando.
- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/vitest-coverage-config.test.ts --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:timings:projects -- --projects=frontend` -> passed with 77 files / 206 tests.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` -> 0 issues.
- Measurement notes:
  - Old configured `50%` project run in the same window: `55.97s` after CPU saturation.
  - `80%` probe before the 100% stress run: `27.46s`.
  - `100%` probe: `84.84s`, confirming full saturation is harmful.
  - Configured `80%` validation after the stress run: `48.13s`, still faster than the paired
    post-saturation `50%` run.
  - Commit is SSH-signed.

### test-review.md / Phase 1 - Messbarkeit und Benchmarking

- Status: fixed
- Scope: projektweise Vitest-Timing-Messung mit isolierten JUnit-Reports und wiederholbaren
  Benchmark-Laeufen fuer Median/Worst-Run-Auswertung.
- Fix reference: `944a049` `Add project test timing benchmark`
- Closed findings:
  - `test-review.md / Phase 1` - Messbarkeit und Benchmarks stabilisieren.
  - `test-review.md / M-02` - Timing-Budgets sind vorhanden, aber noch grob.
- Guardrails:
  - `test:timings:projects` schreibt projektbezogene Reports wie
    `test-results/vitest-frontend.timing.junit.xml`.
  - `test:timings:benchmark` wiederholt die Projektmessung dreimal und schreibt `timing-run-N`
    Reports, damit keine normalen JUnit-Ausgaben ueberschrieben werden.
  - Unit-Tests decken CLI-Parsing, eindeutige Reportpfade, Budget-Kommandos, Dry-Run und Median ab.
- Validation:
  - `node scripts/run-vitest-project-timings.js --projects=unit --repeat=1 --dry-run` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npx vitest run --project unit tests/unit/run-vitest-project-timings.test.ts tests/unit/test-pipeline-scripts.test.ts --reporter=verbose` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run format:check` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run lint` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run typecheck` -> passed.
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:timings:projects -- --projects=unit` ->
    passed.
  - `coderabbit review --agent -t committed --base-commit HEAD~1 -c AGENTS.md -f ...` -> 0
    issues.
- Notes:
  - Commit is SSH-signed. Local `git log --show-signature` verification still needs
    `gpg.ssh.allowedSignersFile`, but `git cat-file -p HEAD` contains the `gpgsig` block.
  - Earlier CodeRabbit uncommitted review surfaced the pre-existing `.gitignore`/`docs/review`
    policy issue. That was outside this phase and intentionally not mixed into the phase commit.

## 2026-04-29

### test-review.md implementation index

- Status: fixed
- Scope: phasenweise Umsetzung der Testsystem-Review vom 2026-04-28. Diese Liste referenziert die
  konkret geschlossenen Findings aus `docs/review/test-review.md` und die Commits, in denen die
  jeweilige Verbesserung gelandet ist.

| Finding                                                                           | Status | Fix reference                                                                                         | Validation                                                                                                  |
| --------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `test-review.md / H-01` - Playwright ist nicht worker-isoliert                    | fixed  | `ab49513` `Isolate Playwright workers`                                                                | `npm run test:e2e:ci` mit 2 Workern gruen; final `verify:full` gruen                                        |
| `test-review.md / H-02` - CI ist ein monolithischer serieller Full-Gate           | fixed  | `b5cac6a` `Split CI test pipeline`                                                                    | CI-DAG in `.github/workflows/ci.yml`; final `verify:full` gruen                                             |
| `test-review.md / H-03` - Command-Palette-E2E mischt zu viele Testarten           | fixed  | `cb31d35` `Move command palette contracts to Vitest`                                                  | Command-Contract in Vitest, E2E auf Smokes reduziert; final Playwright `11 passed`                          |
| `test-review.md / H-04` - Report- und Coverage-Ausgaben sind nicht matrix-sicher  | fixed  | `c4abb2b` `Make Vitest setup and reports parallel-safe`, `b5cac6a` `Split CI test pipeline`           | Projekt-/Job-spezifische JUnit/Artifact-Pfade; CI-Matrix nutzt getrennte Reports                            |
| `test-review.md / M-02` - Node-Projekte laden unnoetiges React-Test-Setup         | fixed  | `c4abb2b` `Make Vitest setup and reports parallel-safe`                                               | `vitest.setup.node.ts` / `vitest.setup.frontend.ts` getrennt; Guardrail in `vitest-coverage-config.test.ts` |
| `test-review.md / M-03` - Coverage ist global gruen, aber risikogewichtet schwach | fixed  | `3a4285d` `Improve runtime and dashboard coverage`, `117cfeb` `Fix CodeRabbit test robustness issues` | Runtime-/Dashboard-Coverage gezielt erhoeht; final Coverage-Gate gruen                                      |
| `test-review.md / M-05` - Statische Checks haben Doppelarbeit                     | fixed  | `b5cac6a` `Split CI test pipeline`                                                                    | `test:static` als ein regulaerer Static-Gate, Cache fuer Prettier/ESLint/TypeScript                         |
| `test-review.md / M-06` - Package-Smoke gehoert in eigenen CI-Job                 | fixed  | `b5cac6a` `Split CI test pipeline`                                                                    | `build` erzeugt `production-dist`; `package-smoke` und `e2e` nutzen Artifact parallel                       |
| `test-review.md / M-07` - Timing-Regressions sind sichtbar, aber nicht budgetiert | fixed  | `e9d54fa` `Add test timing budgets`                                                                   | `test:timings:budget` gruen; CI-Matrix prueft JUnit-Reports gegen `20s` Suite / `12s` Test Budget           |

Nicht als vollstaendig geschlossen markiert:

- `test-review.md / M-01` - `frontend/jsdom` bleibt der groesste Vitest-Kostentreiber. Die CI-DAG,
  Setup-Trennung und der zentrale Frontend-Timeout reduzieren Flakiness und Blockierzeit, aber die
  Import-/Environment-Kosten wurden nicht als eigener Optimierungsabschluss entfernt.
- `test-review.md / M-04` - Prozessnahe Tests wurden begrenzt und budgetiert, aber reale Subprozesse
  bleiben absichtlich fuer Shell-, PATH-, CLI- und Cross-Process-Verhalten bestehen.
- `test-review.md / N-01` - macOS-Sandbox/Playwright wurde als Agent-Memory dokumentiert; das ist
  kein Repository-Fix und bleibt eine Laufzeitumgebungsregel.

- Validation:
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:timings:budget` -> passed with `149`
    files and `596 passed | 1 skipped`.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run verify:full` ->
    passed, including coverage, build, package verification, and Playwright `11 passed`.
  - `coderabbit review --agent -t committed -c AGENTS.md` after Phase 6 -> `0 issues`.

## 2026-04-28

### documentation-review.md / N-01

- Status: fixed
- Scope: the stale `security-review.md / H-01` fixed-finding note about remote `?ttdash_token=...` browser bootstrap was corrected. The entry now matches the current runtime and integration test contract: remote API auth accepts Bearer, `X-TTDash-Remote-Token`, or an explicit auth cookie, while automatic query-token-to-cookie bootstrap is a local-session flow.
- Guardrails: `tests/integration/server-remote-auth.test.ts` asserts that remote query bootstrap does not return the local `303` cookie redirect, and `server/remote-auth.js` only resolves query-token bootstrap when local session auth is active.
- Validation:
  - `npm run format:check`
  - `git diff --check`

## 2026-04-27

### test-review.md / H-01

- Status: fixed
- Scope: simple architecture rules no longer depend on repeated ArchUnit project scans. `tests/architecture/source-graph.ts` now owns one cached `src/**` file scan, TypeScript-based import/export parsing, alias resolution for `@/...`, relative import resolution, extension resolution, and `index` module resolution. The frontend layer, unused-hook, hook-naming, and shared-UI-placement tests use this shared graph while the feature-slice diagram remains on ArchUnit where its diagram model adds value.
- Guardrails: `tests/architecture/frontend-layers.test.ts` still blocks hooks from importing components, lib core from importing hooks/components, lib React modules from reaching back into hooks/components, and type modules from depending on components/hooks/lib. `tests/architecture/unused-hooks.test.ts`, `hook-naming.test.ts`, and `shared-ui-placement.test.ts` now reuse the same source graph so future test-layer changes do not reintroduce separate slow scans. `tests/architecture/source-graph.test.ts` covers static imports, re-exports, side-effect imports, and dynamic imports with options.
- Follow-up quality fixes during implementation:
  - Dynamic `import(...)` calls are parsed alongside static imports and re-exports, so lazy edges stay visible to the architecture guardrails instead of only top-level declarations being checked.
  - The formerly near-timeout `hooks must not depend on components` rule dropped from the historical `~4950ms` flake boundary to well below `100ms` in the targeted architecture run, without increasing global or local timeouts.
  - Dashboard UI, content, animation, runtime API behavior, and production code remain unchanged.
- Validation:
  - `npm run test:architecture -- --reporter=verbose`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run check:deps`
  - `git diff --check`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 1 minor status-line suggestion already satisfied by the current `- Status: fixed` text, round 3: 1 dynamic-import options issue fixed, final round: 0 issues

### test-review.md / H-02

- Status: fixed
- Scope: Vitest coverage now reports against the product runtime instead of the former narrow frontend slice. `vitest.config.ts` includes `src/**/*.{ts,tsx}`, `server.js`, `server/**/*.js`, `shared/**/*.js`, and `usage-normalizer.js`, while excluding only TypeScript declarations, test files, and locale JSON assets from the configured runtime denominator.
- Guardrails: `tests/unit/vitest-coverage-config.test.ts` locks the coverage includes, excludes, and broad-denominator global thresholds. The thresholds ratchet the new signal at Statements `70`, Branches `60`, Functions `70`, and Lines `70`, below the measured broad baseline so CI fails on real regressions without making the first honest denominator brittle.
- Follow-up quality fixes during implementation:
  - The current `npm run test:unit:coverage` baseline is Statements `72.85%`, Branches `63.01%`, Functions `74.97%`, Lines `73.88%` across the broader runtime scope.
  - Server entrypoints, local server modules, shared runtime contracts, App/main entry files, and lazy dashboard sections are now visible in the coverage report instead of being hidden outside the denominator.
  - `docs/testing.md` documents the broader denominator and clarifies that subprocess-spawned CLI/server paths remain behaviorally covered by integration, background, and Playwright tests even when V8 main-process line attribution stays lower.
  - Dashboard UI, content, animation, runtime API behavior, and production code remain unchanged.
- Validation:
  - `npx vitest run --project unit tests/unit/vitest-coverage-config.test.ts --reporter=verbose`
  - `npm run test:unit:coverage`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run check:deps`
  - `npx vitest run --project architecture --reporter=verbose`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 0 issues

### test-review.md / M-01

- Status: fixed
- Scope: dead hook visibility now has an explicit architecture guardrail. The two originally cited unused hook files, `src/hooks/use-theme.ts` and `src/hooks/use-provider-limits.ts`, had already been removed during the earlier `code-review.md / N-01` cleanup; this phase strengthens the test-review guardrail so the same class of dead runtime hook cannot silently return.
- Guardrails: `tests/architecture/unused-hooks.test.ts` now treats a hook as live only when it is reachable from `src/main.tsx`, rather than merely imported by any production file. A focused synthetic regression covers a dead hook cluster where one unused hook imports another, so future dead-code islands cannot satisfy the guardrail by importing each other.
- Follow-up quality fixes during implementation:
  - `docs/architecture.md` and `docs/testing.md` now describe the hook rule as app-entrypoint reachability, matching the enforced behavior.
  - `dependency-cruiser` remains responsible for dependency boundaries and cycle/orphan visibility, while `npm run test:architecture` owns the precise unused-hook signal that the original finding needed.
  - Dashboard UI, content, animation, runtime API behavior, and production code remain unchanged.
- Validation:
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `git diff --check`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 0 issues, round 2: 0 issues

### test-review.md / M-02

- Status: fixed
- Scope: the highest-cost and hang-prone test paths were split, made deterministic, and given bounded cleanup without changing production behavior. The auto-import singleton integration test now coordinates the fake Toktrack runner through start/release sentinel files instead of a fixed 2-second delay, and the previous background catch-all suite was split into focused background prefix, selection, concurrency, registry, and startup CLI files.
- Guardrails: the `integration-background` Vitest project now allows file-level scheduling with a capped `maxWorkers: 2`, so independent background process tests can overlap without turning the test run into an unbounded process fan-out. `docs/testing.md` now documents deterministic subprocess coordination and small focused background files as the expected pattern.
- Follow-up quality fixes during implementation:
  - The final `npm run test:timings` run now reports the auto-import singleton test at `1.371s` instead of the historical `3.326s`, and `tests/integration/server-auto-import.test.ts` at `2.669s` instead of the historical `4.521s`.
  - The old `tests/integration/server-background.test.ts` monolith no longer dominates as one `5.785s` suite; its formerly mixed cases now appear as focused files, with the slowest background slice at `3.208s` in the final coverage/timing run.
  - Test hangs were addressed at the harness level: server readiness/shutdown probes now have abort timeouts, CLI subprocess helpers have bounded timeouts and SIGKILL fallback, failed standalone server startup cleans up the spawned process, background cleanup force-stops leftover registry PIDs owned by the test root, and shared integration servers now wait for process shutdown in `afterAll`.
  - `tests/unit/server-helpers-runner-process.test.ts` remains intentionally subprocess-backed where shell, `PATH`, timeout, and runner fallback behavior are the thing under test.
  - Dashboard UI, content, animation, runtime API behavior, and production code remain unchanged.
- Validation:
  - `npx vitest run --project integration tests/integration/server-auto-import.test.ts tests/integration/server-startup-cli.test.ts --project integration-background tests/integration/server-background.test.ts tests/integration/server-background-selection.test.ts tests/integration/server-background-concurrency.test.ts tests/integration/server-background-registry.test.ts --reporter=verbose`
  - `npx vitest run --project integration tests/integration/server-auto-import.test.ts tests/integration/server-startup-cli.test.ts tests/integration/server-local-auth.test.ts --project integration-background tests/integration/server-background.test.ts tests/integration/server-background-selection.test.ts tests/integration/server-background-concurrency.test.ts tests/integration/server-background-registry.test.ts --reporter=verbose`
  - `npx vitest run --project integration-background tests/integration/server-background-registry.test.ts --reporter=verbose`
  - `npx vitest run --project integration-background tests/integration/server-background-selection.test.ts --reporter=verbose`
  - `tsc --noEmit`
  - `npx vitest run --project integration --project integration-background --reporter=verbose`
  - `npm run verify:full` -> final run passed, including Playwright `15 passed`
  - `npm run test:timings` -> completed without hanging after the cleanup hardening
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> multiple rounds: 0 issues initially, 4 minor test-harness/test-clarity issues fixed, latest round 0 issues

### test-review.md / M-03

- Status: fixed
- Scope: the Playwright dashboard monolith was split by user journey without changing dashboard runtime behavior. The former `tests/e2e/dashboard.spec.ts` coverage now lives in focused load/upload, forecast/filter, settings/backups, and reporting specs, while command-palette coverage remains separate.
- Guardrails: shared E2E auth, state reset, usage seeding, file upload, mocked auto-import/report, download-recording, and dashboard test-hook access now live in `tests/e2e/helpers.ts`. `docs/testing.md` documents journey-based Playwright files so future browser coverage does not grow back into a catch-all suite.
- Follow-up quality fixes during implementation:
  - The CSP/browser-error smoke coverage moved to `tests/e2e/dashboard-load-upload.spec.ts`, replacing stale references to the removed dashboard monolith.
  - The report-language test now resets both usage and settings before switching locale, making it independent from earlier Playwright file order.
  - The largest dashboard-specific E2E files are now focused around settings/backups and command-palette behavior instead of one mixed dashboard file.
  - The recurring silent coverage/timing hang was traced to Vitest runs that emitted only the JUnit reporter in this non-interactive gate. `test:unit:coverage` and `test:timings` now keep the JUnit artifact and also emit the `dot` reporter, so long coverage runs show progress and finish cleanly instead of depending on a silent reporter path.
  - Dashboard UI, content, animation, runtime API behavior, and production code remain unchanged.
- Validation:
  - `npx vitest run --project unit tests/unit/vitest-coverage-config.test.ts --reporter=verbose` -> passed, including the guardrail for explicit `dot` plus `junit` reporters on coverage-heavy scripts.
  - `npm run test:unit:coverage` -> passed with `135` files, `496` tests passed, `1` skipped, and no silent hang after the reporter fix.
  - `npm run test:timings` -> passed and printed timing diagnostics; the slowest suites remained existing server integration subprocess paths, while the split E2E work is outside this Vitest-only timing gate.
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e` -> passed with `15` Playwright tests after the journey split.
  - `npm run verify:full` -> final run passed, including format, lint, docstring lint, dependency-cruiser, `tsc --noEmit`, architecture tests, coverage, package verification, production build, and Playwright `15 passed`.
  - Targeted Playwright follow-ups passed for `tests/e2e/dashboard-load-upload.spec.ts` and `tests/e2e/dashboard-settings-backups.spec.ts` after CodeRabbit requested locale-resilient label assertions.
  - `git diff --check` -> passed after this validation update.
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> rounds 1 and 3 reported minor test/doc clarity issues that were fixed; rounds 2, 4, and 5 reported 0 issues; round 6 reported this missing validation detail and was fixed by this entry; the follow-up review after the validation update reported 0 issues.

## 2026-04-26

### server-review.md / H-01

- Status: fixed
- Scope: `server.js` was reduced to dependency/runtime wiring during this phase, then further reduced by `server-review.md / M-01` to an executable CLI/Bin shim. CLI parsing/help moved to `server/cli.js`, startup summaries/browser opening/local auth-session metadata moved to `server/startup-runtime.js`, shared process helpers moved to `server/process-utils.js`, and HTTP server lifecycle, CLI routing, startup sequencing, client errors, and shutdown cleanup moved to `server/server-lifecycle.js`.
- Guardrails: `tests/architecture/server-entrypoint-contract.test.ts` blocks local helper function definitions, `__test__` exports, and direct `http.createServer(...)` calls from returning to `server.js`. `tests/unit/server-cli.test.ts`, `tests/unit/startup-runtime.test.ts`, and `tests/unit/server-lifecycle.test.ts` cover the extracted behavior directly. Existing server helper tests now instantiate `server/data-runtime.js` and `server/auto-import-runtime.js` directly instead of importing `server.js`.
- Follow-up quality fixes during implementation:
  - The productive `server.js.__test__` helper surface was removed as part of the Entrypoint split; tests now target the owning runtime modules.
  - The cross-process file-lock test now loads `server/data-runtime.js` directly in its child process, so it still validates real lock behavior without loading the CLI entrypoint.
  - The startup data summary now pluralizes `1 day` versus `N days` correctly without changing the existing cost or token formatting.
  - Background-child shutdown now logs unregister failures, suppresses unhandled promise rejections, exits through a finally-style path, and prevents duplicate shutdown completion when graceful close and forced timeout race.
  - CLI help now documents the supported `-bg` legacy background alias alongside `-b` and `--background`, so displayed usage matches parser behavior.
  - Startup behavior remains intentionally unchanged: auth bootstrap URL output, remote warnings, browser opening, background registration, auto-load logging, package startup, and API routing keep the same runtime contracts.
- Validation:
  - `npx vitest run --project unit tests/unit/server-cli.test.ts tests/unit/startup-runtime.test.ts tests/unit/server-lifecycle.test.ts tests/unit/server-helpers-network.test.ts tests/unit/server-helpers-runner-core.test.ts tests/unit/server-helpers-runner-process.test.ts tests/unit/server-helpers-file-locks.test.ts --reporter=verbose`
  - `npx vitest run --project architecture tests/architecture/server-entrypoint-contract.test.ts --reporter=verbose`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> rounds 1-2: 0 issues; round 3: 2 minor issues fixed; round 4: 1 minor issue fixed

### server-review.md / M-01

- Status: fixed
- Scope: `server.js` is now only the executable CLI/Bin shim. Runtime composition moved to `server/app-runtime.js`, which builds the injected server lifecycle and keeps the background process entrypoint pointed at package-root `server.js`. The undocumented `require('./server.js').bootstrapCli/runCli` import surface was removed; in-process test/server starts now use `createAppRuntime(...)` explicitly.
- Guardrails: `tests/architecture/server-entrypoint-contract.test.ts` now blocks `module.exports`, `exports.*`, local helper functions, `__test__`, direct `http.createServer(...)`, and any `server.js` require target other than `./server/app-runtime`. Playwright's `scripts/start-test-server.js` uses the explicit app-runtime composer so E2E startup still exercises the same server lifecycle without importing the executable shim as a helper module.
- Follow-up quality fixes during implementation:
  - Environment-derived CLI/server configuration now lives inside `createAppRuntime(...)`, so test harnesses can set isolated storage, host, and port environment variables before composing the runtime.
  - `server/app-runtime.js` passes an explicit root `server.js` path to the background runtime, preserving foreground/background CLI behavior after the composition move.
  - `docs/architecture.md` documents the new split between the executable shim and the app-runtime composition root.
  - Dashboard UI, content, animation, API route behavior, local auth, remote auth, background CLI, packaging, and E2E startup behavior remain unchanged.
- Validation:
  - `node -c server.js`
  - `node -c server/app-runtime.js`
  - `npx vitest run --project architecture tests/architecture/server-entrypoint-contract.test.ts --reporter=verbose`
  - `npx vitest run --project unit tests/unit/server-lifecycle.test.ts tests/unit/server-cli.test.ts tests/unit/startup-runtime.test.ts --project integration tests/integration/server-local-auth.test.ts tests/integration/server-remote-auth.test.ts --reporter=verbose`
  - `npx vitest run --project integration-background tests/integration/server-background.test.ts --reporter=verbose`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> multiple rounds: 0 issues

### server-review.md / M-02

- Status: fixed
- Scope: mutable server runtime state is now encapsulated in per-runtime services. `server/runtime-state.js` owns the runtime snapshot, startup auto-load flag, singleton runtime lease, and expiring async cache primitives; `server/app-runtime.js`, `server/server-lifecycle.js`, and `server/startup-runtime.js` use the runtime-state service instead of ad hoc mutable flags; `server/auto-import-runtime.js` owns the Auto-Import lease and Toktrack latest-version cache through those services.
- Guardrails: `tests/unit/runtime-state.test.ts` covers runtime snapshots, startup flag isolation, singleton lease behavior, in-flight lookup deduplication, and TTL/reset behavior. `tests/architecture/server-runtime-state-contract.test.ts` blocks route-local `autoImportStreamRunning` state and the old free Auto-Import/Toktrack cache variables from returning.
- Follow-up quality fixes during implementation:
  - `server/http-router.js` no longer owns an Auto-Import stream flag. It acquires a lease before sending SSE headers, so concurrent starts still return the existing HTTP `409` response without turning into streamed errors.
  - `server/auto-import-runtime.js` remains the owner of Auto-Import execution, but the singleton state is now an explicit lease with idempotent release for normal completion, failures, and aborted streams.
  - Toktrack latest-version lookups still share one in-flight request and keep separate success/failure TTL behavior, but the cache/promise state is hidden behind `createExpiringAsyncCache(...)`.
  - Dashboard UI, content, animation, API paths, response shapes, local auth, remote auth, background startup, and E2E startup behavior remain unchanged.
- Validation:
  - `node -c server/runtime-state.js`
  - `node -c server/app-runtime.js`
  - `node -c server/auto-import-runtime.js`
  - `node -c server/http-router.js`
  - `npx vitest run --project unit tests/unit/runtime-state.test.ts tests/unit/server-lifecycle.test.ts tests/unit/startup-runtime.test.ts tests/unit/server-helpers-runner-process.test.ts --project architecture tests/architecture/server-entrypoint-contract.test.ts tests/architecture/server-runtime-state-contract.test.ts --reporter=verbose`
  - `npx vitest run --project integration tests/integration/server-auto-import.test.ts tests/integration/server-api-routing-runtime.test.ts tests/integration/server-local-auth.test.ts tests/integration/server-remote-auth.test.ts --project integration-background tests/integration/server-background.test.ts --reporter=verbose`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> multiple rounds: 0 issues

### server-review.md / N-01

- Status: fixed
- Scope: Host, Origin, Sec-Fetch-Site, and JSON content-type request policy moved from the broader HTTP utility module into `server/http-request-guards.js`. `server/http-utils.js` remains the compatible facade for router consumers and still owns request body parsing, JSON responses, buffer responses, and API-prefix resolution.
- Guardrails: `tests/unit/http-request-guards.test.ts` covers loopback, wildcard, non-loopback, IPv6, origin, cross-site, and content-type behavior directly. `tests/unit/http-utils.test.ts` now focuses on the HTTP facade and body/response behavior. `tests/architecture/server-http-boundaries.test.ts` keeps request guard policy out of the router and out of generic HTTP utility internals.
- Follow-up quality fixes during implementation:
  - The request guard code now tolerates missing `req.headers` defensively while preserving the same rejection path for malformed or missing Host/Origin input.
  - Wildcard binds now apply the intended socket-local host check before exact bind-host matching, so `Host: 0.0.0.0` is not treated as a trusted client-facing host.
  - Body-size and response-header behavior gained focused unit coverage, so the split did not trade broad utility tests for narrower policy-only tests.
  - Dashboard UI, content, animation, API paths, response shapes, local auth, remote auth, background startup, and E2E startup behavior remain unchanged.
- Validation:
  - `node -c server/http-request-guards.js`
  - `node -c server/http-utils.js`
  - `npx vitest run --project unit tests/unit/http-request-guards.test.ts tests/unit/http-utils.test.ts --project architecture tests/architecture/server-http-boundaries.test.ts tests/architecture/server-entrypoint-contract.test.ts tests/architecture/server-runtime-state-contract.test.ts --reporter=verbose`
  - `npx vitest run --project integration tests/integration/server-api-guards.test.ts tests/integration/server-remote-auth.test.ts --reporter=verbose`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> multiple rounds: 0 issues

## 2026-04-25

### security-review.md / H-01

- Status: fixed
- Scope: explicit non-loopback binding now requires `TTDASH_REMOTE_TOKEN` in addition to `TTDASH_ALLOW_REMOTE=1`. Remote API requests are authenticated centrally before route handling through Bearer auth, `X-TTDash-Remote-Token`, or an HttpOnly same-site cookie; the later `security-review.md / M-01` fix extends the same auth boundary to default loopback sessions.
- Guardrails: `tests/unit/remote-auth.test.ts` covers remote-mode configuration, accepted credential forms, generic rejection paths, timing-safe length-independent comparison behavior, and the browser bootstrap redirect/cookie contract. `tests/integration/server-remote-auth.test.ts` covers failed startup without a token, protected remote API reads, cookie bootstrap, and preserved Origin mutation guards. Existing server guard tests continue to cover host validation, malformed paths, oversized payloads, and cross-site rejection.
- Follow-up quality fixes during implementation:
  - Remote authentication lives in `server/remote-auth.js` as a focused server boundary, while `server/http-router.js` only applies the injected gate before API routing and static bootstrap handling.
  - Remote API access is supported through Bearer auth, `X-TTDash-Remote-Token`, or an explicit `ttdash_auth` cookie. The automatic `?ttdash_token=...` bootstrap-to-cookie redirect is a local-session flow, not the current remote-mode browser flow; `tests/integration/server-remote-auth.test.ts` locks that remote query bootstrap does not set a cookie.
  - Background runtime identity checks now send the remote Bearer header when the parent process is running in authenticated remote mode, so remote background management keeps working.
  - Startup help and remote warnings now mention the additional token requirement without logging the token value.
- Validation:
  - `npx vitest run --project unit tests/unit/remote-auth.test.ts tests/unit/http-utils.test.ts tests/unit/background-runtime.test.ts --reporter=verbose`
  - `npx vitest run --project integration tests/integration/server-remote-auth.test.ts tests/integration/server-api-guards.test.ts --reporter=verbose`
  - `npx vitest run --project integration-background tests/integration/server-background.test.ts --reporter=verbose`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 0 issues, round 3: 0 issues, round 4: 0 issues

### security-review.md / M-01

- Status: fixed
- Scope: default loopback servers now generate a per-start local session token and require authentication for every API endpoint, including `/api/usage`, `/api/settings`, `/api/runtime`, and `/api/toktrack/version-status`. Normal dashboard startup stays frictionless because the auto-open URL carries the one-time bootstrap token, which is exchanged for an HttpOnly/SameSite cookie and stripped from the redirected URL.
- Guardrails: `tests/unit/remote-auth.test.ts` covers default local session auth, generated local tokens, explicit test opt-out, shared credential parsing, bootstrap redirects, and generic rejection paths. `tests/integration/server-local-auth.test.ts` covers protected loopback reads, Bearer and cookie access, preserved mutation Origin guards, and restrictive auth-session file permissions. Existing remote, background, persistence, recovery, routing, and E2E tests were updated to authenticate through the same boundary.
- Follow-up quality fixes during implementation:
  - The existing `server/remote-auth.js` boundary now owns both local session auth and remote auth so API route handlers stay unaware of the source of the credential.
  - `server.js` writes the local session metadata to restrictive user config state and prints a `Local Auth URL` only when browser auto-open is disabled.
  - Background instance registry entries now carry per-instance auth headers and bootstrap URLs so `ttdash stop`, registry pruning, and no-open background starts remain usable.
  - Playwright and integration test helpers bootstrap through the same local session file instead of bypassing the production auth path.
- Residual risk:
  - This protects the local HTTP API from unauthenticated loopback access, browser/DNS-rebinding-style access, and other OS users. It does not fully isolate against malware already running as the same OS user, which can target user config files, terminal output, or browser state.
- Validation:
  - `npx vitest run --project unit tests/unit/remote-auth.test.ts tests/unit/background-runtime.test.ts --reporter=verbose`
  - `npx vitest run --project integration tests/integration/server-local-auth.test.ts tests/integration/server-api-guards.test.ts tests/integration/server-api-persistence.test.ts tests/integration/server-api-routing-runtime.test.ts tests/integration/server-api-recovery.test.ts tests/integration/server-remote-auth.test.ts --reporter=verbose`
  - `npx vitest run --project integration-background tests/integration/server-background.test.ts --reporter=verbose`
  - `PLAYWRIGHT_TEST_PORT=3020 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:package`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 0 issues, round 3: 2 minor documentation issues fixed, round 4: 0 issues

### security-review.md / N-01

- Status: fixed
- Scope: the server CSP no longer allows `unsafe-inline` styles. Shared security headers now live in `server/security-headers.js`, HTML responses get a per-response CSP nonce plus a matching `ttdash-csp-nonce` meta tag, `style-src-elem` is limited to `self` and the nonce, and `style-src-attr 'none'` blocks literal inline style attributes.
- Guardrails: `tests/unit/security-headers.test.ts` covers CSP construction, nonce shape, nonce meta injection, HTML response preparation, and non-HTML header behavior. `tests/integration/server-api-guards.test.ts` checks the strict CSP on authenticated API responses. `tests/e2e/dashboard-load-upload.spec.ts` verifies that the loaded dashboard HTML carries the nonce-backed CSP and that the browser reports no CSP errors while the main dashboard journey runs.
- Follow-up quality fixes during implementation:
  - CSP generation moved out of `server.js`, so future header changes have a focused unit-testable boundary.
  - `server/http-router.js` now treats HTML static responses separately from other assets, allowing nonce-specific headers without weakening API, JSON, CSS, or JS asset responses.
  - React/Recharts/Motion JS-driven style property updates remain allowed because the browser-enforced risk path for this finding is literal inline style attributes or inline style elements; preserving those runtime style properties avoids UI and animation regressions without reintroducing `unsafe-inline`.
- Validation:
  - `npx vitest run --project unit tests/unit/security-headers.test.ts --reporter=verbose`
  - `npx vitest run --project integration tests/integration/server-api-guards.test.ts --reporter=verbose`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 1 minor grammar issue in `docs/application-stack-reference.md` fixed, round 3: 0 issues

### performance-review.md / H-01

- Status: fixed
- Scope: secondary cost-analysis charts now leave the initial dashboard bundle and load through the section warmup path. Dashboard sections also get an adaptive, deduplicated preload scheduler that starts visible lazy section chunks shortly after the first render and keeps IntersectionObserver preloading far enough ahead of the viewport to avoid visible lazy-loading gaps while scrolling.
- Guardrails: `tests/frontend/dashboard-motion.test.tsx` covers idle/fallback scheduling, deduplication, cancellation, early preloading, and inert hidden content. `tests/unit/dashboard-section-preloading.test.ts` covers visible-section queue ordering, hidden/request-data gating, and duplicate task removal.
- Follow-up quality fixes during implementation:
  - Cost-analysis entry charts (`CostOverTime`, `CostByModel`) were moved from static dashboard imports to lazy chunks, reducing the built main `index` chunk from roughly `212 kB` raw / `57 kB` gzip to roughly `198 kB` raw / `53 kB` gzip.
  - The warmup scheduler now uses a short idle timeout with bounded parallelism so deeper sections are warmed without waiting for late viewport proximity.
  - Section placeholders for deeper analysis/table areas now better match final section heights, preventing scroll-command layout shift while lazy chunks complete above the target section.
- Validation:
  - `npm run test:unit -- tests/frontend/dashboard-motion.test.tsx tests/unit/dashboard-section-preloading.test.ts`
  - `npx playwright test tests/e2e/command-palette.spec.ts -g "executes analysis section navigation commands"`
  - `npm run lint`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `tsc --noEmit`
  - `npm run build:app`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 0 issues, round 3: 0 issues

### performance-review.md / M-01

- Status: fixed
- Scope: dashboard filter changes now flow through a centralized `deriveDashboardFilterData(...)` pass that derives date/month filtering, provider/model filtering, available filter options, date range, and view-mode aggregation behind the stable `useDashboardFilters` contract. Computed dashboard summaries now share one normalized breakdown aggregation for model costs, provider metrics, and model options behind the stable `useComputedMetrics` contract.
- Guardrails: `tests/unit/dashboard-filter-data.test.ts` compares the new filter derivation with the previous staged semantics across representative filter combinations and empty states. `tests/unit/dashboard-aggregation.test.ts` locks normalized model/provider aggregation and day counting. `tests/frontend/use-computed-metrics.test.tsx` covers the public computed-metrics hook boundary.
- Follow-up quality fixes during implementation:
  - `src/lib/dashboard-filter-data.ts` imports directly from the shared dashboard-domain contract instead of routing through broader frontend transform helpers, keeping the hook dependency graph smaller and the architecture layer test below its timeout budget.
  - `src/lib/data-transforms.ts` now fills scalar chart arrays and model-name discovery in one sorted-data pass instead of separate `map(...)` and `flatMap(...)` passes.
  - `computeModelCosts(...)` and `computeProviderMetrics(...)` now delegate to the shared breakdown summary, so standalone calculation callers and dashboard hook callers use the same aggregation path.
  - After CodeRabbit review, computed `allModels` now unions `modelsUsed` and `modelBreakdowns`, so inconsistent imported data can no longer hide a breakdown-backed model from the model-over-time chart while existing modelsUsed-only behavior remains preserved.
- Validation:
  - `npm run test:unit -- tests/unit/dashboard-filter-data.test.ts tests/unit/dashboard-aggregation.test.ts tests/frontend/use-computed-metrics.test.tsx tests/frontend/use-dashboard-filters.test.tsx tests/unit/analytics.test.ts tests/unit/data-transforms.test.ts tests/unit/code-rabbit-phase4.test.ts`
  - `npm run test:unit -- tests/unit/dashboard-aggregation.test.ts tests/frontend/use-computed-metrics.test.tsx tests/unit/analytics.test.ts`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full` -> completed after the CodeRabbit follow-up fix
  - `npm run test:timings` -> completed after the CodeRabbit follow-up fix
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 1 minor issue fixed, round 3: 0 issues, round 4: 0 issues

### performance-review.md / M-02

- Status: fixed
- Scope: the Settings dialog no longer starts `/api/toktrack/version-status` when it opens. The dashboard shell now schedules one cancellable, idle-friendly toktrack latest-version warmup per browser session through `src/lib/toktrack-version-status.ts`, and the settings version hook only formats the shared session snapshot for the Maintenance tab.
- Guardrails: `tests/unit/toktrack-version-status.test.ts` covers the pinned initial snapshot, concurrent warmup deduplication, cached failure behavior, scheduled fallback warmup, and cancellation. `tests/frontend/settings-modal-version-status.test.tsx` covers warmed status rendering without a dialog-open fetch, the no-fetch dialog-open path, and cached failure reuse across reopen. `tests/frontend/dashboard-filter-visibility.test.tsx` covers that the dashboard shell wires the session warmup scheduler.
- Follow-up quality fixes during implementation:
  - `docs/architecture.md` now documents the session-wide toktrack version status cache as the owner of lookup state, while the settings modal hook is only the presentation adapter.
  - Dashboard tests mock the warmup scheduler explicitly so future dashboard renders cannot accidentally perform real toktrack version network work during component tests.
  - The server `/api/toktrack/version-status` contract and existing server-side success/failure TTL cache remain unchanged, so the fix changes when the UI asks for the status, not how the status is resolved.
- Validation:
  - `npm run test:unit -- tests/unit/toktrack-version-status.test.ts tests/frontend/settings-modal-version-status.test.tsx tests/frontend/settings-modal-tabs.test.tsx tests/frontend/dashboard-filter-visibility.test.tsx tests/frontend/dashboard-error-state.test.tsx tests/unit/api.test.ts`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 0 issues, round 3: 0 issues

### performance-review.md / N-01

- Status: fixed
- Scope: complex dashboard UI islands now separate calculation-heavy view data from rendering, accessibility, and motion. Drilldown details, heatmap grids, request-quality ratios, sortable table rows, recent-day benchmarks, and date-picker calendar navigation are derived through focused `src/lib/*-data.ts` helpers while the existing frontend functionality, visual structure, and animations stay unchanged.
- Guardrails: new unit suites cover drilldown aggregation/rankings/token segments, heatmap grid and keyboard target derivation, request-quality ratios/progress, table sort/row derivation, and date-picker calendar actions. Existing frontend suites still cover the DOM, ARIA, keyboard, and motion contracts for the touched components.
- Follow-up quality fixes during implementation:
  - React component tests for heatmap and drilldown were narrowed to visible UI/A11y contracts after the derived branches moved to fast unit coverage, and over-broad timeout overrides were removed from sortable table tests.
  - `docs/architecture.md` now documents the non-presentational data-derivation helpers as the boundary for complex dashboard UI islands.
  - `npm run test:timings` shows the new helper suites stay out of the slowest-suite list; the remaining slow entries are existing integration, motion, settings, and broad table/UI interaction paths.
- Validation:
  - `npx vitest run --project unit tests/unit/drill-down-data.test.ts tests/unit/heatmap-calendar-data.test.ts tests/unit/request-quality-data.test.ts tests/unit/sortable-table-data.test.ts tests/unit/filter-date-picker-data.test.ts tests/unit/recent-days-reveal.test.ts --reporter=verbose`
  - `npx vitest run --project frontend tests/frontend/drill-down-modal-content.test.tsx tests/frontend/drill-down-modal-motion.test.tsx tests/frontend/heatmap-calendar-accessibility.test.tsx tests/frontend/request-quality.test.tsx tests/frontend/sortable-table-provider-model.test.tsx tests/frontend/sortable-table-recent-days.test.tsx tests/frontend/filter-bar-date-picker.test.tsx --reporter=verbose`
  - `npm run format:check`
  - `npm run lint`
  - `tsc --noEmit`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files ...` -> round 1: 0 issues, round 2: 0 issues

### dashboard-review.md / N-02

- Status: fixed
- Scope: `src/components/dashboard/DashboardSections.tsx` already consumes a single structured `DashboardSectionsViewModel`, and `src/types/dashboard-view-model.d.ts` keeps the section data split into named section bundles instead of flat dashboard props. This closes the original broad `DashboardSectionsProps` concern without changing visible dashboard functionality, content, UI, or animations.
- Guardrails: `tests/architecture/dashboard-sections-contract.test.ts` now locks the public `DashboardSections` prop contract to one `viewModel` prop and keeps `DashboardSectionsViewModel` split into the intended layout, analysis, table, comparison, and interaction bundles.
- Follow-up quality fixes during implementation:
  - No production refactor was needed because the broader view-model boundary had already been introduced by `architecture-review.md / M-01`; this change adds a targeted regression guardrail so future section work does not reintroduce wide flat props.
  - `docs/architecture.md` already documents the intended DashboardSections boundary, so no duplicate architecture text was added.
- Validation:
  - `npm run test:architecture`
  - `npm run test:unit -- tests/frontend/dashboard-filter-visibility.test.tsx`
  - `tsc --noEmit`
  - `npm run lint`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings` -> attempted twice; both runs failed under external CPU pressure with migrating 5s timeouts in existing unrelated frontend suites, while `npm run verify:full` had just completed the same coverage test set successfully; the new architecture guardrail itself stayed below 100ms in `npm run test:architecture`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files docs/review/fixed-findings.md tests/architecture/dashboard-sections-contract.test.ts` -> 0 issues

## 2026-04-24

### dashboard-review.md / N-01

- Status: fixed
- Scope: the dashboard action landscape now separates everyday data loading, export/use actions, and maintenance actions in the header, while the Command Palette mirrors the same intent split for load data, exports, and maintenance. Existing actions and command IDs remain available.
- Guardrails: `tests/frontend/header-links.test.tsx` covers localized header action groups and preserved button access, while `tests/frontend/command-palette-action-groups.test.tsx` covers localized Command Palette groups and stable command IDs.
- Follow-up quality fixes during implementation:
  - Header action rendering is now owned by a private `HeaderActions` composition inside `Header.tsx`, keeping the global header shell separate from action information architecture.
  - Command Palette action commands are grouped by intent instead of sharing one broad `Actions` bucket, without changing command handlers or `data-testid` contracts.
- Validation:
  - `npm run test:unit -- tests/frontend/header-links.test.tsx tests/frontend/command-palette-action-groups.test.tsx`
  - `npx playwright test tests/e2e/command-palette.spec.ts`
  - `tsc --noEmit`
  - `npm run lint`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md -f ...` -> only reported unrelated untracked `docs/application-stack-reference.md`; the file was not changed
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir src/components` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir tests/frontend` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir shared/locales` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir docs/review` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files docs/architecture.md` -> 0 issues

### dashboard-review.md / M-02

- Status: fixed
- Scope: `src/components/layout/FilterBar.tsx` was reduced to a composition shell over private filter groups for status, time presets, date range, and provider/model chips. The visible dashboard filtering capabilities remain intact while the bar now shows lightly grouped Time, Date range, Providers, and Models areas.
- Guardrails: `tests/frontend/filter-bar-accessibility.test.tsx` covers localized filter groups, while the existing date-picker and preset/chip suites continue to lock keyboard focus, date clearing, preset highlighting, and chip `aria-pressed`/visual states. `.dependency-cruiser.cjs` now keeps the new FilterBar internals private to the FilterBar shell.
- Follow-up quality fixes during implementation:
  - The custom date picker logic now lives in `FilterBarDateRange.tsx`, isolating its portal, overlay positioning, keyboard navigation, and focus restoration from the main filter shell.
  - Provider and model chip rendering now lives in `FilterBarChipFilters.tsx`, keeping provider badge styling and model color state local to chip filters.
  - Provider badge alpha variants now flow through `getProviderBadgeStyle(...)`, so included provider chips no longer parse or mutate CSS strings in the UI.
  - Date-picker calendar labels now recompute from the active locale while the picker is open, and weekday cells use stable keys.
- Validation:
  - `npm run test:unit -- tests/frontend/filter-bar-accessibility.test.tsx tests/frontend/filter-bar-date-picker.test.tsx tests/frontend/filter-bar-presets.test.tsx tests/unit/model-colors.test.ts`
  - `tsc --noEmit`
  - `npm run lint`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md -f ...` -> fixed relevant minor findings for weekday keys, provider badge alpha handling, locale-reactive calendar labels, and included-chip style collisions; remaining global uncommitted finding is isolated to unrelated untracked `docs/application-stack-reference.md`.
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir src/components/layout` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir src/lib` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir tests` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir shared` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --dir docs/review` -> 0 issues
  - `coderabbit review --agent -t uncommitted -c AGENTS.md --files .dependency-cruiser.cjs` -> 0 issues

### dashboard-review.md / M-01

- Status: fixed
- Scope: `src/components/features/settings/SettingsModal.tsx` was changed from one long settings surface into a tabbed workspace with Basics, Layout, Limits, and Maintenance areas. Existing settings capabilities remain available, but day-to-day preferences are separated from section layout, provider limits, and backup/version-maintenance actions.
- Guardrails: `tests/frontend/settings-modal-tabs.test.tsx` covers default tab state, section grouping, and keyboard navigation, while the existing focused settings suites now exercise their sections through the relevant tab. `docs/architecture.md` documents the tabbed settings shell and split motion/toktrack version ownership.
- Follow-up quality fixes during implementation:
  - `SettingsModalSections.tsx` now separates the reduced-motion card from the toktrack version-status card so Maintenance can own diagnostic/version information without mixing it into daily dashboard behavior settings.
  - `SettingsModal.tsx` now resets the active settings tab while the dialog is closed, so reopening the dialog always starts from Basics without a transient stale tab render.
  - `tests/e2e/command-palette.spec.ts` now splits the formerly near-timeout section-navigation coverage into smaller scroll, dashboard-section, and analysis-section tests after the full gate exposed the old monolithic test as a reliability/performance risk.
- Validation:
  - `npm run test:unit -- tests/frontend/settings-modal-tabs.test.tsx tests/frontend/settings-modal-language.test.tsx tests/frontend/settings-modal-version-status.test.tsx tests/frontend/settings-modal-defaults.test.tsx tests/frontend/settings-modal-sections.test.tsx tests/frontend/settings-modal-backups.test.tsx tests/frontend/settings-modal-provider-limits.test.tsx tests/frontend/settings-modal-draft-state.test.tsx`
  - `npx playwright test tests/e2e/command-palette.spec.ts`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 0 issues, round 2: 0 issues, round 3: 0 issues

### code-review.md / N-01

- Status: fixed
- Scope: removed the unused `src/hooks/use-theme.ts` and `src/hooks/use-provider-limits.ts` files. Their active responsibilities already live in the persisted settings flow: theme application goes through `applyTheme` and dashboard controller effects, while provider-limit synchronization goes through `useAppSettings` and `syncProviderLimits`.
- Guardrails: `tests/architecture/unused-hooks.test.ts` now fails when a production hook file under `src/hooks/` has no production import, and `docs/architecture.md` plus `docs/testing.md` document that unused hook helpers should be removed instead of retained as speculative code.
- Follow-up quality fixes during implementation:
  - The guardrail covers the same dead-hook visibility gap that made the original `0%` coverage files easy to miss, so future unused hook files are caught by `npm run test:architecture`.
- Validation:
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run test:unit -- tests/frontend/react-query-hooks.test.tsx tests/frontend/dashboard-controller-state.test.tsx tests/frontend/dashboard-controller-actions.test.tsx`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: blocked by CodeRabbit rate limit (`Rate limit exceeded`, retry window reported by the CLI: `47 minutes and 10 seconds`)

### code-review.md / M-01

- Status: fixed
- Scope: dashboard date preset behavior is centralized in the shared dashboard preferences contract. `src/hooks/use-dashboard-filters.ts` applies presets through `resolveDashboardPresetRange`, and `src/components/layout/FilterBar.tsx` derives the active UI state through `resolveDashboardActivePreset`; both flow through `src/lib/dashboard-preferences.ts` to `shared/dashboard-preferences.js`, so applying and displaying presets no longer duplicate the `7d`, `30d`, `month`, `year`, and `all` rules.
- Guardrails: `tests/unit/dashboard-preferences.test.ts` locks the shared/frontend preset contract, while `tests/frontend/use-dashboard-filters.test.tsx` and `tests/frontend/filter-bar-presets.test.tsx` cover applying presets in the hook and highlighting them in the filter bar.
- Follow-up quality fixes during implementation:
  - No production or test changes were needed for this finding because the shared preset contract and focused regression coverage already existed; the fix was to document the concrete `code-review.md / M-01` reference as closed.
- Validation:
  - `npm run test:unit -- tests/unit/dashboard-preferences.test.ts tests/frontend/use-dashboard-filters.test.tsx tests/frontend/filter-bar-presets.test.tsx`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run verify:full`
  - `npm run test:timings`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 2 minor documentation issues, fixed
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 2: blocked by CodeRabbit rate limit (`Rate limit exceeded`, retry window reported by the CLI: `57 minutes and 23 seconds`)

### code-review.md / M-02

- Status: fixed
- Scope: `src/components/features/settings/SettingsModal.tsx` was reduced from the former 1000+ line all-in-one dialog into a shell/composition root over extracted settings sections, a draft-state hook, a version-status hook, and modal-local helper logic. The visible settings areas now live behind `src/components/features/settings/SettingsModalSections.tsx`, while the draft/save/reset behavior moved into `use-settings-modal-draft.ts` and the toktrack lookup behavior moved into `use-settings-modal-version-status.ts`.
- Guardrails: `docs/architecture.md` now documents the settings modal shell, internal section bundle, and private helper hooks as a feature-internal composition boundary, and `.dependency-cruiser.cjs` now blocks unrelated frontend modules from importing `SettingsModalSections.tsx`, `use-settings-modal-draft.ts`, `use-settings-modal-version-status.ts`, or `settings-modal-helpers.ts` directly.
- Follow-up quality fixes during implementation:
  - `src/components/features/settings/settings-modal-helpers.ts` now owns the extracted number parsing, selection normalization, provider-limit draft building/patching, and section reorder helpers so tests no longer import utility behavior through the UI shell.
  - `use-settings-modal-draft.ts` now clones incoming section drafts and patches empty provider configs from `DEFAULT_PROVIDER_LIMIT_CONFIG`, preserving the previous provider-limit safety behavior after the refactor.
  - `use-settings-modal-draft.ts` now initializes modal drafts once per open session and resets that guard on close, so external prop churn can no longer overwrite in-progress edits while the dialog remains open.
  - `tests/unit/settings-modal-helpers.test.ts` now covers the extracted settings helpers directly, and `tests/unit/code-rabbit-phase1.test.ts` was narrowed back to the unrelated chart/auto-import helpers it actually owns.
  - `tests/frontend/settings-modal-defaults.test.tsx`, `settings-modal-sections.test.tsx`, `settings-modal-backups.test.tsx`, `settings-modal-provider-limits.test.tsx`, and `settings-modal-draft-state.test.tsx` now split the modal coverage by responsibility instead of adding another broad catch-all dialog suite.
- Validation:
  - `npm run test:unit -- tests/unit/settings-modal-helpers.test.ts tests/unit/code-rabbit-phase1.test.ts tests/frontend/settings-modal-language.test.tsx tests/frontend/settings-modal-version-status.test.tsx tests/frontend/settings-modal-defaults.test.tsx tests/frontend/settings-modal-sections.test.tsx tests/frontend/settings-modal-backups.test.tsx tests/frontend/settings-modal-provider-limits.test.tsx`
  - `npm run check`
  - `npm run test:architecture`
  - `npm run test:timings`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run verify:release`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 1 minor issue, fixed (draft state no longer reinitializes while the modal stays open; `tests/frontend/settings-modal-draft-state.test.tsx` added)
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 2: blocked by CodeRabbit rate limit (`Rate limit exceeded`, retry window reported by the CLI: `54 minutes and 32 seconds`)

### code-review.md / H-01

- Status: fixed
- Scope: `src/hooks/use-dashboard-controller.ts` was reduced from the remaining god-hook into a composition root over focused internal controller slices. The heavy derived state, browser IO, dialog ownership, drill-down navigation, shell/load state, and imperative dashboard actions now live in `src/hooks/use-dashboard-controller-actions.ts`, `use-dashboard-controller-browser.ts`, `use-dashboard-controller-derived-state.ts`, `use-dashboard-controller-dialogs.ts`, `use-dashboard-controller-drill-down.ts`, `use-dashboard-controller-effects.ts`, and `use-dashboard-controller-shell-state.ts`, while the public controller contract stayed stable through `src/hooks/use-dashboard-controller.ts`.
- Guardrails: `docs/architecture.md` now documents the internal dashboard controller slices and the browser-IO helper as private implementation details behind the public controller hook, and `.dependency-cruiser.cjs` now blocks component-level fanout to the internal `use-dashboard-controller-*.ts` slices while keeping the intentional type-only controller contract out of the orphan warning path.
- Follow-up quality fixes during implementation:
  - `tests/frontend/dashboard-controller-browser.test.tsx` now locks the extracted browser helper responsibilities for JSON downloads, section scrolling, and the test-only `openSettings` bridge.
  - `tests/frontend/dashboard-controller-drill-down.test.tsx` now covers the extracted drill-down slice directly, including the edge case where the selected day disappears after filtering changes.
  - `src/hooks/use-dashboard-controller-actions.ts` now uses the upload-specific fallback toast (`api.uploadFailed`) after a successful JSON parse when the backend rejects a usage upload without an `Error` instance, and `tests/frontend/dashboard-error-state.test.tsx` covers that regression explicitly.
  - `npm run test:timings` showed no new performance hotspot in the touched dashboard/controller suites; the new slice tests stay sub-100ms and the existing dashboard controller/public-shell tests remained fast.
- Validation:
  - `npm run check`
  - `npm run test:architecture`
  - `npm run test:timings`
  - `npm run test:unit -- tests/frontend/dashboard-controller-browser.test.tsx tests/frontend/dashboard-controller-drill-down.test.tsx tests/frontend/dashboard-controller-state.test.tsx tests/frontend/dashboard-controller-actions.test.tsx tests/frontend/dashboard-filter-visibility.test.tsx tests/frontend/dashboard-error-state.test.tsx`
  - `npm run test:unit -- tests/frontend/dashboard-error-state.test.tsx tests/frontend/dashboard-controller-actions.test.tsx tests/frontend/dashboard-controller-browser.test.tsx`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run verify:release`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 1 minor issue, fixed (`api.uploadFailed` fallback for backend upload rejection after successful JSON parse)
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 2: blocked by CodeRabbit rate limit (`Rate limit exceeded`, retry window reported by the CLI: `52 minutes and 50 seconds`)

## 2026-04-23

### architecture-review.md / H-01

- Status: fixed
- Scope: `server.js` was reduced to the CLI/bootstrap and runtime composition root; subsystem logic moved into `server/data-runtime.js`, `server/background-runtime.js`, `server/auto-import-runtime.js`, and `server/http-router.js`.
- Guardrails: `docs/architecture.md` now documents the server split, `.dependency-cruiser.cjs` prevents runtime modules from coupling back to `server.js`, the router, or each other, and `tests/unit/background-runtime.test.ts` locks the background registry snapshot behavior that was tightened during the review cycle.
- Follow-up quality fixes during implementation:
  - `server/background-runtime.js`: removed a snapshot TOCTOU re-read so background pruning now decides cleanup from one captured registry read.
  - `src/components/layout/FilterBar.tsx`: added cleanup for queued focus-restoration callbacks; `tests/frontend/filter-bar-date-picker.test.tsx` now covers the unmount path that was causing the flaky date-picker teardown in Playwright.
- Validation:
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm run test:unit -- tests/unit/server-helpers-network.test.ts tests/unit/server-helpers-runner-core.test.ts tests/unit/server-helpers-runner-process.test.ts tests/unit/server-helpers-file-locks.test.ts tests/integration/server-auto-import.test.ts tests/integration/server-background.test.ts tests/integration/server-api-guards.test.ts`
  - `npm run verify:full`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 1 minor issue, round 2: 0 issues

### architecture-review.md / H-02

- Status: fixed
- Scope: the duplicated client/server settings contract was consolidated into `shared/app-settings.js` with typed declarations in `shared/app-settings.d.ts`; frontend adapters in `src/lib/app-settings.ts`, `src/lib/dashboard-preferences.ts`, and `src/lib/provider-limits.ts` now consume that shared contract, and `server/data-runtime.js` now normalizes persisted settings through the same source.
- Guardrails: `docs/architecture.md` now documents `shared/app-settings.js` as the single production source for persisted settings defaults and normalization, `.dependency-cruiser.cjs` blocks bypassing that contract from `server.js`, `server/data-runtime.js`, and `src/lib/app-settings.ts`, and `vitest.config.ts` now includes `shared/app-settings.js` in coverage reporting.
- Follow-up quality fixes during implementation:
  - `tests/unit/app-settings-contract.test.ts`: locks the shared/frontend contract alignment for defaults, fragment normalization, persisted settings normalization, and runtime-only flags.
  - `tests/integration/server-api-imports.test.ts`: now asserts the normalized settings-import response instead of only the status code.
  - `tests/integration/server-api-persistence.test.ts` and `tests/frontend/settings-modal-test-helpers.tsx`: now derive defaults from the shared settings contract instead of re-hardcoding them in tests.
  - `tests/unit/background-runtime.test.ts`: cleaned up type-only imports to keep the repo lint/type gates green after the shared typings were added.
- Validation:
  - `npm run check`
  - `npm run test:architecture`
  - `npm run test:unit -- tests/unit/app-settings-contract.test.ts tests/unit/api.test.ts tests/unit/dashboard-preferences.test.ts tests/integration/server-api-persistence.test.ts tests/integration/server-api-imports.test.ts`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:unit:coverage`
  - `npm run build:app`
  - `npm run verify:package`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 0 issues, round 2: 0 issues

### architecture-review.md / M-01

- Status: fixed
- Scope: the dashboard orchestration was cut from a broad flat controller surface into focused view-model bundles in `src/hooks/use-dashboard-controller.ts`; `src/components/Dashboard.tsx` now consumes `header`, `filterBar`, `sections`, `settingsModal`, `dialogs`, `commandPalette`, `report`, and shell bundles instead of forwarding dozens of individual fields, and `src/components/dashboard/DashboardSections.tsx` now consumes one structured `DashboardSectionsViewModel`.
- Guardrails: `src/types/dashboard-view-model.d.ts` now owns the shared frontend-only dashboard view-model contracts, `docs/architecture.md` documents `Dashboard.tsx` as the controller composition root, and `.dependency-cruiser.cjs` now blocks component-subtree fanout to `src/hooks/use-dashboard-controller.ts`.
- Follow-up quality fixes during implementation:
  - `src/components/layout/Header.tsx`, `src/components/layout/FilterBar.tsx`, `src/components/features/command-palette/CommandPalette.tsx`, and `src/components/features/settings/SettingsModal.tsx` now type their props from the shared dashboard view-model contracts instead of re-declaring local prop shapes.
  - `tests/frontend/dashboard-controller-test-helpers.ts` now provides bundle-based controller and section factories, so dashboard composition tests no longer rebuild a flat mega-mock.
  - `tests/frontend/dashboard-controller-actions.test.tsx` now covers drill-down navigation from the controller-owned dialog bundle, locking the logic that moved out of `Dashboard.tsx`.
  - `tests/frontend/dashboard-filter-visibility.test.tsx` now also asserts that `DashboardSections` receives a structured `viewModel` bundle instead of flat section props.
- Validation:
  - `npm run check`
  - `npm run test:architecture`
  - `npm run test:unit -- tests/frontend/dashboard-controller-state.test.tsx tests/frontend/dashboard-controller-actions.test.tsx tests/frontend/dashboard-filter-visibility.test.tsx`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:unit:coverage`
  - `npm run build:app`
  - `npm run verify:package`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 0 issues, round 2: 0 issues

### architecture-review.md / M-02

- Status: fixed
- Scope: dashboard preset, section, and settings-adjacent UI rules now flow through `shared/dashboard-preferences.js` with declarations in `shared/dashboard-preferences.d.ts`; `shared/app-settings.js` consumes that shared contract, `src/lib/dashboard-preferences.ts` was reduced to a thin adapter, and the duplicated preset semantics were removed from `src/hooks/use-dashboard-filters.ts` and `src/components/layout/FilterBar.tsx`.
- Guardrails: `docs/architecture.md` now documents the shared dashboard contract separately from the app settings contract, `.dependency-cruiser.cjs` blocks production imports of `shared/dashboard-preferences.json` outside `shared/dashboard-preferences.js`, and `vitest.config.ts` now includes `shared/dashboard-preferences.js` in coverage.
- Follow-up quality fixes during implementation:
  - `tests/unit/dashboard-preferences.test.ts` now locks the shared/frontend adapter alignment for config parsing, section metadata, preset-range resolution, and active-preset detection.
  - `tests/frontend/use-dashboard-filters.test.tsx` now asserts preset application and reset behavior against the shared preset resolver instead of re-hardcoding date ranges.
  - `tests/frontend/filter-bar-presets.test.tsx` now seeds active-preset UI states from the shared resolver while preserving the existing visible quick-select order.
  - `src/types/dashboard-view-model.d.ts` and `src/hooks/use-dashboard-controller.ts` now type preset actions with `DashboardDatePreset` instead of broad strings.
- Validation:
  - `npm run check`
  - `npm run test:architecture`
  - `npm run check:deps`
  - `npm_config_cache=/tmp/ttdash-npm-cache npm run test:unit:coverage`
  - `npm run build:app`
  - `npm run verify:package`
  - `PLAYWRIGHT_TEST_PORT=3016 npm_config_cache=/tmp/ttdash-npm-cache npm run test:e2e`
  - `coderabbit review --agent -t uncommitted -c AGENTS.md` -> round 1: 0 issues, round 2: 0 issues
