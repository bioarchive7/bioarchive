import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bioarchive-green': '#1a4a2e',
        'bioarchive-dark-green': '#0f2f1e',
        'bioarchive-amber': '#d4a853',
        'bioarchive-bg': '#f8f7f4',
        'bioarchive-text': '#1c1c1e',
      },
      fontFamily: {
        inter: 'var(--font-inter)',
      },
      borderRadius: {
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
}
export default config
