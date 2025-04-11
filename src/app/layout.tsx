import type { Metadata } from 'next'
import './globals.css'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { Nunito } from 'next/font/google'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../theme'
import Layout from './components/Layout'
import Providers from './providers'

const nunito = Nunito({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
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

      <body className={`${nunito.variable}`} >
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <Providers>
              <Layout>
                {children}
              </Layout>
            </Providers>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
