"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useTranslation, type Locale, getDefaultLocale, setLocale as setLocaleStorage } from '@/lib/i18n'

interface LanguageContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const { t } = useTranslation(locale)

  // Load locale from localStorage on mount
  useEffect(() => {
    setLocaleState(getDefaultLocale())
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    setLocaleStorage(newLocale)
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
