# Architecture Review

## Kurzfazit

Die Repo-weiten Guardrails sind gut gedacht und weitgehend wirksam. Das groesste Architekturproblem ist nicht fehlende Regelung, sondern zu viel funktionale Konzentration in wenigen Modulen, waehrend andere Teile bereits sauber extrahiert wurden.

## Was bereits gut ist

- `dependency-cruiser`, `eslint-plugin-boundaries` und `archunit` decken unterschiedliche Strukturfragen sinnvoll ab
- `shared/dashboard-domain.js` wird bereits sowohl server- als auch frontendseitig genutzt
- Die Runtime-Trennung `src` vs `server` vs `shared` ist dokumentiert und im Check-Setup sichtbar verankert

## Findings

### H-01 - `server.js` ist die dominante Architektur-Engstelle

**Referenzen:** `server.js` insgesamt, besonders `75-92`, `444-542`, `1747-1774`, `2208-2451`, `2482-2975`

`server.js` umfasst `2992` Zeilen und rund `125` Funktionsdefinitionen. Darin liegen gleichzeitig:

- CLI-Argumente
- Port- und Runtime-Setup
- Datei- und Prozess-Locks
- Background-Registry
- Settings- und Usage-Persistenz
- HTTP-Guards und Routing
- Auto-Import samt Runner-Erkennung
- PDF-Reporting
- Static Serving
- Shutdown-Pfade

Das erzeugt hohe Aenderungskopplung. Ein Bugfix an Import- oder Background-Logik verlaengert unmittelbar die Review-Flaeche fuer HTTP-, CLI- und Persistenzcode.

**Empfehlung:** das Runtime-Modul weiter schneiden, z. B. `server/settings-runtime`, `server/data-runtime`, `server/background-runtime`, `server/auto-import-runtime`, `server/http-router`.

### H-02 - Der Settings-Vertrag ist client- und serverseitig dupliziert

**Referenzen:** `server.js:75-92`, `server.js:1403-1485`, `src/lib/app-settings.ts:20-91`, `src/lib/dashboard-preferences.ts:124-220`

Defaults und Normalisierung fuer Settings leben mehrfach:

- Server: `DEFAULT_SETTINGS`, `normalizeProviderLimits`, `normalizeDefaultFilters`, `normalizeSectionVisibility`, `normalizeSectionOrder`, `normalizeSettings`
- Frontend: `DEFAULT_APP_SETTINGS`, `normalizeAppSettings`, `normalizeDashboardDefaultFilters`, `normalizeDashboardSectionVisibility`, `normalizeDashboardSectionOrder`

Die Logik ist semantisch aehnlich, aber nicht aus einer gemeinsamen Quelle abgeleitet. Das ist ein Drift-Risiko: ein neuer Settings-Key, ein neues Default oder eine veraenderte Normalisierungsregel kann unbemerkt asymmetrisch werden.

**Empfehlung:** einen gemeinsamen Settings-Schema- und Normalisierungs-Layer nach `shared/**` ziehen.

### M-01 - Die Dashboard-Orchestrierung haengt an sehr breiten Props- und Return-Surfaces

**Referenzen:** `src/hooks/use-dashboard-controller.ts:665-760`, `src/components/dashboard/DashboardSections.tsx:179-219`, `src/components/Dashboard.tsx:301-456`

Der Controller liefert `95` Rueckgabefelder. `DashboardSectionsProps` umfasst `35` Inputs. `Dashboard.tsx` agiert dadurch eher als Durchreicher denn als klarer Kompositionspunkt.

Das ist architektonisch teuer:

- grosse Merge-Flaechen
- hohe Aenderungskosten fuer kleine Features
- breite Re-Render- und Testflaechen
- schwache lokale Ownership der Subsysteme

**Empfehlung:** Sections ueber bewusstere View-Model-Bundles versorgen, z. B. `filtersViewModel`, `forecastViewModel`, `tableViewModel`, `actions`.

### M-02 - Die gute Shared-Domain-Extraktion wurde noch nicht bis zu den Settings und UI-Regeln durchgezogen

**Referenzen:** `shared/dashboard-domain.js`, `src/lib/data-transforms.ts:8-16`, `src/lib/calculations.ts:6-16`

Bei Metrics und Transformationsregeln ist die Richtung bereits richtig: Frontend und Server ziehen gemeinsame Logik aus `shared/dashboard-domain.js`. Bei Settings, Presets und Teilen der UI-Regeln fehlt dieselbe Konsequenz noch.

**Empfehlung:** dieselbe Shared-Strategie selektiv auf Settings-Schema, Preset-Definitionen und andere rein fachliche Regeln ausweiten.
