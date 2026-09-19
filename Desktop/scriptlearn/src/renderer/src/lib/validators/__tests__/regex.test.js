// Tests du validateur Regex.
//
// POURQUOI ces tests en priorité : ce validateur exécute du code écrit par
// l'élève (new RegExp) sur le thread de l'interface. Deux propriétés doivent
// tenir dans le temps : (1) une réponse correcte passe, une réponse fausse
// échoue ; (2) un motif pathologique est REFUSÉ avant d'être exécuté, sinon la
// fenêtre gèle sans possibilité d'annuler (le moteur RegExp n'est pas interruptible).
//
// Compatible vitest ET bun test (même API describe/it/expect).
import { describe, it, expect } from 'vitest'
import { validateRegex } from '../regex.js'

const chapter = (regexTests) => ({ regexTests })

describe('validateRegex', () => {
  it('accepte un motif qui reconnaît et rejette ce qu\'il faut', () => {
    const res = validateRegex(chapter({
      mustMatch: ['2026-09-18'],
      mustReject: ['18/09/2026'],
    }), '^\\d{4}-\\d{2}-\\d{2}$')
    expect(res.correct).toBe(true)
  })

  it('refuse un motif qui reconnaît une chaîne à rejeter', () => {
    const res = validateRegex(chapter({
      mustMatch: ['abc'],
      mustReject: ['abc123'],
    }), 'abc')
    expect(res.correct).toBe(false)
  })

  it('vérifie les groupes de capture', () => {
    const ok = validateRegex(chapter({
      captures: [{ input: 'user=alice', groups: ['alice'] }],
    }), 'user=(\\w+)')
    expect(ok.correct).toBe(true)

    const ko = validateRegex(chapter({
      captures: [{ input: 'user=alice', groups: ['alice'] }],
    }), 'user=\\w+')
    expect(ko.correct).toBe(false)
  })

  it('n\'est pas faussé par le drapeau g entre deux cas', () => {
    // Avec le drapeau g, test() reprend à lastIndex : sans remise à zéro, le
    // deuxième appel renvoie false à tort.
    const res = validateRegex({ regexTests: { flags: 'g', mustMatch: ['aa', 'aa'] } }, 'a')
    expect(res.correct).toBe(true)
  })

  it('signale un motif invalide au lieu de lever', () => {
    const res = validateRegex(chapter({ mustMatch: ['x'] }), '(')
    expect(res.correct).toBe(false)
    expect(res.output).toMatch(/invalide/i)
  })

  it('refuse un exercice sans aucun cas de test', () => {
    expect(validateRegex(chapter({}), 'a').correct).toBe(false)
  })

  // ── Garde-fou ReDoS ───────────────────────────────────────────────────────
  it('refuse un quantificateur imbriqué sur un atome unique', () => {
    for (const pattern of ['(a+)+$', '(\\w+)*', '([0-9]*)+']) {
      const res = validateRegex(chapter({ mustMatch: ['aaaa'] }), pattern)
      expect(res.correct).toBe(false)
      expect(res.output).toMatch(/ReDoS/)
    }
  })

  it('laisse passer les motifs imbriqués légitimes du parcours', () => {
    // ex-regex-l3-m2-1 et ex-regex-l1-m2-* : groupes à plusieurs atomes.
    const res = validateRegex(chapter({ mustMatch: ['un deux trois'], mustReject: [''] }), '^\\w+(?:\\s+\\w+)*$')
    expect(res.output).not.toMatch(/ReDoS/)
    expect(res.correct).toBe(true)
  })

  it('refuse un motif démesuré', () => {
    const res = validateRegex(chapter({ mustMatch: ['x'] }), 'a'.repeat(600))
    expect(res.correct).toBe(false)
    expect(res.output).toMatch(/trop long/i)
  })
})
