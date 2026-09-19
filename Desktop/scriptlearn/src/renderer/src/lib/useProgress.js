// ============================================================================
// useProgress — lecture de la progression du profil actif, factorisée.
//
// POURQUOI ce hook : onze pages appelaient `store.getProgress(profile.id)` dans
// leur propre useEffect, AUCUNE avec un `.catch` ni de garde d'obsolescence.
// Conséquences concrètes : un rejet IPC produisait une « unhandled rejection » et
// laissait la page sur des compteurs à zéro sans explication, et une réponse
// arrivant après un changement de profil écrasait les données du nouveau profil.
//
// Ce hook ne met PAS en cache entre les pages : chaque page relit au montage, ce
// qui garantit des chiffres à jour après une session d'exercices (c'est le
// comportement attendu ici — un cache partagé demanderait une invalidation
// explicite à chaque validation d'exercice, de mission et de lab).
// ============================================================================

import { useState, useEffect } from 'react'
import { useProfile } from '../contexts/ProfileContext'

/**
 * @param {boolean} withActivity - charger aussi les dates d'activité
 * @returns {{ progress: object, activity: string[], loaded: boolean }}
 */
export function useProgress(withActivity = false) {
  const { profile } = useProfile()
  const [progress, setProgress] = useState({})
  const [activity, setActivity] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!profile) return
    // `cancelled` : neutralise les réponses qui arrivent après un démontage ou un
    // changement de profil.
    let cancelled = false
    setLoaded(false)
    const calls = [window.electronAPI.store.getProgress(profile.id)]
    if (withActivity) calls.push(window.electronAPI.store.getActivity(profile.id))
    Promise.all(calls)
      .then(([p, a]) => {
        if (cancelled) return
        setProgress(p ?? {})
        if (withActivity) setActivity(a ?? [])
      })
      .catch(() => { /* on garde les valeurs par défaut : la page reste utilisable */ })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [profile?.id, withActivity])

  return { progress, activity, loaded }
}
