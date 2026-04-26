# Security Review

## Kurzfazit

Der aktuelle Stand ist fuer den Default-Loopback-Betrieb deutlich staerker als es die aeltere Pen-Test-Doku vermuten laesst: Host-Checks, Origin-Pruefung, Payload-Grenzen, Null-Byte-Abwehr, token-basierte API-Auth, restriktive Datei-Permissions und eine CSP ohne `unsafe-inline` fuer Styles sind vorhanden und getestet. Die verbleibenden Risiken liegen vor allem bei kompromittierten Prozessen desselben OS-Users und bei veralteter Security-Dokumentation.

## Was bereits gut ist

- Nicht-loopback Bind braucht explizites Opt-in ueber `TTDASH_ALLOW_REMOTE=1`
- Nicht-loopback Bind braucht zusaetzlich `TTDASH_REMOTE_TOKEN`
- Loopback-API-Requests brauchen einen per Start generierten lokalen Session-Token
- Mutation-Requests werden ueber Host- und Origin-Validierung abgesichert
- Null-Byte-Pfade werden abgefangen, ohne den Server zu beenden
- Oversized Upload- und Report-Requests werden sauber mit `413` behandelt
- Persistierte Dateien und App-Directories werden mit restriktiven Rechten geschrieben
- Die CSP trennt Element- und Attribut-Styles, erlaubt Stylesheet-Elemente nur ueber `self` bzw. HTML-Nonce und blockiert Style-Attribute ueber `style-src-attr 'none'`
- Diese Schutzmechanismen sind nicht nur im Code sichtbar, sondern auch in Integrationstests verankert

## Findings

### H-01 - `TTDASH_ALLOW_REMOTE=1` bleibt ein Vollvertrauensmodus ohne Authentifizierung

**Referenzen:** `server/runtime.js:10-21`, `server/http-utils.js:152-233`, `server.js:1608-1765`, `server.js:2482-2852`

Sobald Remote-Binding explizit aktiviert wird, existiert weiterhin keine echte Authentifizierung. Die Autorisierung stuetzt sich dann nur noch auf Host- und Origin-Konsistenz. Das schuetzt gegen Browser-Cross-Site-Szenarien, aber nicht gegen einfache nicht-browserseitige Clients auf demselben Netz, die passende `Host`- und `Origin`-Header setzen.

Das ist fuer den Default-Modus kein akuter Bug, aber ein klares Security-Design-Risiko fuer alle Nutzer, die das Tool absichtlich ins Netz haengen.

**Empfehlung:** Remote-Bind nur mit Token-basierter Auth oder einem separaten abgesicherten Mode erlauben.

**Aktueller Stand:** In `docs/review/fixed-findings.md` als `security-review.md / H-01` geschlossen. Remote-Bind verlangt `TTDASH_REMOTE_TOKEN`, und Remote-API-Requests laufen durch die zentrale Token-Auth.

### M-01 - Lokale Read-Endpoints sind im gleichen Host-Kontext offen

**Referenzen:** `server.js:2503-2588`, `server.js:2769-2777`

`/api/usage`, `/api/settings`, `/api/runtime` und `/api/toktrack/version-status` waren fuer jeden Prozess erreichbar, der den Loopback-Server ansprechen konnte. Fuer eine lokale Single-User-App war das ein verstaendlicher Tradeoff, aber die Bedrohungsannahme war stark: "andere lokale Prozesse sind vertrauenswuerdig".

**Aktueller Stand:** In `docs/review/fixed-findings.md` als `security-review.md / M-01` geschlossen. Der Loopback-Server generiert pro Start einen lokalen Session-Token, oeffnet bzw. dokumentiert eine einmalige Bootstrap-URL, setzt daraus ein HttpOnly/SameSite-Cookie und verlangt danach Auth fuer alle API-Endpoints. Background-Registry und Testserver speichern die notwendige Session-Metadaten nur in restriktiven User-Config-Dateien.

**Restrisiko:** Ein kompromittierter Prozess mit denselben OS-User-Rechten kann weiterhin Terminalausgaben, User-Config-Dateien oder Browserprofile angreifen. Vollstaendige Isolation gegen diesen Angreifertyp wuerde einen OS-naeheren Transport wie Unix Domain Sockets, Named Pipes mit ACLs oder eine native Desktop-Shell erfordern.

### N-01 - Die CSP erlaubt weiterhin Inline-Styles

**Referenzen:** `server.js:49-56`

Die gesetzte CSP enthielt `style-src 'self' 'unsafe-inline'`. Das war kein unmittelbarer Exploit-Nachweis, vergroesserte aber die Angriffsoberflaeche, falls spaeter ungewollte Style-Injektionen oder unsaubere HTML-Renderpfade dazukommen.

**Empfehlung:** mittelfristig auf style hashes oder reine Stylesheet-basierte Ausgabe umstellen.

**Aktueller Stand:** In `docs/review/fixed-findings.md` als `security-review.md / N-01` geschlossen. Die CSP enthaelt kein `unsafe-inline` mehr fuer Styles, HTML-Antworten erhalten pro Response eine Nonce und ein passendes `ttdash-csp-nonce` Meta-Tag, `style-src-elem` erlaubt nur `self` bzw. die Nonce, und `style-src-attr 'none'` blockiert echte Inline-Style-Attribute.

**Restrisiko:** JavaScript-gesteuerte Style-Properties bleiben fuer React, Recharts und Motion erlaubt. Das ist bewusst, weil diese Updates nicht der blockierte HTML-Style-Attributpfad sind und die bestehende Dashboard-Optik sowie Animationen ohne Security-Gewinn sonst umfangreich ersetzt werden muessten.

### N-02 - Die vorhandene Pen-Test-Doku ist fachlich nicht mehr auf dem aktuellen Stand

**Referenzen:** `docs/security/pentest-2026-04-17.md:3-11`, `tests/integration/server-api-guards.test.ts:7-110`, `server.js:2818-2866`

Die alte Doku nennt `%00`-DoS, fehlende Host-Pruefung und fehlende Origin-Pruefung als aktuelle Hauptbefunde. Der aktuelle Code und die aktuellen Guards-Tests zeigen aber, dass diese Punkte inzwischen abgesichert sind.

Das ist kein Runtime-Bug, aber ein Security-Governance-Problem: veraltete Security-Dokumente fuehren zu falschem Vertrauen oder falscher Alarmierung.

**Empfehlung:** Security-Dokumente versionieren oder mit einem klaren "historisch / superseded" Hinweis versehen.
