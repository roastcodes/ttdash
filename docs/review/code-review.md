# Code Review

## Kurzfazit

Die Codequalitaet ist im Mittel gut: Typsicherheit, Namensgebung, Testtiefe und defensive API-Fehlerbehandlung sind ueberwiegend stark. Die Hauptschwaechen sind zentrale God-Objects, Dopplungen in der UI-Logik und etwas liegengebliebener Dead Code.

## Was bereits gut ist

- Die produktiven Grenzschichten sind bewusst organisiert (`src`, `server`, `shared`)
- Gemeinsame Domainlogik fuer Datenfilterung und Kennzahlen wurde bereits nach `shared/dashboard-domain.js` gezogen
- Fehlertexte und i18n-Pfade sind grossenteils konsistent
- Upload-, Import- und Export-Flows haben klare Fehlerrueckmeldungen und sichtbare Busy-States

## Findings

### H-01 - `use-dashboard-controller.ts` ist ein God-Hook mit sehr breiter API

**Referenzen:** `src/hooks/use-dashboard-controller.ts:102-760`, besonders `69-89`, `393-657`, `665-760`

Der Hook vereint Bootstrap, React Query Orchestrierung, Theme-Anwendung, i18n-Synchronisierung, Toasts, Datei-Import/Export, PDF-Download, Scroll-Navigation, Error-State-Bildung und UI-Dialogsteuerung in einem Modul mit `763` Zeilen. Der finale Return-Block exportiert `95` Felder.

Das ist der groesste Clean-Code-Befund im Frontend: die Datei hat mehrere Gruende, sich gleichzeitig zu aendern, und entkoppelt weder Browser-I/O noch Produktlogik sauber. Die Tests sind deshalb gezwungen, grosse Zustandsflaechen zu kennen, statt kleine Einheiten gezielt zu pruefen.

**Empfehlung:** in kleinere Hooks oder Controller-Slices zerlegen, z. B. Bootstrap/Load-State, Settings-Orchestrierung, Data-Transfer, Report/Download, UI-Only Actions. Browser-I/O wie Blob-Downloads aus dem Hook in kleine Helper oder View-Layer verschieben.

### M-01 - Preset-Logik ist doppelt implementiert

**Referenzen:** `src/components/layout/FilterBar.tsx:71-117`, `src/hooks/use-dashboard-filters.ts:17-45`

`resolveActivePreset(...)` und `resolvePresetRange(...)` codieren dieselben Datumspresets (`7d`, `30d`, `month`, `year`, `all`) getrennt. Eine Aenderung an den Preset-Regeln kann deshalb dazu fuehren, dass der angewendete Filter korrekt ist, die aktive UI-Markierung aber etwas anderes zeigt.

Das ist ein klassischer Konsistenz- und Duplikationsbefund: fachliche Regeln sollten fuer Anwenden und Anzeigen aus derselben Quelle kommen.

**Empfehlung:** Preset-Definitionen in ein gemeinsames Modul ueberfuehren und sowohl Hook als auch FilterBar nur noch daraus ableiten lassen.

### M-02 - `SettingsModal.tsx` mischt zu viele Verantwortlichkeiten

**Referenzen:** `src/components/features/settings/SettingsModal.tsx:1-1026`, besonders `53-83`, `219-356`

Die Settings-Komponente vereint Sprachwahl, Motion-Einstellungen, Provider-Limits, Default-Filter, Section-Visibility und -Order, Backup-Import/Export sowie einen live geladenen Toktrack-Versionsstatus in einer einzigen Datei mit `1026` Zeilen.

Das ist nicht nur ein Architekturthema, sondern auch ein Code-Consistency-Problem: je groesser die Datei wird, desto wahrscheinlicher werden inkonsistente Patterns fuer State, Reset, Busy-Zustaende und Fehlerbehandlung.

**Empfehlung:** in klar getrennte Subviews oder Dialog-Sektionen zerlegen, z. B. `General`, `Defaults`, `Sections`, `Data`, `Versions`.

### N-01 - Es gibt ungenutzte Hooks mit `0%` Coverage

**Referenzen:** `src/hooks/use-theme.ts:1-21`, `src/hooks/use-provider-limits.ts:1-17`

Beide Hooks sind im Repo vorhanden, aber weder produktiv importiert noch testseitig abgedeckt. Gleichzeitig melden die Coverage-Daten fuer beide `0%`.

Das ist kleiner als die God-Hook-Befunde, aber trotzdem wichtig: unbenutzter Code erzeugt Pflegekosten, verlaengert Suchraeume bei Refactors und verwirrt Guardrails, wenn er trotz `no-orphans-src` Regel nicht als Problem auftaucht.

**Empfehlung:** entfernen oder bewusst wieder integrieren und dann gezielt testen.
