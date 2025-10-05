import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Badminstar',
    short_name: 'Badminstar',
    description: 'Your Badminton Friends',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#80644f',
    icons: [
      {
        src: 'shuttlecock.png',
        sizes: '192x192',
        type: 'image/png',
      },
      // {
      //   src: '/icon-512x512.png',
      //   sizes: '512x512',
      //   type: 'image/png',
      // },
    ],
  }
}