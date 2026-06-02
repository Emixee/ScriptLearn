/**
 * PreviewPane — panneau d'aperçu HTML/PHP dans les exercices et le Sandbox.
 *
 * POURQUOI ce composant existe :
 * HTML et PHP génèrent un rendu visuel que le terminal seul ne peut pas afficher.
 * Un iframe avec srcdoc permet de rendre le HTML directement dans l'application,
 * sans serveur HTTP intermédiaire et sans quitter la fenêtre Electron.
 *
 * SÉCURITÉ — attribut sandbox de l'iframe :
 * - "allow-scripts"  : permet au JavaScript inline de l'utilisateur d'exécuter
 *                      (nécessaire pour les exercices HTML avec JS)
 * - "allow-forms"    : permet les formulaires HTML (exercices de formulaires)
 * - PAS de "allow-same-origin" : sans cet attribut, les scripts de l'iframe
 *                      tournent dans une origine opaque — ils ne peuvent PAS
 *                      accéder à window.electronAPI ni aux APIs Node.js du parent.
 *                      C'est la frontière de sécurité critique qui empêche le code
 *                      de l'étudiant d'interagir avec l'application Electron.
 */
export default function PreviewPane({ srcDoc, label, langColor }) {
  return (
    <div className="flex flex-col h-full">
      {/* Barre de titre — miroir visuel des barres Terminal et Référence */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#111110] border-b border-[#2e2b26] flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langColor}99` }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langColor}50` }} />
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langColor}25` }} />
        </div>
        <span className="text-stone-500 text-xs ml-2">Aperçu — {label}</span>
      </div>

      {/* Zone de rendu — fond blanc pour simuler un navigateur */}
      <div className="flex-1 overflow-hidden bg-white">
        <iframe
          // srcdoc passe le HTML directement comme contenu — pas de requête réseau,
          // pas de fichier temporaire. Le rendu se fait entièrement en mémoire.
          srcDoc={srcDoc || '<body style="background:#111110;margin:0"></body>'}
          sandbox="allow-scripts allow-forms"
          className="w-full h-full border-0"
          title={`Aperçu ${label}`}
        />
      </div>
    </div>
  )
}
