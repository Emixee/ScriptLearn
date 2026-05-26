import fr from './fr'
import en from './en'

const translations = { fr, en }

export function t(lang, key) {
  const keys = key.split('.')
  let current = translations[lang] || translations.fr
  for (const k of keys) {
    if (current == null) return key
    current = current[k]
  }
  return current ?? key
}

export { fr, en }
export default translations
