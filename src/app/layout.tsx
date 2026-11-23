import type { Metadata } from 'next'
import { Suspense } from 'react'
import '@fontsource/nunito/300.css'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/500.css'
import '@fontsource/nunito/700.css'
import '@fontsource/ibm-plex-sans-thai/400.css'
import '@fontsource/ibm-plex-sans-thai/500.css'
import '@fontsource/ibm-plex-sans-thai/600.css'
import './globals.css'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../theme'
import Providers from './providers'
import { TranslationWrapper } from './components/TranslationWrapper'
import RouteAnalyticsTracker from './components/analytics/RouteAnalyticsTracker'

export const metadata: Metadata = {
  title: 'Badminstar | Your Badminton Community Hub',
  description: 'Connect with badminton players of all levels, join sessions, find partners, and participate in events on BadminStar.',
  openGraph: {
    title: 'BadminStar | Your Badminton Community Hub',
    description: 'Engage with fellow badminton enthusiasts, find sessions, partners, and events on BadminStar.',
    url: 'https://www.badminstar.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BadminStar | The Badminton Community Hub',
    description: 'Connect, play, and grow with badminton enthusiasts worldwide.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <Providers>
              <Suspense fallback={null}>
                <RouteAnalyticsTracker />
              </Suspense>
              <TranslationWrapper>
                {children}
              </TranslationWrapper>
            </Providers>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
