"use client"

import { Globe } from 'lucide-react'
import { useLanguage } from './language-provider'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  const languages = [
    { code: 'en' as const, label: 'English', flag: '🇺🇸' },
    { code: 'ja' as const, label: '日本語', flag: '🇯🇵' },
  ]

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]
  
  // Find next language to toggle to
  const getNextLanguage = () => {
    const currentIndex = languages.findIndex(lang => lang.code === locale)
    const nextIndex = (currentIndex + 1) % languages.length
    return languages[nextIndex]
  }

  const handleToggle = () => {
    const nextLang = getNextLanguage()
    setLocale(nextLang.code)
  }

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      aria-label="Switch language"
      title={`Click to switch to ${getNextLanguage().label}`}
    >
      <Globe className="h-4 w-4 text-gray-700" />
      <span className="text-sm font-medium text-gray-700">{currentLanguage.flag} {currentLanguage.label}</span>
    </button>
  )
}
