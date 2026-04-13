import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import {
  getModelProvider as getUiModelProvider,
  normalizeModelName as normalizeUiModelName,
} from '@/lib/model-utils'

const require = createRequire(import.meta.url)
const {
  __test__: {
    getModelProvider: getReportModelProvider,
    normalizeModelName: normalizeReportModelName,
  },
} = require('../../server/report/utils.js') as {
  __test__: {
    getModelProvider: (raw: string) => string
    normalizeModelName: (raw: string) => string
  }
}

const MODEL_CASES = [
  { raw: 'claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic' },
  { raw: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', provider: 'Anthropic' },
  { raw: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { raw: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
  { raw: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { raw: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
  { raw: 'gpt-5.3-codex', name: 'GPT-5.3 Codex', provider: 'OpenAI' },
  { raw: 'gpt-5-4-codex', name: 'GPT-5.4 Codex', provider: 'OpenAI' },
  { raw: 'gpt-5.4', name: 'GPT-5.4', provider: 'OpenAI' },
  { raw: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
  { raw: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  {
    raw: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    provider: 'Google',
  },
  {
    raw: 'gemini-3-flash-preview-experimental',
    name: 'Gemini 3 Flash Preview Experimental',
    provider: 'Google',
  },
  { raw: 'codex-mini-latest', name: 'Codex Mini', provider: 'OpenAI' },
  { raw: 'o4-mini', name: 'o4 Mini', provider: 'OpenAI' },
  { raw: 'o1', name: 'o1', provider: 'OpenAI' },
  { raw: 'opencode', name: 'OpenCode', provider: 'OpenCode' },
] as const

describe('model normalization parity', () => {
  it.each(MODEL_CASES)('normalizes $raw consistently in UI and report', ({ raw, name }) => {
    expect(normalizeUiModelName(raw)).toBe(name)
    expect(normalizeReportModelName(raw)).toBe(name)
  })

  it.each(MODEL_CASES)(
    'maps provider for $raw consistently in UI and report',
    ({ raw, provider }) => {
      expect(getUiModelProvider(raw)).toBe(provider)
      expect(getReportModelProvider(raw)).toBe(provider)
    },
  )
})
