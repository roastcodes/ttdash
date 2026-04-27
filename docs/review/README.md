# TTDash Ultra-Deep Review

## Kurzfazit

Der Codebase-Stand ist insgesamt solide: die wichtigsten Qualitaetsgates laufen gruens, die Testlandschaft ist deutlich ueber Durchschnitt, und mehrere fruehere Security-Luecken sind inzwischen sauber abgesichert. Die groessten aktuellen Risiken liegen nicht in akuten Produktionsfehlern, sondern in Struktur, Wartbarkeit, Testsignalen und der wachsenden Dichte der Dashboard-Oberflaeche.

## Durchgefuehrte Evidenzarbeit

- Statische Review von `src/**`, `server.js`, `server/**`, `shared/**`, `tests/**`, `docs/architecture.md`, `docs/testing.md`, `vite.config.ts`, `vitest.config.ts`, `.dependency-cruiser.cjs`
- Ausgefuehrte Gates:
  - `npm run check` -> bestanden
  - `npm run test:unit` -> bestanden (`99` Dateien, `369` Tests bestanden, `1` uebersprungen)
  - `npm run test:unit:coverage` -> bestanden
  - `npm run test:timings` -> bestanden
  - `npm run build:app` -> bestanden
- Architektur-Spezialfall:
  - `npm run test:architecture` schlug einmal fehl, weil `tests/architecture/frontend-layers.test.ts` im Gesamtlauf in den `5000ms` Timeout lief
  - isolierter Re-Run derselben Datei bestand, aber der langsamste Fall lag bei ca. `4950ms`

## Wichtigste Querschnittsbefunde

1. Die groessten Wartbarkeitsrisiken sitzen inzwischen weniger im Server-Entrypoint und staerker in wenigen Frontend-Mega-Modulen: `use-dashboard-controller.ts`, `SettingsModal.tsx`, `DashboardSections.tsx`, `FilterBar.tsx`.
2. Die Architektur-Grenzen sind auf Repo-Ebene gut abgesichert, aber die Anwendungslogik ist intern noch zu stark zentralisiert und ueber breite Props- und Return-Surfaces gekoppelt.
3. Die Security-Hardening-Basis ist fuer den Default-Loopback-Betrieb gut; lokale Read-APIs sind per per-start Session-Token geschuetzt, `TTDASH_ALLOW_REMOTE=1` bleibt ein separater token-gesicherter Betriebsmodus, und die Style-CSP kommt ohne `unsafe-inline` aus.
4. Die Testbasis ist breit, aber die gemeldete Coverage unterschaetzt nicht nur Luecken, sondern blendet ganze produktive Runtime-Bereiche aus.
5. Die Dashboard-Oberflaeche ist funktional stark und accessibility-bewusst, wirkt aber an mehreren Stellen ueberladen und pflegt zu viele Interaktionsmuster in zu wenigen Komponenten.

## Wichtige Messpunkte

- Urspruengliche Coverage-Summary aus `npm run test:unit:coverage`:
  - Statements `76.27%`
  - Branches `65.71%`
  - Functions `76.43%`
  - Lines `78.61%`
- Aktueller Stand zu `test-review.md / H-02`:
  - `npm run test:unit:coverage` zaehlt inzwischen `src/**/*.{ts,tsx}`, `server.js`, `server/**/*.js`, `shared/**/*.js` und `usage-normalizer.js`
  - Die neue Produkt-Runtime-Baseline liegt bei Statements `72.85%`, Branches `63.01%`, Functions `74.97%`, Lines `73.88%`
  - Server-Entrypoints, Child-Process-Pfade und lazy Dashboard-Sektionen bleiben dadurch sichtbar, auch wenn sie nicht alle direkt im Vitest-Hauptprozess hohe Line-Coverage erzeugen
- Langsamste Test-Suites aus `npm run test:timings`:
  - `tests/integration/server-background.test.ts` -> `5.785s`
  - `tests/integration/server-auto-import.test.ts` -> `4.521s`
  - `tests/unit/server-helpers-runner-process.test.ts` -> `2.778s`
  - `tests/frontend/settings-modal-language.test.tsx` -> `2.443s`
  - `tests/frontend/drill-down-modal-motion.test.tsx` -> `2.013s`
- Build-Signal aus `npm run build:app`:
  - `charts-vendor` -> `422.02 kB` raw / `119.59 kB` gzip
  - `index` -> `212.32 kB` raw / `57.55 kB` gzip
  - `react-vendor` -> `200.38 kB` raw / `64.43 kB` gzip
  - `motion-vendor` -> `125.85 kB` raw / `41.08 kB` gzip
  - `i18n` -> `119.68 kB` raw / `36.70 kB` gzip

## Berichte

- [code-review.md](./code-review.md)
- [architecture-review.md](./architecture-review.md)
- [security-review.md](./security-review.md)
- [performance-review.md](./performance-review.md)
- [dashboard-review.md](./dashboard-review.md)
- [server-review.md](./server-review.md)
- [test-review.md](./test-review.md)
- [fixed-findings.md](./fixed-findings.md)

## Bewertungslogik

- `Hoch`: strukturelles oder betriebliches Risiko mit klarer Folgewirkung auf Aenderungssicherheit, Security oder Teamtempo
- `Mittel`: echtes Problem mit begrenztem oder lokalem Blast Radius
- `Niedrig`: saubere Verbesserung mit niedrigerem Risiko, aber gutem Langzeitnutzen
