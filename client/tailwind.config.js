/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef6f3',
          100: '#fcebe5',
          200: '#f9d3c5',
          300: '#f5b59e',
          400: '#ee8b6a',
          500: '#e56b40',
          600: '#d95326',
          700: '#b53f19',
          800: '#943517',
          900: '#732c14'
        }
      },
      fontFamily: {
        sans: ['"Prompt"', 'Inter', 'Noto Sans Thai', 'sans-serif']
      },
      fontSize: {
        '2xs': ['0.85rem', { lineHeight: '1.35rem' }],   // ~14.5px
        'xs': ['0.95rem', { lineHeight: '1.45rem' }],    // ~16px (legible, not bloated)
        'sm': ['1.05rem', { lineHeight: '1.55rem' }],    // ~18px
        'base': ['1.15rem', { lineHeight: '1.65rem' }],  // ~19.5px
        'lg': ['1.3rem', { lineHeight: '1.85rem' }],     // ~22px
        'xl': ['1.45rem', { lineHeight: '2.05rem' }],    // ~25px
        '2xl': ['1.65rem', { lineHeight: '2.3rem' }],    // ~28px
        '3xl': ['1.95rem', { lineHeight: '2.6rem' }],    // ~33px
        '4xl': ['2.35rem', { lineHeight: '3.0rem' }],    // ~40px
        '5xl': ['2.85rem', { lineHeight: '3.5rem' }],    // ~48px
        '6xl': ['3.4rem', { lineHeight: '4.1rem' }],     // ~58px
      }
    },
  },
  plugins: [],
}
