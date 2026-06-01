import { marked } from 'marked'
import Prism from 'prismjs'
// Grammaires additionnelles (bash et powershell sont les plus importants)
import 'prismjs/components/prism-bash.js'
import 'prismjs/components/prism-powershell.js'
import 'prismjs/components/prism-python.js'
import 'prismjs/components/prism-javascript.js'
import 'prismjs/components/prism-csharp.js'
import 'prismjs/components/prism-json.js'
import 'prismjs/components/prism-yaml.js'
import 'prismjs/components/prism-makefile.js'
import 'prismjs/components/prism-sql.js'

// Correspondance alias → clé Prism
const LANG_MAP = {
  bash: 'bash', sh: 'bash', shell: 'bash', zsh: 'bash',
  powershell: 'powershell', ps1: 'powershell', ps: 'powershell', pwsh: 'powershell',
  python: 'python', py: 'python',
  javascript: 'javascript', js: 'javascript',
  csharp: 'csharp', cs: 'csharp', 'c#': 'csharp',
  json: 'json',
  yaml: 'yaml', yml: 'yaml',
  makefile: 'makefile', make: 'makefile',
  sql: 'sql',
}

function highlightCode(text, lang) {
  const prismLang = LANG_MAP[lang?.toLowerCase()]
  if (prismLang && Prism.languages[prismLang]) {
    try {
      return Prism.highlight(text, Prism.languages[prismLang], prismLang)
    } catch {
      // Fallback silencieux si Prism échoue
    }
  }
  // Pas de grammaire → échapper le HTML brut
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    code({ text, lang }) {
      const highlighted = highlightCode(text, lang)
      const badge = lang ? `<span class="sl-lang-badge">${lang}</span>` : ''
      return `<div class="sl-code-block">${badge}<pre><code>${highlighted}</code></pre></div>`
    },

    codespan({ text }) {
      // POURQUOI échapper ici : `marked` passe le contenu du backtick brut (ex: "<html>").
      // Sans échappement, le navigateur interprète ces caractères comme du vrai HTML
      // et les balises disparaissent au lieu d'être affichées.
      // La même logique s'applique dans highlightCode() pour les blocs de code.
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
      return `<code class="sl-inline-code">${escaped}</code>`
    },

    tablecell(token) {
      const content = this.parser.parseInline(token.tokens)
      const tag = token.header ? 'th' : 'td'
      const cls = token.header
        ? 'border border-[#2d3748] px-3 py-1.5 text-slate-200 bg-[#1a1d2e] font-semibold text-left'
        : 'border border-[#2d3748] px-3 py-1.5 text-slate-400 text-left'
      return `<${tag} class="${cls}">${content}</${tag}>\n`
    },

    table(token) {
      const headerCells = token.header.map(cell => this.tablecell(cell)).join('')
      const headerRow = `<tr>${headerCells}</tr>`
      const bodyRows = token.rows
        .map(row => `<tr>${row.map(cell => this.tablecell(cell)).join('')}</tr>`)
        .join('\n')
      return `<table class="border-collapse my-3 text-sm w-full"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>\n`
    },

    blockquote(token) {
      const body = this.parser.parse(token.tokens)
      return `<blockquote class="border-l-2 border-amber-500/40 pl-3 text-amber-200/70 italic my-2">${body}</blockquote>\n`
    },

    strong(token) {
      const text = this.parser.parseInline(token.tokens)
      return `<strong class="text-white font-semibold">${text}</strong>`
    },

    list(token) {
      const tag = token.ordered ? 'ol' : 'ul'
      const cls = token.ordered
        ? 'list-decimal ml-5 my-2 space-y-1'
        : 'list-disc ml-5 my-2 space-y-1'
      const items = token.items
        .map(item => {
          const body = this.parser.parse(item.tokens)
          return `<li class="text-slate-300">${body}</li>`
        })
        .join('\n')
      return `<${tag} class="${cls}">${items}</${tag}>\n`
    },

    paragraph(token) {
      const text = this.parser.parseInline(token.tokens)
      return `<p class="mb-3 text-slate-300">${text}</p>\n`
    }
  }
})

export function parseMarkdown(md) {
  if (!md) return ''
  return marked.parse(md)
}
