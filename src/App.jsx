import { useAuth } from './lib/auth.jsx'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="admin-splash">Loading…</div>
  }

  return session ? <Dashboard /> : <Login />
}
