import { useState, useEffect, useRef, useId, useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { html as htmlMode } from '@codemirror/legacy-modes/mode/xml'
import { javascript as jsMode } from '@codemirror/legacy-modes/mode/javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import Terminal from '../components/Terminal'
import PreviewPane from '../components/PreviewPane'

const LANG_COLORS = {
  bash: '#22d3ee', python: '#f59e0b', powershell: '#d97706',
  kql: '#e879f9', sql: '#34d399', regex: '#fb923c',
  git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15',
  html: '#e34c26', php: '#8892bf'
}
const LANG_LABELS = {
  bash: 'Bash', python: 'Python', powershell: 'PowerShell',
  kql: 'KQL', sql: 'SQL', regex: 'Regex',
  git: 'Git', spl: 'SPL', yaml: 'YAML',
  html: 'HTML', php: 'PHP'
}
// HTML est statique (pas de bouton Exécuter) — la prévisualisation vient du code direct
const STATIC_LANGS = ['kql', 'sql', 'spl', 'regex', 'git', 'yaml', 'html']

const REFERENCE = {
  kql: `Tables : SecurityEvent · SigninLogs · Syslog · DnsEvents · AuditLogs · SecurityAlert\n\nStructure :\nTable\n| where TimeGenerated > ago(24h)\n| project Col1, Col2\n| summarize Count=count() by IpAddress\n| sort by Count desc\n| take 100`,
  sql: `SELECT col1, col2 FROM table;\nSELECT * FROM table WHERE col > 100;\nSELECT col, COUNT(*) FROM t GROUP BY col HAVING COUNT(*) > 5;\nINNER JOIN t2 ON t1.id = t2.fk\nLEFT JOIN  / RIGHT JOIN\nWHERE col LIKE 'A%' | IN ('a','b') | IS NULL\nORDER BY col ASC / DESC\nCREATE VIEW v AS SELECT ...`,
  regex: `. \\d \\w \\s  —  classes de base\n[abc] [a-z] [^abc]\n* + ? {n,m}  —  quantificateurs\n*? +?  —  lazy\n^ $ \\b  —  ancres\n(...) (?:...) (?P<n>...)  —  groupes\n(?=...) (?!...)  —  lookahead`,
  git: `git init / clone URL / status / log --oneline\ngit add . / commit -m "msg"\ngit branch nom / switch nom / switch -c nom\ngit merge branche / rebase main\ngit remote -v / push / pull / fetch\ngit stash / stash pop\ngit tag -a v1.0 -m "" / revert abc123`,
  spl: `index=security EventCode=4625\n| head 10 | fields host, user\n| where EventCode=4625\n| eval f = if(code<400,"OK","ERR")\n| stats count BY user\n| top 10 src_ip\n| timechart span=1h count`,
  yaml: `clé: valeur  |  actif: true  |  port: 8080  |  vide: null\n\nListe :\nitems:\n  - nginx\n  - redis\n\nImbriqué :\nserver:\n  host: localhost\n  port: 8080\n\nAncre & Alias :\ndefaults: &defaults\n  timeout: 30\nprod:\n  <<: *defaults\n  timeout: 5\n\n--- # séparateur multi-documents`,
}

function getLangExtension(lang) {
  if (lang === 'python') return python()
  if (lang === 'bash' || lang === 'powershell') return StreamLanguage.define(shell)
  if (lang === 'html') return StreamLanguage.define(htmlMode)
  if (lang === 'php')  return StreamLanguage.define(jsMode)
  return []
}

const cmTheme = EditorView.theme({
  '&': { fontSize: '13px', backgroundColor: '#080807' },
  // JetBrains Mono en premier — cohérence avec le reste de l'UI (body, Terminal, code blocks)
  '.cm-content': { padding: '8px', fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" },
  '.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" },
})

export default function Sandbox() {
  const uid     = useId().replace(/:/g, '')
  const [lang, setLang]           = useState('bash')
  const [code, setCode]           = useState('')
  // phpPreviewSrc : contenu rendu dans le PreviewPane PHP
  // Mis à jour manuellement via le bouton "Actualiser l'aperçu"
  // (pas de boucle sentinel en Sandbox — pas de validation automatique)
  const [phpPreviewSrc, setPhpPreviewSrc] = useState('')
  const outputBuffer = useRef('')
  const termId = `sandbox-${uid}-${lang}`
  const isStatic = STATIC_LANGS.includes(lang)
  const langColor = LANG_COLORS[lang] ?? '#d97706'

  // Écouter la sortie terminal pour le Sandbox PHP
  // Permet d'actualiser l'aperçu avec le bouton "Actualiser l'aperçu"
  useEffect(() => {
    const cleanup = window.electronAPI.terminal.onData(({ id, chunk }) => {
      if (id === termId) outputBuffer.current += chunk
    })
    return cleanup
  }, [termId])

  // Vider le buffer quand on change de langage
  useEffect(() => {
    outputBuffer.current = ''
    setPhpPreviewSrc('')
    setCode('')
  }, [lang])

  const handleRun = useCallback(() => {
    if (!code.trim() || isStatic) return
    outputBuffer.current = ''
    setPhpPreviewSrc('')

    if (lang === 'php') {
      // PHP : heredoc bash → même logique que dans Exercise.jsx
      // Le délimiteur 'PHPEOF' en single-quotes protège les variables PHP de bash
      const heredoc = `php << 'PHPEOF'\n${code}\nPHPEOF\r`
      window.electronAPI.terminal.write({ id: termId, data: heredoc })
    } else {
      window.electronAPI.terminal.write({ id: termId, data: code + '\r' })
    }
  }, [code, termId, isStatic, lang])

  // Actualiser l'aperçu PHP avec la sortie capturée dans outputBuffer
  // Appelé manuellement par le bouton "Actualiser l'aperçu"
  const refreshPhpPreview = useCallback(() => {
    const { default: stripAnsi } = { default: (s) => s.replace(/\x1b\[[^A-Za-z]*[A-Za-z]/g, '').replace(/\r/g, '') }
    const raw = stripAnsi(outputBuffer.current)
    const lines = raw.split('\n').filter(l => !l.match(/^\$\s/) && !l.includes('PHPEOF') && !l.startsWith('php <<'))
    const phpOut = lines.join('\n').trim()
    if (!phpOut) return
    const isFullHtml = phpOut.toLowerCase().startsWith('<!doctype') || phpOut.toLowerCase().startsWith('<html')
    setPhpPreviewSrc(isFullHtml
      ? phpOut
      : `<body style="font-family:sans-serif;background:#fff;padding:16px;color:#222;white-space:pre-wrap">${phpOut}</body>`
    )
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleRun() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleRun])

  return (
    <div className="flex flex-col h-full bg-[#0a0a09]">
      {/* Barre du haut */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#111110] border-b border-[#2e2b26] flex-shrink-0">
        <span className="text-white font-semibold text-sm">Sandbox</span>
        <div className="w-px h-4 bg-[#2e2b26]" />
        <span className="text-stone-400 text-xs">Éditeur libre</span>
        <div className="flex gap-1.5 ml-4 flex-wrap">
          {Object.keys(LANG_LABELS).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                lang === l ? 'text-[#0a0a09]' : 'text-stone-500 hover:text-stone-200 bg-[#0a0a09]'
              }`}
              style={lang === l ? { backgroundColor: LANG_COLORS[l] } : {}}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {/* Bouton "Actualiser l'aperçu" pour PHP — remplace le sentinel automatique
              absent en Sandbox. L'utilisateur exécute d'abord (Exécuter), puis rafraîchit. */}
          {lang === 'php' && (
            <button
              onClick={refreshPhpPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c1a] hover:bg-[#252520] text-stone-300 text-xs rounded-sm transition-colors"
              title="Mettre à jour l'aperçu avec la dernière sortie PHP"
            >
              ↻ Aperçu PHP
            </button>
          )}
          {!isStatic && (
            <button
              onClick={handleRun}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c1a] hover:bg-[#252520] text-stone-300 text-xs rounded-sm transition-colors"
            >
              ▶ Exécuter <kbd className="opacity-40 ml-1">Ctrl+↵</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Corps */}
      <div className="flex flex-1 overflow-hidden">
        {/* Éditeur */}
        <div className="flex-1 flex flex-col border-r border-[#2e2b26] overflow-hidden">
          <div className="px-4 py-2 border-b border-[#2e2b26] flex items-center justify-between">
            <span className="text-stone-500 text-xs uppercase tracking-widest">Éditeur</span>
            <span className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${langColor}20`, color: langColor }}>
              {LANG_LABELS[lang]}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeMirror
              value={code}
              onChange={setCode}
              extensions={[getLangExtension(lang), cmTheme, EditorView.lineWrapping]}
              theme={oneDark}
              height="100%"
              placeholder={
                lang === 'html' ? '<!DOCTYPE html>\n<html lang="fr">\n<head><meta charset="UTF-8"><title>Ma page</title></head>\n<body>\n  <!-- Votre HTML ici -->\n</body>\n</html>'
                : lang === 'php' ? '<?php\n// Votre code PHP ici\necho "Hello, PHP!";\n?>'
                : `Écrivez votre code ${LANG_LABELS[lang]} ici…`
              }
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                highlightActiveLine: true,
              }}
            />
          </div>
        </div>

        {/* Panneau droit : prévisualisation, terminal ou référence */}
        <div className="flex flex-col" style={{ width: 480 }}>
          {/* HTML : prévisualisation plein panneau (temps réel) */}
          {lang === 'html' ? (
            <div className="flex-1 overflow-hidden">
              <PreviewPane srcDoc={code} label="HTML" langColor={langColor} />
            </div>
          ) : lang === 'php' ? (
            // PHP : terminal bash (60 %) + aperçu (40 %)
            <div className="flex flex-col h-full">
              <div style={{ flex: '0 0 60%', overflow: 'hidden' }}>
                <Terminal id={termId} shell="bash" className="h-full" />
              </div>
              <div className="border-t border-[#2e2b26]" style={{ flex: '0 0 40%', overflow: 'hidden' }}>
                <PreviewPane srcDoc={phpPreviewSrc} label="PHP" langColor={langColor} />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#111110] border-b border-[#2e2b26] flex-shrink-0">
                <div className="flex gap-1.5">
                  {isStatic ? (
                    <><div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langColor}99` }}/>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langColor}50` }}/>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langColor}25` }}/></>
                  ) : (
                    <><div className="w-3 h-3 rounded-full bg-red-500/70"/>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/70"/>
                      <div className="w-3 h-3 rounded-full bg-[#86efac]/70"/></>
                  )}
                </div>
                <span className="text-stone-500 text-xs ml-2">
                  {isStatic ? `Référence ${LANG_LABELS[lang]}` :
                   lang === 'powershell' ? 'Windows PowerShell' :
                   lang === 'python'     ? 'Python' : 'Bash (WSL)'}
                </span>
              </div>
              <div className="flex-1 overflow-hidden bg-[#080807]">
                {isStatic ? (
                  <pre className="h-full overflow-y-auto p-5 text-xs font-mono text-stone-400 leading-relaxed whitespace-pre-wrap">
                    {REFERENCE[lang] ?? ''}
                  </pre>
                ) : (
                  <Terminal id={termId} shell={lang} className="h-full" />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
