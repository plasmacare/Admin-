import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './lib/auth.jsx'
import './styles/tokens.css'
import './styles/global.css'
import './styles/admin.css'

// Registered unconditionally (not gated on notification permission) so
// it's ready by the time notify() needs it — registration itself
// doesn't show anything or require permission. Uses BASE_URL since this
// app is deployed under a sub-path (see vite.config.js's `base`).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
