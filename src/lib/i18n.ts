import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from '@/locales/de/common.json'
import en from '@/locales/en/common.json'
import type { AppLanguage } from '@/types'

export const SUPPORTED_LANGUAGES = ['de', 'en'] as const

export const LANGUAGE_LOCALES: Record<AppLanguage, string> = {
  de: 'de-CH',
  en: 'en-US',
}

function normalizeLanguage(value: unknown): AppLanguage {
  return value === 'en' ? 'en' : 'de'
}

export async function initI18n(language: AppLanguage = 'de') {
  const nextLanguage = normalizeLanguage(language)

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: {
        de: { common: de },
        en: { common: en },
      },
      lng: nextLanguage,
      fallbackLng: 'de',
      defaultNS: 'common',
      ns: ['common'],
      interpolation: {
        escapeValue: false,
      },
    })
  } else if (i18n.resolvedLanguage !== nextLanguage) {
    await i18n.changeLanguage(nextLanguage)
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = nextLanguage
  }
}

i18n.on('languageChanged', (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
  }
})

export function getCurrentLanguage(): AppLanguage {
  return normalizeLanguage(i18n.language)
}

export function getCurrentLocale(): string {
  return LANGUAGE_LOCALES[getCurrentLanguage()]
}

export default i18n
