import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from '@/locales/de/common.json'
import en from '@/locales/en/common.json'

export const LANGUAGE_STORAGE_KEY = 'ttdash-language'
export const SUPPORTED_LANGUAGES = ['de', 'en'] as const
export type AppLanguage = typeof SUPPORTED_LANGUAGES[number]

export const LANGUAGE_LOCALES: Record<AppLanguage, string> = {
  de: 'de-CH',
  en: 'en-US',
}

function getStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'de'
  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return value === 'en' ? 'en' : 'de'
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { common: de },
      en: { common: en },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'de',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', (language) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language
  }
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language
}

export function getCurrentLanguage(): AppLanguage {
  return i18n.language === 'en' ? 'en' : 'de'
}

export function getCurrentLocale(): string {
  return LANGUAGE_LOCALES[getCurrentLanguage()]
}

export default i18n
