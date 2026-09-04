import { useAuth } from './lib/auth.jsx'
import Login from './pages/Login'
import AdminShell from './components/AdminShell'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="admin-splash">Loading…</div>
  }

  return session ? <AdminShell /> : <Login />
}
