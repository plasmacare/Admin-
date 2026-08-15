import { useEffect, useMemo, useState } from 'react'
import {
  fetchLookups, fetchBookings, updateBookingStatus, updateBookingStaff,
  updateCallStatus, updateAdminNotes, setSpamFlag, uploadReport, skipReport, resetReport,
  computeStats, computeSpamFlags, STATUSES,
} from '../lib/adminData'
import { exportBookingsCsv } from '../lib/csvExport'
import MapPreview from '../components/MapPreview'

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
const CALL_STATUS_LABEL = {
  not_called: 'Not called',
  called: 'Called',
  no_answer: "Didn't answer",
  callback_later: 'Callback later',
}

export default function Dashboard() {
  const [lookups, setLookups] = useState({ packagesById: {}, testsById: {}, slotsById: {} })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFilter, setDateFilter] = useState(formatLocalDate(new Date()))
  const [showAllDates, setShowAllDates] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [hideSpam, setHideSpam] = useState(true)
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
      setError(err.message || 'Could not load bookings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, statusFilter, showAllDates])

  const flagged = useMemo(() => computeSpamFlags(bookings), [bookings])

  const filtered = useMemo(() => {
    let list = flagged
    if (hideSpam) list = list.filter((b) => !b.is_spam)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((b) => b.customer_name?.toLowerCase().includes(q) || b.customer_phone?.includes(q))
    }
    return list
  }, [flagged, hideSpam, search])

  const stats = useMemo(() => computeStats(bookings.filter((b) => !b.is_spam)), [bookings])
  const spamCount = useMemo(() => flagged.filter((b) => b.is_spam || b.spamReasons.length > 0).length, [flagged])

  function patch(id, fields) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...fields } : b)))
  }

  async function handleStatusChange(booking, newStatus) {
    patch(booking.id, { status: newStatus })
    try {
      await updateBookingStatus(booking, newStatus)
    } catch (err) {
      setError('Failed to update status: ' + err.message)
      load()
    }
  }

  async function handleStaffChange(booking, staffName) {
    patch(booking.id, { assigned_staff: staffName })
    try {
      await updateBookingStaff(booking.id, staffName)
    } catch (err) {
      setError('Failed to assign staff: ' + err.message)
    }
  }

  async function handleCallStatus(booking, status) {
    patch(booking.id, { call_status: status })
    try {
      await updateCallStatus(booking.id, status)
    } catch (err) {
      setError('Failed to update call status: ' + err.message)
      load()
    }
  }

  async function handleNotes(booking, notes) {
    patch(booking.id, { admin_notes: notes })
    try {
      await updateAdminNotes(booking.id, notes)
    } catch (err) {
      setError('Could not save notes: ' + err.message)
    }
  }

  async function handleSpamToggle(booking) {
    const next = !booking.is_spam
    patch(booking.id, { is_spam: next })
    try {
      await setSpamFlag(booking.id, next)
    } catch (err) {
      setError('Failed to update spam flag: ' + err.message)
      load()
    }
  }

  async function handleReportUpload(booking, file) {
    try {
      const url = await uploadReport(booking.id, file)
      patch(booking.id, { report_url: url, report_status: 'uploaded' })
    } catch (err) {
      setError('Failed to upload report: ' + err.message)
    }
  }

  async function handleReportSkip(booking) {
    try {
      await skipReport(booking.id)
      patch(booking.id, { report_status: 'skipped', report_url: null })
    } catch (err) {
      setError('Failed to skip report: ' + err.message)
    }
  }

  async function handleReportReset(booking) {
    try {
      await resetReport(booking.id)
      patch(booking.id, { report_status: 'pending', report_url: null })
    } catch (err) {
      setError('Failed to reset report: ' + err.message)
    }
  }

  return (
    <div className="bookings-tab">
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

      <div className="admin-toolbar">
        <label className="admin-filters__all">
          <input type="checkbox" checked={hideSpam} onChange={(e) => setHideSpam(e.target.checked)} />
          Hide flagged/spam {spamCount > 0 ? `(${spamCount})` : ''}
        </label>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => exportBookingsCsv(filtered, lookups)}
          disabled={filtered.length === 0}
        >
          Export CSV
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-loading">Loading bookings…</p>}
      {!loading && filtered.length === 0 && <p className="admin-empty">No bookings found for this filter.</p>}

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
            onCallStatus={(s) => handleCallStatus(b, s)}
            onNotes={(n) => handleNotes(b, n)}
            onSpamToggle={() => handleSpamToggle(b)}
            onReportUpload={(f) => handleReportUpload(b, f)}
            onReportSkip={() => handleReportSkip(b)}
            onReportReset={() => handleReportReset(b)}
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

function BookingCard({
  booking, lookups, expanded, onToggle, onStatusChange, onStaffChange,
  onCallStatus, onNotes, onSpamToggle, onReportUpload, onReportSkip, onReportReset,
}) {
  const { packagesById, testsById, slotsById } = lookups
  const slot = slotsById[booking.slot_id]
  const packageNames = (booking.selected_packages || []).map((id) => packagesById[id]?.name).filter(Boolean)
  const testNames = (booking.selected_tests || []).map((id) => testsById[id]?.name).filter(Boolean)
  const isFlagged = booking.spamReasons?.length > 0

  return (
    <div className={`booking-card status--${booking.status}${booking.is_spam ? ' booking-card--spam' : ''}`}>
      <button type="button" className="booking-card__summary" onClick={onToggle}>
        <div className="booking-card__main">
          <span className="booking-card__name">
            {booking.customer_name || 'Unnamed'}
            {isFlagged && <span className="spam-dot" title={booking.spamReasons.join(', ')}>⚠</span>}
          </span>
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
          {isFlagged && (
            <div className="spam-banner">
              Possible spam: {booking.spamReasons.join(', ')}
            </div>
          )}
          <DetailRow label="Type" value={booking.booking_type === 'home_collection' ? 'Home Collection' : 'Lab Visit'} />
          {(packageNames.length > 0 || testNames.length > 0) && (
            <DetailRow label="Tests / Packages" value={[...packageNames, ...testNames].join(', ') || '—'} />
          )}
          {booking.booking_type === 'home_collection' && booking.address && (
            <>
              <DetailRow
                label="Address"
                value={`${booking.address.full_address}${booking.address.landmark ? ` (near ${booking.address.landmark})` : ''}`}
              />
              <MapPreview latitude={booking.address.latitude} longitude={booking.address.longitude} />
            </>
          )}
          <DetailRow label="Verified" value={booking.phone_verified ? 'Yes' : 'No'} />
          {(booking.patient_name || booking.patient_age || booking.patient_gender || booking.patient_blood_group) && (
            <DetailRow
              label="Patient"
              value={[
                booking.patient_name,
                booking.patient_age ? `${booking.patient_age} yrs` : null,
                booking.patient_gender,
                booking.patient_blood_group,
              ].filter(Boolean).join(' · ') || '—'}
            />
          )}

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

          <div className="booking-card__controls">
            <label>
              Call status
              <select value={booking.call_status || 'not_called'} onChange={(e) => onCallStatus(e.target.value)}>
                {Object.keys(CALL_STATUS_LABEL).map((k) => (
                  <option key={k} value={k}>{CALL_STATUS_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <a className="btn btn--secondary" href={`tel:${booking.customer_phone}`} style={{ alignSelf: 'flex-end' }}>
              Call
            </a>
          </div>

          <ReportControl
            status={booking.report_status || 'pending'}
            url={booking.report_url}
            onUpload={onReportUpload}
            onSkip={onReportSkip}
            onReset={onReportReset}
          />

          <label className="booking-card__notes">
            Admin notes
            <textarea
              defaultValue={booking.admin_notes || ''}
              placeholder="Internal note (the customer will not see this)"
              rows={2}
              onBlur={(e) => onNotes(e.target.value)}
            />
          </label>

          <button type="button" className={`spam-toggle${booking.is_spam ? ' spam-toggle--active' : ''}`} onClick={onSpamToggle}>
            {booking.is_spam ? 'Unmark spam' : 'Mark as spam'}
          </button>
        </div>
      )}
    </div>
  )
}

function ReportControl({ status, url, onUpload, onSkip, onReset }) {
  if (status === 'uploaded' && url) {
    return (
      <div className="report-control">
        <span className="detail-row__label">Report</span>
        <div className="report-control__row">
          <a href={url} target="_blank" rel="noreferrer" className="btn btn--secondary">View report</a>
          <button type="button" className="btn btn--ghost" onClick={onReset}>Replace</button>
        </div>
      </div>
    )
  }
  if (status === 'skipped') {
    return (
      <div className="report-control">
        <span className="detail-row__label">Report</span>
        <div className="report-control__row">
          <span className="report-control__skipped">Skipped for this booking</span>
          <button type="button" className="btn btn--ghost" onClick={onReset}>Undo</button>
        </div>
      </div>
    )
  }
  return (
    <div className="report-control">
      <span className="detail-row__label">Report</span>
      <div className="report-control__row">
        <label className="btn btn--secondary report-control__upload">
          Upload report
          <input
            type="file"
            accept="application/pdf,image/*"
            hidden
            onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])}
          />
        </label>
        <button type="button" className="btn btn--ghost" onClick={onSkip}>Skip</button>
      </div>
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
