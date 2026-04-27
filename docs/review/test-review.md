# Test Review

## Kurzfazit

Die Teststrategie ist stark: klare Layer, viele gezielte Frontend- und Integrationstests, gute Accessibility-Abdeckung und brauchbare Runtime-Regressionen. Die groessten aktuellen Testprobleme liegen bei Messbarkeit, Flakiness und Testdauer, nicht bei fehlender Ernsthaftigkeit.

## Was bereits gut ist

- Die vier Testlayer sind sauber dokumentiert und tatsaechlich im Repo sichtbar
- Server-Guards, Background-Betrieb und Auto-Import haben echte Integrationstests
- Frontend-Tests pruefen nicht nur Rendern, sondern Sprache, Motion und Accessibility
- Die Test-Timings werden aktiv ueber ein eigenes Script ausgewertet

## Findings

### H-01 - Die Architektur-Suite enthaelt einen echten Timeout-Fall an der Flake-Grenze

**Status:** Behoben, siehe `docs/review/fixed-findings.md` -> `test-review.md / H-01`.

**Referenzen:** `tests/architecture/frontend-layers.test.ts:3-12`

`npm run test:architecture` fiel im Gesamtlauf aus, weil `hooks must not depend on components` den `5000ms` Timeout riss. Der isolierte Re-Run derselben Datei bestand, aber der langsamste Fall lag bei etwa `4950ms`.

Das ist kein semantischer Architekturverstoss, aber ein instabiles Signal. Genau solche Grenzfaelle untergraben das Vertrauen in CI-Fehler.

**Empfehlung:** Timeout anheben oder die Archunit-Pruefung leichter machen, bevor daraus wiederkehrende CI-Flakes werden.

### H-02 - Die Coverage-Zahl bildet die produktive Runtime nur teilweise ab

**Status:** Behoben, siehe `docs/review/fixed-findings.md` -> `test-review.md / H-02`.

**Referenzen:** `vitest.config.ts:27-44`

Die Coverage-Includes decken nur:

- `src/hooks/**/*.ts`
- `src/lib/**/*.ts`
- `src/components/Dashboard.tsx`
- `usage-normalizer.js`

Damit fehlen in der gemeldeten Quote unter anderem:

- `server.js`
- `server/**`
- `shared/**`
- fast alle Komponenten ausser `Dashboard.tsx`

Die gemeldeten `76.27 / 65.71 / 76.43 / 78.61` sind also technisch korrekt, aber strategisch irrefuehrend, wenn man sie als Produkt-Coverage liest.

**Empfehlung:** separate Server-Coverage fuer Spawn-Pfade einfuehren und die Includes auf die realen Runtime-Schwerpunkte erweitern.

### M-01 - Dead Code und Coverage-Luecken werden von den Guardrails nicht sichtbar gemacht

**Status:** Behoben, siehe `docs/review/fixed-findings.md` -> `test-review.md / M-01`.

**Referenzen:** `src/hooks/use-theme.ts:1-21`, `src/hooks/use-provider-limits.ts:1-17`, `.dependency-cruiser.cjs:12-21`

Es gibt mindestens zwei Hooks ohne produktive Importe und mit `0%` Coverage. Gleichzeitig lief `dependency-cruiser` trotz `no-orphans-src` Regel ohne Hinweis durch.

Das ist wichtig, weil tote oder veraltete Pfade so laenger unauffaellig im Repo bleiben.

**Empfehlung:** Orphan-Detection schaerfer pruefen oder zusaetzlich ein dediziertes Dead-Code-Werkzeug in den Review-/CI-Prozess aufnehmen.

### M-02 - Testdauer konzentriert sich auf wenige Hotspots

**Status:** Behoben, siehe `docs/review/fixed-findings.md` -> `test-review.md / M-02`.

**Evidenz:** `npm run test:timings`

Langsamste Suites:

- `tests/integration/server-background.test.ts` -> `5.785s`
- `tests/integration/server-auto-import.test.ts` -> `4.521s`
- `tests/unit/server-helpers-runner-process.test.ts` -> `2.778s`
- `tests/frontend/settings-modal-language.test.tsx` -> `2.443s`
- `tests/frontend/drill-down-modal-motion.test.tsx` -> `2.013s`

Langsamster Einzeltest:

- `rejects parallel auto-import starts before launching a second toktrack runner` -> `3.326s`

Die Hotspots sind plausibel, aber sie zeigen klar, welche Testpfade kuenftig zuerst entkoppelt oder fokussiert werden sollten.

**Empfehlung:** langsame Prozess- und UI-Pfade weiter isolieren, damit neue Regressionen dort nicht unverhaeltnismaessig teuer werden.

### M-03 - Die E2E-Abdeckung ist funktional stark, aber in einer grossen Monolith-Datei konzentriert

**Referenzen:** `tests/e2e/dashboard.spec.ts` insgesamt, `734` Zeilen, `7` Tests

Die Playwright-Suite prueft wichtige Journeys, aber fast alles lebt in einer Datei. Das erschwert Navigation, Review und selektive Optimierung. Mit weiterem Wachstum wird daraus schnell ein langsamer Catch-all statt fokussierter Journeys.

**Empfehlung:** nach Themen splitten, z. B. `load-and-upload`, `settings-and-backups`, `forecast-and-reporting`, `filters-and-navigation`.
