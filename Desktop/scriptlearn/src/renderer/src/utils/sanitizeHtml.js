// ============================================================================
// sanitizeHtml — désinfection du HTML produit par `marked` avant injection
// via dangerouslySetInnerHTML.
//
// POURQUOI ce fichier existe :
// `marked` NE désinfecte plus rien depuis sa v5 (l'option `sanitize` a été
// retirée). Tout HTML brut présent dans un texte markdown est donc recopié
// TEL QUEL dans le DOM. Dans un renderer Electron, c'est bien plus grave que
// sur le web : `window.electronAPI` (preload) expose `terminal.runValidation`,
// `terminal.write` et `app.saveScript`. Un simple
//     <img src=x onerror="electronAPI.terminal.runValidation({lang:'python',code:'...'})">
// glissé dans un contenu rendu = exécution de code sur la machine de l'élève.
// Le contenu des leçons est local (donc de confiance), mais les notes de
// release GitHub et les réponses d'un modèle Ollama ne le sont PAS.
//
// POURQUOI un sanitizer maison et pas DOMPurify :
// l'app doit rester 100 % hors-ligne et sans dépendance supplémentaire à
// embarquer dans l'installateur. La surface à couvrir est petite : on part
// d'une LISTE BLANCHE (tout ce qui n'est pas explicitement autorisé disparaît),
// ce qui est la seule approche sûre — une liste noire se contourne toujours.
//
// POURQUOI DOMParser et pas des regex :
// analyser du HTML à la regex est un anti-pattern connu (attributs sans
// guillemets, balises imbriquées, encodages exotiques). DOMParser construit un
// arbre INERTE (les scripts ne s'exécutent pas, les images ne se chargent pas,
// `onerror` ne part pas) : on peut le filtrer tranquillement avant de le
// remettre dans la page.
// ============================================================================

// Balises autorisées : exactement ce que produit notre renderer marked
// (utils/markdown.js) + le markdown de base. Toute autre balise est « dépliée »
// (voir plus bas) ou supprimée.
const ALLOWED_TAGS = new Set([
  'P', 'BR', 'HR', 'SPAN', 'DIV',
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL', 'MARK', 'SMALL', 'SUP', 'SUB',
  'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
  'BLOCKQUOTE', 'UL', 'OL', 'LI', 'DL', 'DT', 'DD',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD',
  'A', 'DETAILS', 'SUMMARY',
])

// Balises supprimées AVEC leur contenu : garder le texte d'un <script> ou d'un
// <style> n'aurait aucun sens et pourrait ré-injecter du code si le résultat
// était un jour re-parsé.
const DROP_WITH_CONTENT = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'APPLET', 'LINK', 'META',
  'BASE', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'OPTION',
  'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH', 'AUDIO', 'VIDEO', 'SOURCE', 'TRACK',
  'CANVAS', 'IMG',
])

// Attributs autorisés. `class` est indispensable : tout le style de l'app passe
// par les classes Tailwind écrites par notre renderer. `href` est autorisé mais
// filtré (voir isSafeHref) : `javascript:` exécute du code au clic.
// TOUT le reste tombe — en particulier les `on*` (onerror, onclick, onload…),
// `style` (qui permet des exfiltrations via url()), `srcdoc` et `formaction`.
const ALLOWED_ATTRS = new Set(['class', 'title', 'colspan', 'rowspan', 'open'])

function isSafeHref(value) {
  // On normalise avant de tester : « JaVaScRiPt: », les espaces et les
  // caractères de contrôle (\t, \n) sont ignorés par les navigateurs dans une
  // URL, donc un simple startsWith('javascript:') se contourne.
  const v = String(value).replace(/[\u0000- ]/g, '').toLowerCase()
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:') || v.startsWith('#')
}

/**
 * Filtre un fragment HTML et renvoie une chaîne HTML sûre.
 * @param {string} html - HTML potentiellement hostile (sortie de marked)
 * @returns {string} HTML ne contenant que des balises/attributs autorisés
 */
export function sanitizeHtml(html) {
  if (!html) return ''
  // Hors navigateur (tests Node sans jsdom), on ne peut pas parser : on renvoie
  // une version échappée plutôt que du HTML non filtré — « fail closed ».
  if (typeof DOMParser === 'undefined') {
    return String(html).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  const doc = new DOMParser().parseFromString(String(html), 'text/html')

  // On parcourt une COPIE de la liste des nœuds : on modifie l'arbre pendant
  // l'itération, et une NodeList vivante sauterait des éléments.
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3 /* texte */) continue
      if (child.nodeType === 8 /* commentaire */) { child.remove(); continue }
      if (child.nodeType !== 1 /* élément */) { child.remove(); continue }

      const tag = child.tagName.toUpperCase()

      if (DROP_WITH_CONTENT.has(tag)) { child.remove(); continue }

      if (!ALLOWED_TAGS.has(tag)) {
        // « Déplier » : on remonte les enfants à la place du parent interdit.
        // POURQUOI ne pas simplement supprimer : le contenu des leçons contient
        // des extraits HTML/C++ en prose (`<section>`, `<vector>`…) ; supprimer
        // le nœud ferait disparaître le texte utile autour.
        walk(child)
        const parent = child.parentNode
        while (child.firstChild) parent.insertBefore(child.firstChild, child)
        child.remove()
        continue
      }

      for (const attr of [...child.attributes]) {
        const name = attr.name.toLowerCase()
        if (name === 'href' && tag === 'A') {
          if (!isSafeHref(attr.value)) child.removeAttribute(attr.name)
          continue
        }
        if (!ALLOWED_ATTRS.has(name)) child.removeAttribute(attr.name)
      }

      walk(child)
    }
  }

  walk(doc.body)
  return doc.body.innerHTML
}
