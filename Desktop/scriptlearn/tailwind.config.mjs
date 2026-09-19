/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/src/**/*.{js,jsx,ts,tsx}',
    './src/renderer/index.html'
  ],
  theme: {
    extend: {
      colors: {
        // ── Terminal Ambre — système de couleurs ────────────────────────────
        // Fonds : noir chaud (légèrement teinté brun, pas navy ni bleu)
        base:     '#0a0a09',    // fond le plus profond
        surface:  '#111110',    // cartes, panneaux (remplace #1a1d2e)
        elevated: '#1c1c1a',    // hover, surélevé (remplace #232640)
        // Bordures
        subtle:   '#2e2b26',    // bordure standard (remplace #2d3748)
        'subtle-2': '#3d3a34',  // bordure hover (remplace #3d4756)
        // Accent ambre (remplace indigo #6366f1)
        accent: {
          DEFAULT: '#d97706',   // amber-600
          hover:   '#b45309',   // amber-700
          bright:  '#fbbf24',   // amber-400 (éléments lumineux)
          dim:     'rgba(217,119,6,0.15)',  // fond transparent accent
        },
        // Texte chaud (crème, pas blanc froid)
        cream:    '#f5f0e8',    // texte principal chaud
        // Anciens tokens maintenus pour rétrocompatiblité (certains fichiers les utilisent)
        'surface-2': '#1c1c1a',
        'accent-hover': '#b45309',
        border: '#2e2b26',
      },
      fontFamily: {
        // JetBrains Mono comme font principale — cohérent pour un outil de scripting
        // Fallback vers d'autres monospace populaires chez les développeurs
        sans: ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
      }
    }
  },
  plugins: []
}
