import React from 'react'
import App from './App'
import { AuthProvider } from './lib/auth.jsx'

export default function AppRoot() {
  return (
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  )
}
