import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase'
import { notify, getPermission } from '../lib/notifications'
import Tabs from './Tabs'
import NotificationBanner from './NotificationBanner'
import logoIcon from '../assets/logo-icon.png'
import Dashboard from '../pages/Dashboard'
import CatalogTab from '../pages/CatalogTab'
import AiPackagesTab from '../pages/AiPackagesTab'
import PagesTab from '../pages/PagesTab'
import AnnouncementsTab from '../pages/AnnouncementsTab'

const TABS = [
  { key: 'bookings', label: 'Bookings' },
  { key: 'catalog', label: 'Catalog' },
  { key: 'ai-packages', label: 'AI Packages' },
  { key: 'pages', label: 'Pages' },
  { key: 'announcements', label: 'Announcements' },
]

export default function AdminShell() {
  const { logout } = useAuth()
  const [tab, setTab] = useState('bookings')
  const seenIds = useRef(new Set())
  const sinceRef = useRef(new Date().toISOString())

  function announceNewBooking(b) {
    if (seenIds.current.has(b.id)) return
    seenIds.current.add(b.id)
    if (getPermission() === 'granted') {
      notify('New booking — Plasma Care', {
        body: `${b.customer_name || 'Someone'} · ₹${b.total_amount} · ${b.scheduled_date}`,
        tag: b.id,
      })
    }
  }

  // Primary path: instant alert via Supabase Realtime. Needs `bookings`
  // added to the realtime publication (supabase/enable_realtime.sql) —
  // without that this channel silently never fires.
  useEffect(() => {
    const channel = supabase
      .channel('admin-new-bookings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        announceNewBooking(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Backup path: poll for anything created since we opened the app, in
  // case realtime isn't set up yet or a socket briefly drops. Slower
  // (up to 30s) but doesn't depend on any extra configuration.
  useEffect(() => {
    const id = setInterval(async () => {
      const { data } = await supabase
        .from('bookings')
        .select('id, customer_name, total_amount, scheduled_date')
        .gt('created_at', sinceRef.current)
        .order('created_at', { ascending: true })
      if (data?.length) {
        data.forEach(announceNewBooking)
      }
    }, 30000)
    return () => clearInterval(id)
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
      {tab === 'ai-packages' && <AiPackagesTab />}
      {tab === 'pages' && <PagesTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
    </div>
  )
}
