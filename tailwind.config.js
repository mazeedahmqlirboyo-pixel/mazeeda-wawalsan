/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mazeeda-blue': '#1e3a8a',
        'mazeeda-navy': '#172554',
      }
    },
  },
  plugins: [],
}
