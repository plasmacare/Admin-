import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { fetchLookups, fetchBookings, updateBookingStatus, updateBookingStaff, computeStats, STATUSES } from '../lib/adminData'
import logoIcon from '../assets/logo-icon.png'

function formatLocalDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  sample_collected: 'Sample Collected',
  report_ready: 'Report Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function Dashboard() {
  const { logout } = useAuth()
  const [lookups, setLookups] = useState({ packagesById: {}, testsById: {}, slotsById: {} })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFilter, setDateFilter] = useState(formatLocalDate(new Date()))
  const [showAllDates, setShowAllDates] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    fetchLookups().then(setLookups).catch(() => {})
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchBookings({
        date: showAllDates ? undefined : dateFilter,
        status: statusFilter || undefined,
      })
      setBookings(data)
    } catch (err) {
      setError(err.message || 'Bookings load nahi ho paayi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, statusFilter, showAllDates])

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings
    const q = search.trim().toLowerCase()
    return bookings.filter(
      (b) => b.customer_name?.toLowerCase().includes(q) || b.customer_phone?.includes(q)
    )
  }, [bookings, search])

  const stats = useMemo(() => computeStats(bookings), [bookings])

  async function handleStatusChange(booking, newStatus) {
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: newStatus } : b)))
    try {
      await updateBookingStatus(booking.id, newStatus)
    } catch (err) {
      setError('Status update fail ho gaya: ' + err.message)
      load()
    }
  }

  async function handleStaffChange(booking, staffName) {
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, assigned_staff: staffName } : b)))
    try {
      await updateBookingStaff(booking.id, staffName)
    } catch (err) {
      setError('Staff assign fail ho gaya: ' + err.message)
    }
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src={logoIcon} alt="" />
          <span>Plasma Care Admin</span>
        </div>
        <button className="btn btn--ghost" onClick={logout}>Logout</button>
      </header>

      <div className="admin-stats">
        <StatCard label={showAllDates ? 'Bookings' : "Today's Bookings"} value={stats.total} />
        <StatCard label="Pending" value={stats.pending} accent="pending" />
        <StatCard label="Confirmed" value={stats.confirmed} accent="confirmed" />
        <StatCard label="Revenue" value={`₹${stats.revenue}`} />
      </div>

      <div className="admin-filters">
        <input
          type="date"
          value={dateFilter}
          disabled={showAllDates}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <label className="admin-filters__all">
          <input type="checkbox" checked={showAllDates} onChange={(e) => setShowAllDates(e.target.checked)} />
          All dates
        </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-filters__search"
        />
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-loading">Loading bookings…</p>}

      {!loading && filtered.length === 0 && (
        <p className="admin-empty">Is filter ke liye koi booking nahi mili.</p>
      )}

      <div className="admin-list">
        {filtered.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            lookups={lookups}
            expanded={expandedId === b.id}
            onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
            onStatusChange={(s) => handleStatusChange(b, s)}
            onStaffChange={(s) => handleStaffChange(b, s)}
          />
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`stat-card${accent ? ` stat-card--${accent}` : ''}`}>
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  )
}

function BookingCard({ booking, lookups, expanded, onToggle, onStatusChange, onStaffChange }) {
  const { packagesById, testsById, slotsById } = lookups
  const slot = slotsById[booking.slot_id]
  const packageNames = (booking.selected_packages || []).map((id) => packagesById[id]?.name).filter(Boolean)
  const testNames = (booking.selected_tests || []).map((id) => testsById[id]?.name).filter(Boolean)

  return (
    <div className={`booking-card status--${booking.status}`}>
      <button type="button" className="booking-card__summary" onClick={onToggle}>
        <div className="booking-card__main">
          <span className="booking-card__name">{booking.customer_name || 'Unnamed'}</span>
          <span className="booking-card__meta">
            {booking.customer_phone} · {booking.scheduled_date}
            {slot ? ` · ${slot.start_time?.slice(0, 5)}–${slot.end_time?.slice(0, 5)}` : ''}
          </span>
        </div>
        <div className="booking-card__right">
          <span className="badge">{STATUS_LABEL[booking.status] || booking.status}</span>
          <span className="booking-card__amount">₹{booking.total_amount}</span>
        </div>
      </button>

      {expanded && (
        <div className="booking-card__details">
          <DetailRow label="Type" value={booking.booking_type === 'home_collection' ? 'Home Collection' : 'Lab Visit'} />
          {(packageNames.length > 0 || testNames.length > 0) && (
            <DetailRow label="Tests / Packages" value={[...packageNames, ...testNames].join(', ') || '—'} />
          )}
          {booking.booking_type === 'home_collection' && booking.address && (
            <DetailRow
              label="Address"
              value={`${booking.address.full_address}${booking.address.landmark ? ` (near ${booking.address.landmark})` : ''}`}
            />
          )}
          <DetailRow label="Verified" value={booking.phone_verified ? 'Yes' : 'No'} />

          <div className="booking-card__controls">
            <label>
              Status
              <select value={booking.status} onChange={(e) => onStatusChange(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <label>
              Assigned staff
              <input
                type="text"
                defaultValue={booking.assigned_staff || ''}
                placeholder="Staff name"
                onBlur={(e) => onStaffChange(e.target.value)}
              />
            </label>
          </div>

          <a className="btn btn--secondary btn--block" href={`tel:${booking.customer_phone}`}>
            Call customer
          </a>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-row__label">{label}</span>
      <span className="detail-row__value">{value}</span>
    </div>
  )
}
