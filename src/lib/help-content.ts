export const KEYBOARD_SHORTCUTS = [
  { keys: '⌘ K', description: 'Command Palette öffnen' },
  { keys: 'ESC', description: 'Dialog / Zoom schliessen' },
] as const

export const METRIC_HELP: Record<string, string> = {
  totalCost: 'Zeigt die Gesamtkosten aller API-Aufrufe im gewählten Zeitraum. Die Berechnung basiert auf den hinterlegten Token-Preisen pro Modell.',
  totalTokens: 'Zeigt die Summe aller verarbeiteten Tokens aus Input, Output und Cache. Ein Token entspricht grob vier Zeichen Text.',
  activeDays: 'Zeigt, an wie vielen Tagen im gewählten Zeitraum mindestens ein API-Aufruf vorhanden war.',
  topModel: 'Zeigt das Modell mit den höchsten Gesamtkosten im aktuellen Ausschnitt.',
  cacheHitRate: 'Zeigt den Anteil der Tokens, die aus dem Cache gelesen wurden. Höhere Werte sprechen meist für bessere Kosteneffizienz.',
  costPerMillion: 'Zeigt die durchschnittlichen Kosten pro 1 Million verarbeiteter Tokens. Niedrigere Werte sprechen für effizientere Nutzung.',
  mostExpensiveDay: 'Zeigt den Zeitraumspunkt mit den höchsten API-Kosten im aktuellen Ausschnitt.',
  cheapestDay: 'Zeigt den Zeitraumspunkt mit den niedrigsten API-Kosten im aktuellen Ausschnitt.',
  avgCostPerDay: 'Zeigt die durchschnittlichen Kosten pro aktivem Zeitraumspunkt.',
  outputTokens: 'Zeigt die Menge der generierten Output-Tokens. Diese sind meist teurer als reine Input-Tokens.',
}

export const CHART_HELP: Record<string, string> = {
  costOverTime: 'Zeigt die API-Kosten im Zeitverlauf zusammen mit einem gleitenden 7-Tage-Durchschnitt. Klick auf einen Punkt öffnet den Drilldown.',
  costByModel: 'Zeigt die Kostenverteilung nach Modell als Donut. So wird sichtbar, welche Modelle den grössten Kostenanteil tragen.',
  costByModelOverTime: 'Zeigt, wie sich die Kosten je Modell über die Zeit entwickeln. Gut geeignet, um Treiber und Verschiebungen im Modellmix zu erkennen.',
  cumulativeCost: 'Zeigt die kumulierten Gesamtkosten über den gewählten Zeitraum. Falls möglich, wird zusätzlich die Monatsend-Projektion eingeblendet.',
  costByWeekday: 'Zeigt die durchschnittlichen Kosten pro Wochentag. So werden wiederkehrende Lastmuster über die Woche sichtbar.',
  tokensOverTime: 'Zeigt den Token-Verbrauch über die Zeit, getrennt nach Input, Output, Cache Write, Cache Read und Thinking.',
  requestsOverTime: 'Zeigt Requests im Zeitverlauf mit Gesamtlinie, Modelllinien und Trendlinie. Klick auf einen Punkt öffnet den Drilldown.',
  tokenTypes: 'Zeigt die Verteilung der Token-Typen als Donut. So wird sichtbar, welcher Anteil auf Input, Output, Cache oder Thinking entfällt.',
  tokenEfficiency: 'Zeigt die Kosten pro 1 Million Tokens im Zeitverlauf. So lässt sich erkennen, ob Modellmix und Cache-Nutzung effizienter oder teurer werden.',
  modelMix: 'Zeigt den prozentualen Kostenanteil der Modelle je Zeitraumspunkt. So werden Modellwechsel und Konzentration sichtbar.',
  distributionAnalysis: 'Zeigt Histogramme für Kosten, Requests und Tokens pro Request. So wird die Streuung sichtbar, nicht nur der Durchschnitt.',
  correlationAnalysis: 'Zeigt Punktdiagramme für mögliche Zusammenhänge, etwa Requests zu Kosten oder Cache-Rate zu Kosten pro Request. Die Korrelation ist ein Signal, aber kein Beweis für Kausalität.',
  heatmap: 'Zeigt eine Kalender-Heatmap der täglichen Kosten. Dunklere Felder stehen für höhere Werte.',
  requestHeatmap: 'Zeigt eine Kalender-Heatmap der Requests pro Tag. So werden Lastmuster unabhängig von Kosten sichtbar.',
  tokenHeatmap: 'Zeigt eine Kalender-Heatmap des Tokenvolumens pro Tag. So lassen sich volumenstarke und kostenstarke Tage besser unterscheiden.',
  forecast: 'Zeigt die Kostenprognose für den laufenden Monat auf Basis geglätteter Kalendertageskosten. Ergänzt wird sie durch Trend und Unsicherheitsband.',
  cacheROI: 'Zeigt den Effekt der Cache-Nutzung, indem hypothetische Kosten ohne Cache mit den tatsächlichen Kosten verglichen werden.',
  periodComparison: 'Zeigt den Vergleich zweier Zeiträume, etwa Woche gegen Vorwoche oder Monat gegen Vormonat, anhand zentraler Kennzahlen.',
  anomalyDetection: 'Zeigt auffällige Zeitraumspunkte mit ungewöhnlich hohen oder niedrigen Kosten. Grundlage ist die Abweichung vom Mittelwert in Standardabweichungen.',
}

export const SECTION_HELP: Record<string, string> = {
  insights: 'Zeigt verdichtete Aussagen zu Konzentration, Request-Ökonomie, Nutzungsmuster und Peak-Fenstern. Diese Sektion ist als schneller Einstieg vor dem Detailblick gedacht.',
  metrics: 'Zeigt die wichtigsten Kennzahlen auf einen Blick. Hover über abgekürzte Werte zeigt den exakten Zahlenwert.',
  today: 'Zeigt die KPIs des aktuellen Tages im Datensatz. So wird sichtbar, wie stark der Tageswert vom Zeitraumdurchschnitt abweicht.',
  currentMonth: 'Zeigt die KPIs des laufenden Monats. So werden Fortschritt, Abdeckung und der Vergleich mit dem Vormonat sichtbar.',
  activity: 'Zeigt Kalenderansichten für Kosten, Requests und Tokens. So werden Lastspitzen, Lücken und saisonale Muster sichtbar.',
  forecastCache: 'Zeigt Monatsprognose, Cache-Ersparnis und operative Request-Qualität in einem Block. So entsteht ein gemeinsamer Blick auf Ausblick und Effizienz.',
  costAnalysis: 'Zeigt Kostenverlauf und Kostenverteilung nach Modell. So wird sichtbar, wo Geld ausgegeben wurde und welche Modelle die Haupttreiber sind.',
  tokenAnalysis: 'Zeigt Tokenvolumen, Token-Typen, Wochentagsmuster und Effizienz. So lässt sich besser einordnen, ob Kosten eher aus Menge oder Preisniveau entstehen.',
  requestAnalysis: 'Zeigt Requests gesamt, nach Modell und im Verlauf. Im Zoom kommen zusätzliche Trends und Verteilungen hinzu.',
  advancedAnalysis: 'Zeigt Verteilungen, Korrelationen und Konzentrationsrisiken. So wird sichtbar, wie stabil, konzentriert oder ungewöhnlich die Nutzung ist.',
  comparisons: 'Zeigt Veränderungen zwischen Perioden und markiert Ausreisser. So lassen sich Verschiebungen schneller einordnen.',
  tables: 'Zeigt detaillierte Tabellen mit Sortierung und Drilldown. So lassen sich einzelne Modelle, Provider und Tage gezielt prüfen.',
}

export const FEATURE_HELP: Record<string, string> = {
  requestQuality: 'Zeigt verdichtete Request-Signale wie Tokens pro Request, Kosten pro Request sowie Cache- und Thinking-Anteil. So lässt sich die operative Anfragequalität schneller einordnen.',
  concentrationRisk: 'Zeigt die Abhängigkeit von einzelnen Modellen und Providern. Hohe Werte bedeuten, dass wenige Akteure einen grossen Teil der Kosten tragen.',
  providerEfficiency: 'Zeigt den Vergleich der Anbieter nach Kosten, Requests, Tokens und Effizienzkennzahlen wie $/Req oder $/1M Tokens.',
  modelEfficiency: 'Zeigt den Vergleich der Modelle nach Kosten, Volumen und Effizienz. So lassen sich teure oder ineffiziente Kandidaten schnell erkennen.',
  recentDays: 'Zeigt die Detailtabelle pro Tag, Monat oder Jahr mit Drilldown und Benchmarks gegen Vortag und 7-Tage-Mittel.',
}
