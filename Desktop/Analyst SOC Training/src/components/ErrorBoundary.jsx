import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, stack: null }
  }

  componentDidCatch(error, info) {
    const data = {
      message: error.message,
      stack: error.stack,
      componentStack: info?.componentStack,
    }
    try {
      window.electronAPI?.log?.write('ERROR', 'React render error', data)
    } catch {}
    this.setState({ error: error.message, stack: error.stack })
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0d1117',
          color: '#e6edf3',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'monospace',
        }}>
          <div style={{ maxWidth: 720, width: '100%' }}>
            <div style={{ color: '#ff6b6b', fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>
              ✕ Erreur de rendu
            </div>
            <div style={{
              background: '#161b22',
              border: '1px solid #ff6b6b44',
              borderRadius: 8,
              padding: '1rem',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              color: '#ff6b6b',
            }}>
              {this.state.error}
            </div>
            <pre style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              padding: '1rem',
              fontSize: '0.72rem',
              color: '#8b949e',
              overflow: 'auto',
              maxHeight: 320,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {this.state.stack}
            </pre>
            <p style={{ color: '#484f58', fontSize: '0.8rem', marginTop: '1rem' }}>
              Cette erreur a été enregistrée dans le fichier de log.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 20px',
                  background: 'rgba(0,255,136,0.15)',
                  border: '1px solid #00ff88',
                  borderRadius: 8,
                  color: '#00ff88',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}
              >
                Recharger l'application
              </button>
              <button
                onClick={() => window.electronAPI?.log?.open()}
                style={{
                  padding: '8px 20px',
                  background: 'transparent',
                  border: '1px solid #30363d',
                  borderRadius: 8,
                  color: '#8b949e',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}
              >
                Ouvrir le fichier de log
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
