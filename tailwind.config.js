/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#07111f',
          900: '#0d1b2e',
          800: '#112240',
          700: '#1a3050',
          600: '#1e3a5f',
        },
      }
    },
  },
  plugins: [],
}
