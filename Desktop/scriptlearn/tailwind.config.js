/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/src/**/*.{js,jsx,ts,tsx}',
    './src/renderer/index.html'
  ],
  theme: {
    extend: {
      colors: {
        surface: '#1a1d2e',
        'surface-2': '#232640',
        accent: '#6366f1',
        'accent-hover': '#4f46e5',
        border: '#2d3748'
      }
    }
  },
  plugins: []
}
