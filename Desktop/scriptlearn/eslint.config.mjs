// ============================================================================
// Configuration ESLint (« flat config », ESLint 9).
//
// POURQUOI ce fichier existe : le projet n'avait AUCUN linter. Plusieurs défauts
// trouvés à la main lors de l'audit du 18/09/2026 auraient été signalés
// automatiquement par les deux règles de react-hooks :
//   • un useEffect sans tableau de dépendances qui réattachait un écouteur clavier
//     à chaque frappe (Exercise.jsx) ;
//   • des dépendances manquantes provoquant l'usage de valeurs périmées.
// La règle no-unused-vars attrape, elle, les états morts (showHint, qui n'était
// jamais mis à true) et les imports laissés derrière un refactor.
//
// Le parti pris est un jeu de règles VOLONTAIREMENT restreint : mieux vaut peu de
// règles réellement respectées qu'une configuration stricte désactivée au premier
// build rouge. `npm run lint` doit rester vert.
// ============================================================================
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    // Rien à linter dans les dépendances, les sorties de build, les toolchains
    // téléchargées ni les assets v86/sqljs (code tiers minifié).
    ignores: [
      'node_modules/**',
      'out/**',
      'dist/**',
      'resources/**',
      'installer/output/**',
      'src/renderer/public/**',
    ],
  },

  // ── Processus principal et preload : Node + Electron, modules ESM ──────────
  {
    files: ['src/main/**/*.js', 'src/preload/**/*.js', 'scripts/**/*.mjs', '*.config.js', '*.config.mjs', 'dev.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Les blocs catch vides sont un choix ASSUMÉ dans ce code (« best-effort »),
      // toujours commentés. On exige juste qu'ils soient vraiment vides.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ── Renderer : React + navigateur ─────────────────────────────────────────
  {
    files: ['src/renderer/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,
      // React 18 + Vite : plus besoin d'importer React pour le JSX.
      'react/react-in-jsx-scope': 'off',
      // Le projet n'utilise pas PropTypes (et n'a pas TypeScript) : la règle
      // produirait des centaines d'avertissements sans valeur ajoutée.
      'react/prop-types': 'off',
      // Le contenu pédagogique local est rendu en HTML après désinfection
      // (utils/sanitizeHtml.js) : la règle ne saurait pas le voir.
      'react/no-danger': 'off',
      // POURQUOI désactivée : l'application est ENTIÈREMENT en français, donc
      // l'apostrophe est partout (« l'élève », « n'est pas »). La règle produisait
      // 30 erreurs sur du texte parfaitement correct. Elle existe pour attraper des
      // `>` ou `"` égarés qui casseraient le JSX — mais React échappe déjà les
      // nœuds de texte, il n'y a donc aucun risque de sécurité ni de rendu ici.
      'react/no-unescaped-entities': 'off',
      // LES DEUX RÈGLES QUI COMPTENT ICI.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ── Tests (vitest) ────────────────────────────────────────────────────────
  {
    files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: { ...js.configs.recommended.rules },
  },
]
