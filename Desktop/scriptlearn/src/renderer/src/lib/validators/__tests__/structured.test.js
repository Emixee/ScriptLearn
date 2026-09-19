// Tests du validateur « structured » (KQL, SPL).
//
// POURQUOI : ni KQL ni SPL n'ont de moteur exécutable hors-ligne. Ce validateur
// est donc le plus solide dont on dispose pour ces deux parcours, et sa promesse
// tient en une phrase : les étapes du pipeline doivent apparaître DANS L'ORDRE.
// C'est précisément ce que ces tests figent.
import { describe, it, expect } from 'vitest'
import { validateStructured } from '../structured.js'

const chapter = (pipeline) => ({ pipeline })

describe('validateStructured', () => {
  const pipeline = [
    { all: ['securityevent'], label: 'table source' },
    { all: ['where', '4625'], label: 'filtre EventID' },
    { all: ['summarize', 'count'], label: 'agrégation' },
  ]

  it('accepte un pipeline complet dans le bon ordre', () => {
    const res = validateStructured(chapter(pipeline),
      'SecurityEvent | where EventID == 4625 | summarize Count=count() by Account')
    expect(res.correct).toBe(true)
  })

  it('refuse le même pipeline dans le mauvais ordre', () => {
    const res = validateStructured(chapter(pipeline),
      'SecurityEvent | summarize Count=count() by Account | where EventID == 4625')
    expect(res.correct).toBe(false)
  })

  it('refuse une étape manquante', () => {
    const res = validateStructured(chapter(pipeline), 'SecurityEvent | where EventID == 4625')
    expect(res.correct).toBe(false)
  })

  it('est insensible à la casse', () => {
    const res = validateStructured(chapter([{ all: ['WHERE'] }]), 'Table | where x == 1')
    expect(res.correct).toBe(true)
  })

  it('refuse un acte sans pipeline déclaré au lieu de le valider', () => {
    expect(validateStructured(chapter([]), 'nimporte quoi').correct).toBe(false)
  })
})
