/** @type {import('tailwindcss').Config} */
export default {
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
          500: '#e56b40',
          600: '#d95326',
          900: '#732c14'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'sans-serif']
      }
    },
  },
  plugins: [],
}
