import { Component } from 'react'

/**
 * Composant de protection contre les erreurs JavaScript non gérées.
 *
 * POURQUOI ce composant est indispensable :
 * Sans ErrorBoundary, toute erreur dans un composant React (ReferenceError,
 * TypeError, etc.) fait démonter TOUTE l'arborescence React → écran blanc total,
 * sans aucun message. L'utilisateur ne peut pas savoir ce qui s'est passé.
 *
 * Avec ErrorBoundary, l'erreur est interceptée et on affiche un message clair,
 * ce qui permet de diagnostiquer et corriger le problème.
 *
 * Limitation : les ErrorBoundaries React ne capturent PAS les erreurs dans :
 * - les gestionnaires d'événements (onClick, etc.) → utiliser try/catch
 * - le code asynchrone (setTimeout, fetch) → utiliser try/catch
 * - le code du serveur (SSR) → non applicable ici
 * Elles capturent uniquement les erreurs pendant le rendu, useEffect et les constructeurs.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    // hasError : true quand une erreur a été capturée
    // error : l'objet Error pour afficher le message
    this.state = { hasError: false, error: null }
  }

  // getDerivedStateFromError est appelé pendant le rendu quand un enfant lève une erreur.
  // Il doit retourner un objet pour mettre à jour l'état — il ne doit PAS avoir d'effets de bord.
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  // componentDidCatch est appelé après le rendu de l'UI de secours.
  // C'est ici qu'on peut logger l'erreur (console, service de monitoring, etc.)
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Erreur capturée :', error)
    console.error('[ErrorBoundary] Composant :', info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#0a0a09] p-8">
          <div className="bg-[#111110] border border-red-500/30 rounded p-8 max-w-lg w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-white text-xl font-bold mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-stone-400 text-sm mb-4">
              Un problème inattendu a interrompu l'affichage de cette page.
            </p>
            {/* Afficher le message d'erreur technique pour faciliter le débogage */}
            {this.state.error && (
              <pre className="text-red-400 text-xs bg-[#0a0a09] rounded-sm p-3 mb-5 text-left overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                // Réinitialiser l'état de l'ErrorBoundary pour permettre une nouvelle tentative.
                // Dans la plupart des cas, recharger la page est plus fiable.
                this.setState({ hasError: false, error: null })
                window.location.hash = '#/'
              }}
              className="bg-[#d97706] hover:bg-[#b45309] text-[#0a0a09] px-6 py-2.5 rounded font-medium transition-colors text-sm"
            >
              ← Retour à l'accueil
            </button>
          </div>
        </div>
      )
    }

    // Rendu normal : passer les enfants sans modification
    return this.props.children
  }
}
