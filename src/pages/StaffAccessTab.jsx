import { useEffect, useState } from 'react'
import { fetchStaffProfiles, updateStaffProfile } from '../lib/staffAccess'
import { ALL_TABS } from '../lib/auth.jsx'

const TAB_LABELS = {
  bookings: 'Bookings',
  catalog: 'Catalog',
  'ai-packages': 'AI Packages',
  pages: 'Pages',
  announcements: 'Announcements',
  payments: 'Payments',
  views: 'Views',
}

export default function StaffAccessTab() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)

  async function load() {
    try {
      setRows(await fetchStaffProfiles())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function updateLocal(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function save(row) {
    setSavingId(row.id)
    setError('')
    try {
      await updateStaffProfile(row.id, {
        role: row.role,
        allowed_tabs: row.allowed_tabs,
        is_active: row.is_active,
        full_name: row.full_name,
      })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  function toggleTab(row, tabKey) {
    const has = row.allowed_tabs.includes(tabKey)
    const next = has ? row.allowed_tabs.filter((t) => t !== tabKey) : [...row.allowed_tabs, tabKey]
    updateLocal(row.id, { allowed_tabs: next })
  }

  if (rows === null) return <div className="tab-panel">Loading…</div>

  return (
    <div className="tab-panel">
      <p style={{ marginBottom: 16, color: '#666' }}>
        Naya login banane ke liye pehle Supabase Dashboard → Authentication → Users
        mein user add karo (email + password). Wo yahan apne aap ek row ke saath
        list mein aa jayega — role aur tabs yahin se set karo.
      </p>
      {error && <p className="login-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Visible tabs</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.email}</td>
              <td>
                <input
                  value={row.full_name || ''}
                  onChange={(e) => updateLocal(row.id, { full_name: e.target.value })}
                  placeholder="Full name"
                />
              </td>
              <td>
                <input
                  value={row.role}
                  onChange={(e) => updateLocal(row.id, { role: e.target.value })}
                  placeholder="admin / staff / custom label"
                  style={{ width: 140 }}
                />
              </td>
              <td>
                {row.role === 'admin' ? (
                  <span style={{ color: '#666' }}>All tabs (admin)</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ALL_TABS.map((t) => (
                      <label key={t} style={{ fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={row.allowed_tabs.includes(t)}
                          onChange={() => toggleTab(row, t)}
                        />{' '}
                        {TAB_LABELS[t]}
                      </label>
                    ))}
                  </div>
                )}
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={row.is_active}
                  onChange={(e) => updateLocal(row.id, { is_active: e.target.checked })}
                />
              </td>
              <td>
                <button
                  className="btn btn--primary"
                  disabled={savingId === row.id}
                  onClick={() => save(row)}
                >
                  {savingId === row.id ? 'Saving…' : 'Save'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
