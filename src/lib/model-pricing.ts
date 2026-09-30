import { getModelProvider, normalizeModelName } from './model-utils'

/** Versioned standard text API prices in USD per million tokens; recorded costs stay authoritative. */
export const PRICING_CHECKED_AT = '2026-09-30'

interface ModelPrice {
  provider: string
  modelId: string
  input: number
  cacheRead: number
  cacheWriteMin: number
  cacheWriteMax: number
  source: string
}

const anthropicSource = 'https://platform.claude.com/docs/en/about-claude/pricing'
const claude = (modelId: string, input: number): ModelPrice => ({
  provider: 'Anthropic',
  modelId,
  input,
  cacheRead: input * 0.1,
  cacheWriteMin: input * 1.25,
  cacheWriteMax: input * 2,
  source: anthropicSource,
})
const openai = (modelId: string, input: number, cacheRead: number): ModelPrice => ({
  provider: 'OpenAI',
  modelId,
  input,
  cacheRead,
  cacheWriteMin: input,
  cacheWriteMax: input,
  source: `https://developers.openai.com/api/docs/models/${modelId}`,
})

const prices = new Map<string, ModelPrice>([
  ['Anthropic:Claude Opus 4.6', claude('claude-opus-4-6', 5)],
  ['Anthropic:Claude Opus 4.5', claude('claude-opus-4-5', 5)],
  ['Anthropic:Claude Sonnet 4.6', claude('claude-sonnet-4-6', 3)],
  ['Anthropic:Claude Sonnet 4.5', claude('claude-sonnet-4-5', 3)],
  ['Anthropic:Claude Haiku 4.5', claude('claude-haiku-4-5', 1)],
  ['OpenAI:GPT-5.4', openai('gpt-5.4', 2.5, 0.25)],
  ['OpenAI:GPT-5', openai('gpt-5', 1.25, 0.125)],
])

/** Resolves model aliases within their actual provider, never borrowing another provider's tariff. */
export function resolveModelPrice(rawName: string): ModelPrice | null {
  const provider = getModelProvider(rawName)
  const label = normalizeModelName(rawName)
  const canonicalLabel =
    provider === 'Anthropic' && /^(Opus|Sonnet|Haiku) /.test(label) ? `Claude ${label}` : label
  return prices.get(`${provider}:${canonicalLabel}`) ?? null
}
