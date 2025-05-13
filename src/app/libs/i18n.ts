'use client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
// import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation resources directly to avoid loading issues
import en from '../locales/en.json'
import th from '../locales/th.json'
import { DEFAULT_LANGUAGE } from '../constants'

const resources = {
  th: { translation: th },
  en: { translation: en },
}

// Initialize only once
if (!i18n.isInitialized) {
  i18n
  // .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: DEFAULT_LANGUAGE,
      resources,
      interpolation: {
        escapeValue: false
      },
      // TODO: figure out how to use language detector
      // detection: {
      //   order: ['localStorage', 'navigator'],
      //   caches: ['localStorage']
      // }
    })
}

export default i18n