import type { Metadata } from 'next'
import './globals.css'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { Nunito, IBM_Plex_Sans_Thai  } from 'next/font/google'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../theme'
import Providers from './providers'
import { TranslationWrapper } from './components/TranslationWrapper'

const nunito = Nunito({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
})

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  weight: ['400', '500', '600'],  // specify the font weights you want to use
  subsets: ['latin', 'thai'], // specify the subsets (if using Thai characters)
})

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
      <body className={`${ibmPlexSansThai.className} ${nunito.className}`} >
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <Providers>
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
