import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      padding: {
        '1': '3px',
        '2': '5px',
        '3': '8px'
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        main: '#80644f'
      },
    },
  },
  plugins: [],
} satisfies Config
