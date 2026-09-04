import { useEffect, useMemo, useState } from 'react'
import {
  fetchLookups, fetchBookings, updateBookingStatus, updateBookingStaff,
  updateCallStatus, updateAdminNotes, setSpamFlag, uploadReport, skipReport, resetReport, deleteBooking,
  updatePrescriptionNotes, computeStats, computeSpamFlags, STATUSES,
} from '../lib/adminData'
import { exportBookingsCsv } from '../lib/csvExport'
import MapPreview from '../components/MapPreview'
import ReportBuilder from '../components/ReportBuilder'
import {
  fetchPaymentSettings, createRazorpayLink, savePaymentRequest, markPaymentReceived, computeRequiredAmount,
} from '../lib/payments'

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
  const [paymentSettings, setPaymentSettings] = useState(null)
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
    fetchPaymentSettings().then(setPaymentSettings).catch(() => {})
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

  async function handleDelete(booking) {
    if (!confirm(`Permanently delete this booking (${booking.customer_name || 'no name'})? This can't be undone.`)) return
    try {
      await deleteBooking(booking)
      setBookings((prev) => prev.filter((b) => b.id !== booking.id))
    } catch (err) {
      setError('Failed to delete booking: ' + err.message)
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

  async function handlePrescriptionNotes(booking, notes) {
    patch(booking.id, { prescription_notes: notes })
    try {
      await updatePrescriptionNotes(booking.id, notes)
    } catch (err) {
      setError('Could not save prescription notes: ' + err.message)
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
            paymentSettings={paymentSettings}
            expanded={expandedId === b.id}
            onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
            onStatusChange={(s) => handleStatusChange(b, s)}
            onStaffChange={(s) => handleStaffChange(b, s)}
            onCallStatus={(s) => handleCallStatus(b, s)}
            onNotes={(n) => handleNotes(b, n)}
            onSpamToggle={() => handleSpamToggle(b)}
            onDelete={() => handleDelete(b)}
            onReportUpload={(f) => handleReportUpload(b, f)}
            onReportSkip={() => handleReportSkip(b)}
            onReportReset={() => handleReportReset(b)}
            onPrescriptionNotes={(n) => handlePrescriptionNotes(b, n)}
            onBookingPatch={(fields) => patch(b.id, fields)}
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
  booking, lookups, paymentSettings, expanded, onToggle, onStatusChange, onStaffChange,
  onCallStatus, onNotes, onSpamToggle, onDelete, onReportUpload, onReportSkip, onReportReset, onPrescriptionNotes,
  onBookingPatch,
}) {
  const { packagesById, testsById } = lookups
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
          {booking.customer_ip && <DetailRow label="IP address" value={booking.customer_ip} />}

          {(booking.prescription_url || booking.prescription_upload_error) && (
            <div className="prescription-panel">
              <span className="detail-row__label">Prescription photo</span>
              {booking.prescription_url && (
                <a href={booking.prescription_url} target="_blank" rel="noreferrer">
                  <img src={booking.prescription_url} alt="Prescription" className="prescription-panel__img" />
                </a>
              )}
              {booking.prescription_upload_error && (
                <p className="prescription-panel__error">
                  ⚠ Customer tried to upload a prescription photo but it failed: {booking.prescription_upload_error}.
                  Ask them to WhatsApp it to 8112060205.
                </p>
              )}
              {booking.prescription_ai_summary && (
                <p className="prescription-panel__ai">
                  AI read ({booking.prescription_ai_confidence ?? '?'}% confidence): {booking.prescription_ai_summary}
                </p>
              )}
              <label className="prescription-panel__notes">
                Tests read from prescription
                <textarea
                  defaultValue={booking.prescription_notes || ''}
                  placeholder="e.g. CBC, Lipid Profile, HbA1c"
                  rows={2}
                  onBlur={(e) => onPrescriptionNotes(e.target.value)}
                />
              </label>
            </div>
          )}

          {paymentSettings?.enabled && (
            <PaymentRequest booking={booking} settings={paymentSettings} onPatch={onBookingPatch} />
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
            phone={booking.customer_phone}
            onUpload={onReportUpload}
            onSkip={onReportSkip}
            onReset={onReportReset}
          />

          <ReportBuilderToggle booking={booking} onGenerated={(url) => onBookingPatch({ report_url: url, report_status: 'uploaded' })} />

          <label className="booking-card__notes">
            Admin notes
            <textarea
              defaultValue={booking.admin_notes || ''}
              placeholder="Internal note (the customer will not see this)"
              rows={2}
              onBlur={(e) => onNotes(e.target.value)}
            />
          </label>

          <div className="booking-card__danger-row">
            <button type="button" className={`spam-toggle${booking.is_spam ? ' spam-toggle--active' : ''}`} onClick={onSpamToggle}>
              {booking.is_spam ? 'Unmark spam' : 'Mark as spam'}
            </button>
            <button type="button" className="booking-card__delete" onClick={onDelete}>
              Delete booking
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReportControl({ status, url, phone, onUpload, onSkip, onReset }) {
  if (status === 'uploaded' && url) {
    return (
      <div className="report-control">
        <span className="detail-row__label">Report</span>
        <div className="report-control__row">
          <a href={url} target="_blank" rel="noreferrer" className="btn btn--secondary">View report</a>
          <button type="button" className="btn btn--ghost" onClick={onReset}>Replace</button>
        </div>
        <ReportShareRow url={url} phone={phone} />
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

function PaymentRequest({ booking, settings, onPatch }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const amount = computeRequiredAmount(booking.total_amount, settings)

  async function handleMarkPaid() {
    try {
      await markPaymentReceived(booking.id)
      onPatch({ payment_status: 'paid' })
    } catch (err) {
      setError(err.message)
    }
  }

  // Escape hatch only — normally this happens automatically in the
  // customer's own booking flow. Useful if a booking was made before
  // payment collection was turned on, or the customer's step failed.
  async function handleCreateFallback() {
    setError('')
    setBusy(true)
    try {
      let link = null
      let razorpayPaymentLinkId = null
      if (settings.mode === 'razorpay') {
        const result = await createRazorpayLink({
          amount,
          customerName: booking.customer_name,
          customerPhone: booking.customer_phone,
          description: `Plasma Care booking ${booking.id.slice(0, 8).toUpperCase()}`,
        })
        link = result.link
        razorpayPaymentLinkId = result.id
      } else {
        link =
          `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.upi_payee_name || 'Plasma Care')}` +
          `&am=${encodeURIComponent(amount)}&cu=INR&tn=${encodeURIComponent(`Plasma Care ${booking.id.slice(0, 8).toUpperCase()}`)}`
      }
      await savePaymentRequest(booking.id, { amount, method: settings.mode, link, razorpayPaymentLinkId })
      onPatch({
        payment_requested_amount: amount,
        payment_method: settings.mode,
        payment_link: link,
        payment_status: 'requested',
        payment_screenshot_url: null,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (booking.payment_status === 'paid') {
    return (
      <div className="payment-request">
        <span className="detail-row__label">Payment</span>
        <p className="payment-request__status">✓ Paid — ₹{booking.payment_requested_amount}</p>
      </div>
    )
  }

  if (booking.payment_status === 'requested' || booking.payment_status === 'screenshot_uploaded') {
    return (
      <div className="payment-request">
        <span className="detail-row__label">Payment — ₹{booking.payment_requested_amount} ({booking.payment_status === 'screenshot_uploaded' ? 'screenshot uploaded' : 'awaiting payment'})</span>
        <p className="payment-request__hint">
          {booking.payment_method === 'razorpay'
            ? 'Gateway payment — this gets marked paid automatically once Razorpay confirms it.'
            : 'Customer paid inline during booking and uploaded a screenshot as proof.'}
        </p>
        {booking.payment_screenshot_url ? (
          <div className="payment-request__proof">
            <span className="detail-row__label">Screenshot uploaded by customer</span>
            <a href={booking.payment_screenshot_url} target="_blank" rel="noreferrer">
              <img src={booking.payment_screenshot_url} alt="Payment screenshot" className="payment-request__proof-img" />
            </a>
            <button type="button" className="btn btn--secondary" onClick={handleMarkPaid}>Confirm — mark as paid</button>
          </div>
        ) : (
          booking.payment_method !== 'razorpay' && (
            <button type="button" className="btn btn--ghost" onClick={handleMarkPaid}>Mark as paid manually</button>
          )
        )}
        {error && <p className="admin-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="payment-request">
      <span className="detail-row__label">Payment — ₹{amount} due</span>
      <p className="payment-request__hint">
        Nothing recorded for this booking yet — normally the customer pays this inline while booking. If this
        booking was made before payment collection was on, or their step didn't go through, you can create the
        request here as a one-off.
      </p>
      {error && <p className="admin-error">{error}</p>}
      <button type="button" className="btn btn--ghost" disabled={busy} onClick={handleCreateFallback}>
        {busy ? 'Creating…' : 'Create payment request'}
      </button>
    </div>
  )
}

function ReportShareRow({ url, phone }) {
  const message = encodeURIComponent(`Your Plasma Care report is ready: ${url}`)
  const tenDigitPhone = phone ? phone.replace(/\D/g, '').slice(-10) : ''
  const whatsappLink = tenDigitPhone ? `https://wa.me/91${tenDigitPhone}?text=${message}` : null
  const telegramLink = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Your Plasma Care report is ready.')}`

  async function handleShareOther() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Plasma Care report', text: 'Your Plasma Care report is ready.', url })
        return
      } catch {
        // User cancelled the share sheet — fall through to clipboard copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      alert('Report link copied to clipboard.')
    } catch {
      alert(url)
    }
  }

  return (
    <div className="report-share-row">
      <span className="report-share-row__label">Send to customer:</span>
      <div className="report-share-row__buttons">
        {whatsappLink && (
          <a className="report-share-btn report-share-btn--whatsapp" href={whatsappLink} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        )}
        <a className="report-share-btn report-share-btn--telegram" href={telegramLink} target="_blank" rel="noreferrer">
          Telegram
        </a>
        <button type="button" className="report-share-btn" onClick={handleShareOther}>
          Other / Copy link
        </button>
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

function ReportBuilderToggle({ booking, onGenerated }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="report-builder-toggle">
      <button type="button" className="btn btn--ghost" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide report builder' : booking.report_url ? 'Regenerate report' : 'Generate report'}
      </button>
      {open && (
        <ReportBuilder
          booking={booking}
          onGenerated={(url) => {
            onGenerated(url)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
