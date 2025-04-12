'use client'

import { I18nProvider } from './I18nProvider'
import { ReactNode } from 'react'

export function TranslationWrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}