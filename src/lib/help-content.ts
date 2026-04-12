import { getCurrentLanguage } from '@/lib/i18n'

const HELP_CONTENT = {
  de: {
    keyboardShortcuts: [
      { keys: '⌘ K', description: 'Command Palette öffnen' },
      { keys: 'ESC', description: 'Dialog / Zoom schliessen' },
    ],
    metric: {
      totalCost:
        'Zeigt die Gesamtkosten aller API-Aufrufe im gewählten Zeitraum. Die Berechnung basiert auf den hinterlegten Token-Preisen pro Modell.',
      totalTokens:
        'Zeigt die Summe aller verarbeiteten Tokens aus Input, Output und Cache. Ein Token entspricht grob vier Zeichen Text.',
      activeDays:
        'Zeigt, an wie vielen Tagen im gewählten Zeitraum mindestens ein API-Aufruf vorhanden war.',
      topModel: 'Zeigt das Modell mit den höchsten Gesamtkosten im aktuellen Ausschnitt.',
      cacheHitRate:
        'Zeigt den Anteil der Tokens, die aus dem Cache gelesen wurden. Höhere Werte sprechen meist für bessere Kosteneffizienz.',
      costPerMillion:
        'Zeigt die durchschnittlichen Kosten pro 1 Million verarbeiteter Tokens. Niedrigere Werte sprechen für effizientere Nutzung.',
      mostExpensiveDay:
        'Zeigt den Zeitraumspunkt mit den höchsten API-Kosten im aktuellen Ausschnitt.',
      cheapestDay:
        'Zeigt den Zeitraumspunkt mit den niedrigsten API-Kosten im aktuellen Ausschnitt.',
      avgCostPerDay: 'Zeigt die durchschnittlichen Kosten pro aktivem Zeitraumspunkt.',
      outputTokens:
        'Zeigt die Menge der generierten Output-Tokens. Diese sind meist teurer als reine Input-Tokens.',
    },
    chart: {
      costOverTime:
        'Zeigt die API-Kosten im Zeitverlauf zusammen mit einem gleitenden 7-Tage-Durchschnitt. Klick auf einen Punkt öffnet den Drilldown.',
      costByModel:
        'Zeigt die Kostenverteilung nach Modell als Donut. So wird sichtbar, welche Modelle den grössten Kostenanteil tragen.',
      costByModelOverTime:
        'Zeigt, wie sich die Kosten je Modell über die Zeit entwickeln. Gut geeignet, um Treiber und Verschiebungen im Modellmix zu erkennen.',
      cumulativeCost:
        'Zeigt die kumulierten Gesamtkosten über den gewählten Zeitraum. Falls möglich, wird zusätzlich die Monatsend-Projektion eingeblendet.',
      costByWeekday:
        'Zeigt die durchschnittlichen Kosten pro Wochentag. So werden wiederkehrende Lastmuster über die Woche sichtbar.',
      tokensOverTime:
        'Zeigt den Token-Verbrauch über die Zeit, getrennt nach Input, Output, Cache Write, Cache Read und Thinking.',
      requestsOverTime:
        'Zeigt Requests im Zeitverlauf mit Gesamtlinie, Modelllinien und Trendlinie. Klick auf einen Punkt öffnet den Drilldown.',
      requestCacheHitRate:
        'Zeigt die Cache-Hit-Rate pro Modell zusammen mit dem gefilterten Gesamtwert und dem gleitenden 7-Tage-Durchschnitt auf Basis des gewählten Tagesbereichs.',
      tokenTypes:
        'Zeigt die Verteilung der Token-Typen als Donut. So wird sichtbar, welcher Anteil auf Input, Output, Cache oder Thinking entfällt.',
      tokenEfficiency:
        'Zeigt die Kosten pro 1 Million Tokens im Zeitverlauf. So lässt sich erkennen, ob Modellmix und Cache-Nutzung effizienter oder teurer werden.',
      modelMix:
        'Zeigt den prozentualen Kostenanteil der Modelle je Zeitraumspunkt. So werden Modellwechsel und Konzentration sichtbar.',
      distributionAnalysis:
        'Zeigt Histogramme für Kosten, Requests und Tokens pro Request. So wird die Streuung sichtbar, nicht nur der Durchschnitt.',
      correlationAnalysis:
        'Zeigt Punktdiagramme für mögliche Zusammenhänge, etwa Requests zu Kosten oder Cache-Rate zu Kosten pro Request. Die Korrelation ist ein Signal, aber kein Beweis für Kausalität.',
      heatmap:
        'Zeigt eine Kalender-Heatmap der täglichen Kosten. Dunklere Felder stehen für höhere Werte.',
      requestHeatmap:
        'Zeigt eine Kalender-Heatmap der Requests pro Tag. So werden Lastmuster unabhängig von Kosten sichtbar.',
      tokenHeatmap:
        'Zeigt eine Kalender-Heatmap des Tokenvolumens pro Tag. So lassen sich volumenstarke und kostenstarke Tage besser unterscheiden.',
      forecast:
        'Zeigt die Kostenprognose für den laufenden Monat auf Basis geglätteter Kalendertageskosten. Ergänzt wird sie durch Trend und Unsicherheitsband.',
      cacheROI:
        'Zeigt den Effekt der Cache-Nutzung, indem hypothetische Kosten ohne Cache mit den tatsächlichen Kosten verglichen werden.',
      providerLimitProgress:
        'Zeigt pro Anbieter, wie stark das konfigurierte Monatslimit bereits verbraucht ist. Überschreitungen werden separat markiert.',
      providerSubscriptionMix:
        'Vergleicht pro Anbieter die fixe Subscription mit den variablen API-Kosten und blendet optional das gesetzte Monatslimit ein.',
      providerLimitTimeline:
        'Zeigt im Monatsverlauf die Summe der aktuellen Provider-Kosten gegen die Summe aller konfigurierten Limits. So werden Engpässe früh sichtbar.',
      periodComparison:
        'Zeigt den Vergleich zweier Zeiträume, etwa Woche gegen Vorwoche oder Monat gegen Vormonat, anhand zentraler Kennzahlen.',
      anomalyDetection:
        'Zeigt auffällige Zeitraumspunkte mit ungewöhnlich hohen oder niedrigen Kosten. Grundlage ist die Abweichung vom Mittelwert in Standardabweichungen.',
    },
    section: {
      insights:
        'Zeigt verdichtete Aussagen zu Konzentration, Request-Ökonomie, Nutzungsmuster und Peak-Fenstern. Diese Sektion ist als schneller Einstieg vor dem Detailblick gedacht.',
      metrics:
        'Zeigt die wichtigsten Kennzahlen auf einen Blick. Hover über abgekürzte Werte zeigt den exakten Zahlenwert.',
      today:
        'Zeigt die KPIs des aktuellen Tages im Datensatz. So wird sichtbar, wie stark der Tageswert vom Zeitraumdurchschnitt abweicht.',
      currentMonth:
        'Zeigt die KPIs des laufenden Monats. So werden Fortschritt, Abdeckung und der Vergleich mit dem Vormonat sichtbar.',
      activity:
        'Zeigt Kalenderansichten für Kosten, Requests und Tokens. So werden Lastspitzen, Lücken und saisonale Muster sichtbar.',
      forecastCache:
        'Zeigt Monatsprognose, Cache-Ersparnis und operative Request-Qualität in einem Block. So entsteht ein gemeinsamer Blick auf Ausblick und Effizienz.',
      limits:
        'Zeigt pro Anbieter konfigurierte Subscriptions und Monatslimits. Die Sektion macht sichtbar, wie weit Kostenbudgets im aktuellen Ausschnitt ausgereizt sind.',
      costAnalysis:
        'Zeigt Kostenverlauf und Kostenverteilung nach Modell. So wird sichtbar, wo Geld ausgegeben wurde und welche Modelle die Haupttreiber sind.',
      tokenAnalysis:
        'Zeigt Tokenvolumen, Token-Typen, Wochentagsmuster und Effizienz. So lässt sich besser einordnen, ob Kosten eher aus Menge oder Preisniveau entstehen.',
      requestAnalysis:
        'Zeigt Requests gesamt, nach Modell und im Verlauf. Im Zoom kommen zusätzliche Trends und Verteilungen hinzu.',
      advancedAnalysis:
        'Zeigt Verteilungen, Korrelationen und Konzentrationsrisiken. So wird sichtbar, wie stabil, konzentriert oder ungewöhnlich die Nutzung ist.',
      comparisons:
        'Zeigt Veränderungen zwischen Perioden und markiert Ausreisser. So lassen sich Verschiebungen schneller einordnen.',
      tables:
        'Zeigt detaillierte Tabellen mit Sortierung und Drilldown. So lassen sich einzelne Modelle, Provider und Tage gezielt prüfen.',
    },
    feature: {
      requestQuality:
        'Zeigt verdichtete Request-Signale wie Tokens pro Request, Kosten pro Request sowie Cache- und Thinking-Anteil. So lässt sich die operative Anfragequalität schneller einordnen.',
      providerLimits:
        'Hier werden fixe Subscription-Kosten und variable Monatslimits pro Anbieter gepflegt. Die Eingaben bleiben lokal im Browser gespeichert und gelten nur für Anbieter, die im geladenen Report vorkommen.',
      concentrationRisk:
        'Zeigt die Abhängigkeit von einzelnen Modellen und Providern. Hohe Werte bedeuten, dass wenige Akteure einen grossen Teil der Kosten tragen.',
      providerEfficiency:
        'Zeigt den Vergleich der Anbieter nach Kosten, Requests, Tokens und Effizienzkennzahlen wie $/Req oder $/1M Tokens.',
      modelEfficiency:
        'Zeigt den Vergleich der Modelle nach Kosten, Volumen und Effizienz. So lassen sich teure oder ineffiziente Kandidaten schnell erkennen.',
      recentDays:
        'Zeigt die Detailtabelle pro Tag, Monat oder Jahr mit Drilldown und Benchmarks gegen Vortag und 7-Tage-Mittel.',
    },
  },
  en: {
    keyboardShortcuts: [
      { keys: '⌘ K', description: 'Open command palette' },
      { keys: 'ESC', description: 'Close dialog / zoom view' },
    ],
    metric: {
      totalCost:
        'Shows total API cost across the selected range. The calculation is based on configured per-model token prices.',
      totalTokens:
        'Shows the sum of all processed tokens across input, output, and cache. One token is roughly four text characters.',
      activeDays: 'Shows how many days in the selected range contain at least one API call.',
      topModel: 'Shows the model with the highest total cost in the current slice.',
      cacheHitRate:
        'Shows the share of tokens served from cache. Higher values usually indicate better cost efficiency.',
      costPerMillion:
        'Shows average cost per 1 million processed tokens. Lower values indicate more efficient usage.',
      mostExpensiveDay: 'Shows the period point with the highest API cost in the current slice.',
      cheapestDay: 'Shows the period point with the lowest API cost in the current slice.',
      avgCostPerDay: 'Shows the average cost per active period point.',
      outputTokens:
        'Shows the volume of generated output tokens. These are usually more expensive than pure input tokens.',
    },
    chart: {
      costOverTime:
        'Shows API cost over time together with a rolling 7-day average. Clicking a point opens the drilldown.',
      costByModel:
        'Shows cost distribution by model as a donut chart. This makes the main cost drivers visible.',
      costByModelOverTime:
        'Shows how cost per model evolves over time. Useful for spotting shifts in the model mix.',
      cumulativeCost:
        'Shows cumulative total cost over the selected range. When possible, a month-end projection is added.',
      costByWeekday:
        'Shows average cost by weekday, making recurring weekly load patterns visible.',
      tokensOverTime:
        'Shows token usage over time split by input, output, cache write, cache read, and thinking.',
      requestsOverTime:
        'Shows requests over time with total line, per-model lines, and a trend line. Clicking a point opens the drilldown.',
      requestCacheHitRate:
        'Shows cache hit rate per model together with the filtered overall total and the trailing 7-day average based on the selected daily range.',
      tokenTypes:
        'Shows the distribution of token types as a donut chart so input, output, cache, and thinking shares become visible.',
      tokenEfficiency:
        'Shows cost per 1 million tokens over time. This helps spot whether model mix and cache usage are becoming more or less efficient.',
      modelMix:
        'Shows the percentage cost share of models at each period point. This makes model shifts and concentration visible.',
      distributionAnalysis:
        'Shows histograms for costs, requests, and tokens per request. This highlights spread, not just averages.',
      correlationAnalysis:
        'Shows scatter plots for potential relationships such as requests to cost or cache rate to cost per request. Correlation is a signal, not proof of causality.',
      heatmap: 'Shows a calendar heatmap of daily cost. Darker cells indicate higher values.',
      requestHeatmap:
        'Shows a calendar heatmap of requests per day. This reveals load patterns independently of cost.',
      tokenHeatmap:
        'Shows a calendar heatmap of token volume per day. This helps distinguish high-volume days from high-cost days.',
      forecast:
        'Shows cost forecast for the current month based on smoothed calendar-day costs, complemented by trend and uncertainty band.',
      cacheROI:
        'Shows the impact of cache usage by comparing hypothetical no-cache costs with actual costs.',
      providerLimitProgress:
        'Shows how much of each configured monthly provider limit has already been used. Overruns are marked separately.',
      providerSubscriptionMix:
        'Compares fixed subscription cost with variable API cost per provider and can optionally include the configured monthly limit.',
      providerLimitTimeline:
        'Shows monthly provider cost against total configured limits over time so bottlenecks become visible early.',
      periodComparison:
        'Shows the comparison of two periods, such as week-over-week or month-over-month, using central metrics.',
      anomalyDetection:
        'Shows unusual period points with unusually high or low cost based on deviation from the mean in standard deviations.',
    },
    section: {
      insights:
        'Shows condensed statements about concentration, request economics, usage patterns, and peak windows. This section is meant as a fast entry point before deeper analysis.',
      metrics:
        'Shows the most important KPIs at a glance. Hover abbreviated values to see exact numbers.',
      today:
        'Shows the KPIs of the current day in the dataset. This makes it easy to compare the day against the period average.',
      currentMonth:
        'Shows the KPIs of the current month, including progress, coverage, and comparison to the previous month.',
      activity:
        'Shows calendar views for cost, requests, and tokens, making spikes, gaps, and seasonal patterns visible.',
      forecastCache:
        'Shows month forecast, cache savings, and operational request quality in one block for a combined outlook on efficiency.',
      limits:
        'Shows configured subscriptions and monthly limits per provider. This section makes it visible how far budgets are stretched in the current slice.',
      costAnalysis:
        'Shows cost trend and cost distribution by model so it is clear where spend happened and which models dominate.',
      tokenAnalysis:
        'Shows token volume, token types, weekday patterns, and efficiency so you can judge whether cost comes from volume or pricing level.',
      requestAnalysis:
        'Shows requests overall, by model, and over time. The expanded views add extra trends and distributions.',
      advancedAnalysis:
        'Shows distributions, correlations, and concentration risk so usage stability, concentration, and unusual behavior become visible.',
      comparisons:
        'Shows changes between periods and marks outliers so shifts can be understood faster.',
      tables:
        'Shows detailed tables with sorting and drilldown so individual models, providers, and days can be inspected directly.',
    },
    feature: {
      requestQuality:
        'Shows condensed request signals such as tokens per request, cost per request, and cache and thinking shares. This helps assess operational request quality faster.',
      providerLimits:
        'This is where fixed subscription cost and variable monthly limits are maintained per provider. Values are stored in the local app settings and only apply to providers present in the loaded report.',
      concentrationRisk:
        'Shows dependency on individual models and providers. Higher values mean that a small number of actors carries a large share of cost.',
      providerEfficiency:
        'Shows the provider comparison by cost, requests, tokens, and efficiency metrics such as $/req or $/1M tokens.',
      modelEfficiency:
        'Shows the model comparison by cost, volume, and efficiency so expensive or inefficient candidates are easy to spot.',
      recentDays:
        'Shows the detailed table per day, month, or year with drilldown and benchmarks against the previous day and 7-day average.',
    },
  },
} as const

function current() {
  return HELP_CONTENT[getCurrentLanguage()]
}

type AppHelpContent = typeof HELP_CONTENT.en
type HelpMap<T extends Record<string, string>> = { [K in keyof T]: string }
export type MetricHelp = HelpMap<AppHelpContent['metric']>
export type ChartHelp = HelpMap<AppHelpContent['chart']>
export type SectionHelp = HelpMap<AppHelpContent['section']>
export type FeatureHelp = HelpMap<AppHelpContent['feature']>

function dynamicMap<const T extends Record<string, string>>(selector: () => T): T {
  return new Proxy({} as T, {
    get: (_, key) => Reflect.get(selector(), key),
    has: (_, key) => key in selector(),
    ownKeys: () => Reflect.ownKeys(selector()),
    getOwnPropertyDescriptor: (_, key) => {
      const map = selector()
      if (!Object.prototype.hasOwnProperty.call(map, key)) return undefined

      return {
        value: Reflect.get(map, key),
        enumerable: true,
        configurable: true,
      }
    },
  })
}

export function getKeyboardShortcuts() {
  return current().keyboardShortcuts
}

export const METRIC_HELP: MetricHelp = dynamicMap(() => current().metric)
export const CHART_HELP: ChartHelp = dynamicMap(() => current().chart)
export const SECTION_HELP: SectionHelp = dynamicMap(() => current().section)
export const FEATURE_HELP: FeatureHelp = dynamicMap(() => current().feature)
