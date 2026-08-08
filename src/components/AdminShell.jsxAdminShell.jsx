import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import Tabs from './Tabs'
import logoIcon from '../assets/logo-icon.png'
import Dashboard from '../pages/Dashboard'
import CatalogTab from '../pages/CatalogTab'
import SlotsTab from '../pages/SlotsTab'

const TABS = [
  { key: 'bookings', label: 'Bookings' },
  { key: 'catalog', label: 'Catalog' },
  { key: 'slots', label: 'Slots' },
]

export default function AdminShell() {
  const { logout } = useAuth()
  const [tab, setTab] = useState('bookings')

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src={logoIcon} alt="" />
          <span>Plasma Care Admin</span>
        </div>
        <button className="btn btn--ghost" onClick={logout}>Logout</button>
      </header>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'bookings' && <Dashboard />}
      {tab === 'catalog' && <CatalogTab />}
      {tab === 'slots' && <SlotsTab />}
    </div>
  )
}
