import { useAuth } from './lib/auth.jsx'
import Login from './pages/Login'
import AdminShell from './components/AdminShell'

export default function App() {
  const { session, profile, loading, logout } = useAuth()

  if (loading) {
    return <div className="admin-splash">Loading…</div>
  }

  if (!session) {
    return <Login />
  }

  if (!profile) {
    // Signed in, but no staff_profiles row (or it was deactivated) —
    // don't fall through to the full admin panel.
    return (
      <div className="admin-splash">
        <p>Your account isn't set up for access yet. Contact an admin.</p>
        <button className="btn btn--ghost" onClick={logout}>Sign out</button>
      </div>
    )
  }

  return <AdminShell />
}
