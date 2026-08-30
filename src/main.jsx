import ReactDOM from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import './styles/admin.css'

const root = ReactDOM.createRoot(document.getElementById('root'))

// Checked here, BEFORE importing anything else, and deliberately using
// a dynamic import() below rather than a static one — a static
// `import App from './App'` gets evaluated before this file's own code
// runs, so by the time we could check anything, App's whole dependency
// chain (which includes the Supabase client) would already have thrown
// and left the page completely blank with nothing on screen. That's
// especially bad in the Capacitor/APK build, where there's no devtools
// at all to see a console error.
const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY

if (missingEnv) {
  root.render(
    <div style={{ maxWidth: 480, margin: '48px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', color: '#5C6B7A' }}>
      <h1 style={{ color: '#0B2545', fontSize: 20 }}>Site configuration missing</h1>
      <p style={{ lineHeight: 1.5 }}>
        This build is missing its Supabase configuration
        (<code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>).
      </p>
      <p style={{ lineHeight: 1.5 }}>
        Check your build's environment variables — see <code>.env.example</code> and the README.
      </p>
    </div>,
  )
} else {
  import('./AppRoot').then(({ default: AppRoot }) => {
    root.render(<AppRoot />)
  })
}
