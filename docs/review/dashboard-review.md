# Dashboard Review

> Historical note: Findings M-01, M-02, N-01, and N-02 are resolved historical
> review items. See `docs/review/fixed-findings.md` for the implementation
> status and guardrails.

## Kurzfazit

Das Dashboard ist funktional stark und sichtbar mit Fokus auf Accessibility, Internationalisierung und lehrreiche Analytik gebaut. Die Kehrseite ist eine hohe Oberflaechen- und Interaktionsdichte, die sowohl Nutzer als auch Maintainer belastet.

## Was bereits gut ist

- Leere-, Fehler- und Erfolgszustaende sind bewusst modelliert
- Filter, Motion und Dialoge sind durch viele gezielte Frontend-Tests abgesichert
- Deutsche und englische Terminologie werden aktiv gepflegt
- Forecast-, Drilldown- und Tabellenoberflaechen sind keine bloessen "nice to have", sondern tief integriert

## Findings

### M-01 - Der Settings-Dialog ist fuer eine einzelne Oberflaeche ueberladen

**Referenzen:** `src/components/features/settings/SettingsModal.tsx:53-83`, `219-356`, gesamte Datei mit `1026` Zeilen

Nutzer bekommen in einem einzigen Modal gleichzeitig:

- Sprachumschaltung
- Motion-Einstellungen
- Default-Filter
- Provider-Limits
- Sichtbarkeit und Reihenfolge der Sektionen
- Settings- und Daten-Import/Export
- Versionsstatus von Toktrack
- Data-Status und Load-Quelle

Das ist fuer Power-User noch beherrschbar, fuer neue oder seltene Nutzer aber schnell ein "scroll and search" Workflow statt einer gefuehrten Konfiguration.

**Empfehlung:** in klar getrennte Bereiche oder Tabs schneiden und "day-to-day" Einstellungen von "advanced / admin" Funktionen trennen.

### M-02 - Die Filterleiste kombiniert zu viele Interaktionsmuster in einer Komponente

**Referenzen:** `src/components/layout/FilterBar.tsx` insgesamt, besonders `27-47`, `71-117`, `119-317`

Die FilterBar mischt ViewMode-Wechsel, Monatsauswahl, Provider- und Modellchips, aktive Preset-Erkennung und einen komplett eigenen Date-Picker inklusive Focus- und Keyboard-Management. Das zeigt hohe Ambition, macht die Komponente aber schwer ueberschaubar und schwer aenderbar.

Die Accessibility-Tests belegen, dass der aktuelle Zustand funktioniert. Gleichzeitig zeigt die Menge an Focus- und Overlay-Logik, wie fragil dieser Bereich werden kann.

**Empfehlung:** Date-Picker und Chip-Filter in klar getrennte, kleinere Subkomponenten auslagern.

### N-01 - Die Action-Landschaft ist reich, aber verstreut

**Referenzen:** `src/components/Dashboard.tsx:219-456`

Upload, Auto-Import, Export, Settings, Help, Report, Filter, Command Palette und section-based Navigation sind ueber Header, Empty State, Settings, Dialoge und Command Palette verteilt. Das erhoeht die Entdeckbarkeit, aber auch den kognitiven Overhead.

Vor allem fuer seltene Aufgaben wie Backups, Reset oder Toktrack-Versionsstatus ist nicht immer klar, ob sie "daily use" oder "advanced maintenance" sind.

**Empfehlung:** primaere Alltagsaktionen deutlicher von Wartungs- und Diagnoseaktionen trennen.

### N-02 - Die Dashboard-Struktur ist intern deutlich breiter als von aussen sichtbar

**Referenzen:** `src/components/dashboard/DashboardSections.tsx:179-219`, `src/components/Dashboard.tsx:301-390`

`DashboardSectionsProps` umfasst `35` Inputs. Das ist weniger ein direkter UX-Bug als ein Hinweis darauf, dass das Dashboard intern bereits sehr viele Konzepte gleichzeitig aufspannt. Solche Breite endet oft spaeter als inkonsistente UX.

**Empfehlung:** pro Dashboard-Sektion bewusstere View-Model-Grenzen definieren, damit Fach- und UI-Entscheidungen wieder lokaler werden.
