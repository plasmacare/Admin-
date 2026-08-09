import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase'
import { notify, getPermission } from '../lib/notifications'
import Tabs from './Tabs'
import NotificationBanner from './NotificationBanner'
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

  // Live alert on new bookings while this tab is open — needs `bookings`
  // added to the Supabase realtime publication (see supabase/*.sql).
  useEffect(() => {
    const channel = supabase
      .channel('admin-new-bookings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        const b = payload.new
        if (getPermission() === 'granted') {
          notify('New booking — Plasma Care', {
            body: `${b.customer_name || 'Someone'} · ₹${b.total_amount} · ${b.scheduled_date}`,
            tag: b.id,
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src={logoIcon} alt="" />
          <span>Plasma Care Admin</span>
        </div>
        <button className="btn btn--ghost" onClick={logout}>Logout</button>
      </header>

      <NotificationBanner />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'bookings' && <Dashboard />}
      {tab === 'catalog' && <CatalogTab />}
      {tab === 'slots' && <SlotsTab />}
    </div>
  )
}
