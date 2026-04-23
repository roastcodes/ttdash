# Security Review

## Kurzfazit

Der aktuelle Stand ist fuer den Default-Loopback-Betrieb deutlich staerker als es die aeltere Pen-Test-Doku vermuten laesst: Host-Checks, Origin-Pruefung, Payload-Grenzen, Null-Byte-Abwehr und restriktive Datei-Permissions sind vorhanden und getestet. Die verbleibenden Risiken sind vor allem Betriebsmodus- und Dokumentationsrisiken.

## Was bereits gut ist

- Nicht-loopback Bind braucht explizites Opt-in ueber `TTDASH_ALLOW_REMOTE=1`
- Mutation-Requests werden ueber Host- und Origin-Validierung abgesichert
- Null-Byte-Pfade werden abgefangen, ohne den Server zu beenden
- Oversized Upload- und Report-Requests werden sauber mit `413` behandelt
- Persistierte Dateien und App-Directories werden mit restriktiven Rechten geschrieben
- Diese Schutzmechanismen sind nicht nur im Code sichtbar, sondern auch in Integrationstests verankert

## Findings

### H-01 - `TTDASH_ALLOW_REMOTE=1` bleibt ein Vollvertrauensmodus ohne Authentifizierung

**Referenzen:** `server/runtime.js:10-21`, `server/http-utils.js:152-233`, `server.js:1608-1765`, `server.js:2482-2852`

Sobald Remote-Binding explizit aktiviert wird, existiert weiterhin keine echte Authentifizierung. Die Autorisierung stuetzt sich dann nur noch auf Host- und Origin-Konsistenz. Das schuetzt gegen Browser-Cross-Site-Szenarien, aber nicht gegen einfache nicht-browserseitige Clients auf demselben Netz, die passende `Host`- und `Origin`-Header setzen.

Das ist fuer den Default-Modus kein akuter Bug, aber ein klares Security-Design-Risiko fuer alle Nutzer, die das Tool absichtlich ins Netz haengen.

**Empfehlung:** Remote-Bind nur mit Token-basierter Auth oder einem separaten abgesicherten Mode erlauben.

### M-01 - Lokale Read-Endpoints sind im gleichen Host-Kontext offen

**Referenzen:** `server.js:2503-2588`, `server.js:2769-2777`

`/api/usage`, `/api/settings`, `/api/runtime` und `/api/toktrack/version-status` sind fuer jeden Prozess erreichbar, der den Loopback-Server ansprechen kann. Fuer eine lokale Single-User-App ist das ein verstaendlicher Tradeoff, aber die Bedrohungsannahme ist stark: "andere lokale Prozesse sind vertrauenswuerdig".

Wenn dieses Threat Model gewollt ist, sollte es klar dokumentiert werden. Wenn nicht, fehlt ein Schutz gegen lokale Malware, Browser-Extensions oder andere User-Kontexte auf demselben Host.

**Empfehlung:** Sicherheitsdokumentation explizit um dieses lokale Threat Model erweitern; fuer spaetere Haertung waeren Token oder ein Unix-Socket-Mode die naheliegendsten Optionen.

### N-01 - Die CSP erlaubt weiterhin Inline-Styles

**Referenzen:** `server.js:49-56`

Die gesetzte CSP ist insgesamt ordentlich, enthaelt aber `style-src 'self' 'unsafe-inline'`. Das ist kein unmittelbarer Exploit-Nachweis, vergroessert aber die Angriffsoberflaeche, falls spaeter ungewollte Style-Injektionen oder unsaubere HTML-Renderpfade dazukommen.

**Empfehlung:** mittelfristig auf style hashes oder reine Stylesheet-basierte Ausgabe umstellen.

### N-02 - Die vorhandene Pen-Test-Doku ist fachlich nicht mehr auf dem aktuellen Stand

**Referenzen:** `docs/security/pentest-2026-04-17.md:3-11`, `tests/integration/server-api-guards.test.ts:7-110`, `server.js:2818-2866`

Die alte Doku nennt `%00`-DoS, fehlende Host-Pruefung und fehlende Origin-Pruefung als aktuelle Hauptbefunde. Der aktuelle Code und die aktuellen Guards-Tests zeigen aber, dass diese Punkte inzwischen abgesichert sind.

Das ist kein Runtime-Bug, aber ein Security-Governance-Problem: veraltete Security-Dokumente fuehren zu falschem Vertrauen oder falscher Alarmierung.

**Empfehlung:** Security-Dokumente versionieren oder mit einem klaren "historisch / superseded" Hinweis versehen.
