import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Capture erreurs JS globales non gérées
window.onerror = (message, source, lineno, colno, error) => {
  try {
    window.electronAPI?.log?.write('ERROR', String(message), {
      source, lineno, colno, stack: error?.stack,
    })
  } catch {}
}

// Capture promesses rejetées non gérées
window.addEventListener('unhandledrejection', (event) => {
  try {
    window.electronAPI?.log?.write('ERROR', 'Unhandled promise rejection', {
      reason: String(event.reason),
      stack: event.reason?.stack,
    })
  } catch {}
})

// Redirige console.error vers le log fichier (garde aussi la console DevTools)
const _origError = console.error.bind(console)
console.error = (...args) => {
  _origError(...args)
  try {
    window.electronAPI?.log?.write('ERROR', args.map(String).join(' '), null)
  } catch {}
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
