export const KEYBOARD_SHORTCUTS = [
  { keys: '⌘ K', description: 'Command Palette öffnen' },
  { keys: 'ESC', description: 'Dialog / Zoom schliessen' },
] as const

export const METRIC_HELP: Record<string, string> = {
  totalCost: 'Gesamtkosten aller API-Aufrufe im gewählten Zeitraum. Berechnet aus den Token-Preisen pro Modell.',
  totalTokens: 'Summe aller verarbeiteten Tokens (Input + Output + Cache). Ein Token entspricht ca. 4 Zeichen.',
  activeDays: 'Anzahl Tage mit mindestens einem API-Aufruf im gewählten Zeitraum.',
  topModel: 'Das Modell mit den höchsten Gesamtkosten im Zeitraum.',
  cacheHitRate: 'Anteil der Tokens, die aus dem Cache gelesen wurden. Höher = kostensparender, da Cache-Reads günstiger sind.',
  costPerMillion: 'Durchschnittliche Kosten pro 1 Million verarbeiteter Tokens. Niedrigerer Wert = kosteneffizienter.',
  mostExpensiveDay: 'Der Tag mit den höchsten API-Kosten im gewählten Zeitraum.',
  cheapestDay: 'Der Tag mit den niedrigsten API-Kosten im gewählten Zeitraum.',
  avgCostPerDay: 'Durchschnittliche tägliche Kosten, berechnet über alle aktiven Tage.',
  outputTokens: 'Anzahl der generierten Output-Tokens. Output-Tokens sind deutlich teurer als Input-Tokens.',
}

export const CHART_HELP: Record<string, string> = {
  costOverTime: 'Tägliche API-Kosten mit 7-Tage gleitendem Durchschnitt. Klicke auf einen Datenpunkt für Details.',
  costByModel: 'Kostenverteilung nach Modell als Donut-Chart. Zeigt den Anteil jedes Modells an den Gesamtkosten.',
  costByModelOverTime: 'Gestapelte Flächendarstellung der Kosten pro Modell über die Zeit.',
  cumulativeCost: 'Kumulierte Gesamtkosten über den gewählten Zeitraum.',
  costByWeekday: 'Durchschnittliche Kosten pro Wochentag. Zeigt Nutzungsmuster über die Woche.',
  tokensOverTime: 'Token-Verbrauch über die Zeit, aufgeteilt nach Typ (Input, Output, Cache Write, Cache Read).',
  tokenTypes: 'Verteilung der Token-Typen als Donut-Chart.',
  heatmap: 'Kalender-Heatmap der täglichen Kosten. Dunklere Felder = höhere Kosten.',
  forecast: 'Kostenprognose für den laufenden Monat, basierend auf linearer Regression der letzten 14 Tage.',
  cacheROI: 'Return on Investment der Cache-Nutzung. Vergleicht hypothetische Kosten ohne Cache mit den tatsächlichen Kosten.',
  periodComparison: 'Vergleich zweier Zeiträume (Woche oder Monat) anhand wichtiger Metriken.',
  anomalyDetection: 'Erkennt Tage mit ungewöhnlich hohen/niedrigen Kosten (> 2 Standardabweichungen vom Mittelwert).',
}

export const SECTION_HELP: Record<string, string> = {
  metrics: 'Wichtigste Kennzahlen auf einen Blick. Hover über abgekürzte Zahlen für den exakten Wert.',
  charts: 'Interaktive Visualisierungen. Klicke auf Datenpunkte für Drill-Down-Details. Jeder Chart kann vergrössert werden.',
  tables: 'Detaillierte Tabellen mit Sortier- und Drill-Down-Funktion.',
}
