import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ProfileProvider } from './contexts/ProfileContext'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// ErrorBoundary au niveau racine : intercepte toute erreur de rendu React
// non capturée plus bas et affiche un message au lieu d'un écran blanc total.
// Sans cela, une ReferenceError dans n'importe quel composant fait démonter
// l'intégralité de l'arbre React → écran noir, sans message, sans possibilité de retour.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <ProfileProvider>
          <App />
        </ProfileProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
