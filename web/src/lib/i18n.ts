import en from './i18n/en.json'
import ja from './i18n/ja.json'

export type Locale = 'en' | 'ja'
export type TranslationKey = string

const translations: Record<Locale, any> = {
  en,
  ja
}

// Get translation function
export function useTranslation(locale: Locale) {
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.')
    let value: any = translations[locale]

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value !== 'string') {
      console.warn(`Translation key not found: ${key}`)
      return key
    }

    // Replace placeholders
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
        return params[paramKey] || match
      })
    }

    return value
  }

  return { t, locale }
}

// Get default locale from localStorage or browser
export function getDefaultLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  
  const stored = localStorage.getItem('locale') as Locale | null
  if (stored && (stored === 'en' || stored === 'ja')) {
    return stored
  }
  
  // Try to detect from browser
  const browserLang = navigator.language.split('-')[0]
  if (browserLang === 'ja') return 'ja'
  
  return 'en'
}

// Set locale
export function setLocale(locale: Locale) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale)
  }
}
