# Server Review

## Kurzfazit

Der Server ist funktional robust fuer eine lokale Single-Binary-Node-Runtime. Die fruehere Entrypoint-Konzentration wurde deutlich reduziert: `server.js` ist heute nur noch der ausfuehrbare CLI/Bin-Shim, waehrend `server/app-runtime.js` die Runtime-Komposition uebernimmt und CLI, Startup-Shell, HTTP-Lifecycle, Auth, Router, Persistenz, Auto-Import und Background-Betrieb in fokussierten Runtime-Modulen liegen.

## Was bereits gut ist

- Host-, Origin- und Payload-Grenzen sind aktiv und getestet
- Persistenz nutzt atomische Schreibpfade und Cross-Process-Locks
- Background-Instanzen, Logfiles und Dateirechte sind nicht nur "best effort", sondern explizit mitgedacht
- Reporting, Auto-Import und Background-Betrieb haben klare Fehler- und Timeout-Strategien
- `server.js` exportiert keine Test- oder Runtime-Helper-API mehr und bleibt durch eine Architektur-Guardrail auf den ausfuehrbaren Shim begrenzt

## Findings

### H-01 - Zu viele Server-Subsysteme leben im Entrypoint

**Referenzen:** `server.js` insgesamt, besonders `322-542`, `655-940`, `1665-1765`, `1784-2451`, `2482-2975`

Das Entrypoint-Modul traegt Persistenz, File Locks, Background-Registry, CLI, Auto-Import, Runner-Diagnostik, HTTP-Router, Static Serving und Shutdown in einem Kontext. Diese Kopplung verlangsamt Reviews und macht lokale Refactors teuer.

**Empfehlung:** innere Runtime-Helfer in eigene Module verschieben und `server.js` auf Komposition reduzieren.

**Aktueller Stand:** In `docs/review/fixed-findings.md` als `server-review.md / H-01` geschlossen. CLI-Parsing, Startup-Ausgabe, Browser-Open, lokale Auth-Session-Metadaten und HTTP-Lifecycle/Shutdown sind aus dem Entrypoint herausgezogen. Nach `server-review.md / M-01` umfasst `server.js` nur noch den `require.main`-Startpfad und delegiert die Runtime-Komposition an `server/app-runtime.js`.

### M-01 - Der produktive Entrypoint exportiert einen breiten `__test__`-API-Schatten

**Referenzen:** `server.js:2935-2962`

Fuer Tests werden viele interne Helfer direkt aus `server.js` exportiert. Das ist pragmatisch, macht das Produktionsmodul aber implizit zu einer halb-oeffentlichen Utility-Sammlung. Mit wachsender Codebasis entsteht daraus schnell eine "nicht offiziell oeffentliche, aber faktisch stabile" API.

**Empfehlung:** Testziele aus `server.js` in importierbare Runtime-Module verschieben und dort direkt testen.

**Aktueller Stand:** In `docs/review/fixed-findings.md` als `server-review.md / M-01` geschlossen. Die Server-helper-Tests importieren die Runtime-Module direkt, die Playwright-Testserver-Komposition nutzt `server/app-runtime.js`, und `server.js` exportiert weder `__test__` noch andere produktive Runtime-Helper.

### M-02 - Globale Runtime-Flags und Caches erschweren lokale Isolation

**Referenzen:** `server.js:93-101`, `1759-1774`, `2208-2247`, `2271-2451`

Zustaende wie `startupAutoLoadCompleted`, `runtimePort`, `runtimeUrl`, `autoImportRunning`, `autoImportStreamRunning`, `latestToktrackVersionCache` und `latestToktrackVersionLookupPromise` sind zentral und mutable. Fuer die aktuelle App ist das noch beherrschbar, aber es koppelt Nebenwirkungen ueber mehrere Funktionsbereiche.

**Empfehlung:** zumindest die Toktrack- und Auto-Import-Laufzeit in dedizierte Service-Objekte kapseln.

**Aktueller Stand:** In `docs/review/fixed-findings.md` als `server-review.md / M-02` geschlossen. Runtime-Snapshot, Startup-Auto-Load-Status, Auto-Import-Lease und Toktrack-Version-Cache liegen jetzt in pro Runtime instanziierten Service-Objekten; der HTTP-Router besitzt kein eigenes Auto-Import-Stream-Flag mehr.

### N-01 - Die Serverbasis ist strukturell staerker als es ihre Dateiform vermuten laesst

**Referenzen:** `server/runtime.js`, `server/http-utils.js`, `tests/integration/server-api-guards.test.ts`, `tests/integration/server-background.test.ts`

Positiv auffaellig ist, dass wesentliche Sicherheits- und Runtime-Helfer bereits aus `server.js` herausgezogen wurden. Diese Richtung ist richtig und sollte konsequent weitergefuehrt werden.

**Empfehlung:** `server/runtime.js` und `server/http-utils.js` als Muster fuer weitere Extraktionen verwenden.
