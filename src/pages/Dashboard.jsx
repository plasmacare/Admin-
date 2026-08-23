import { useEffect, useMemo, useState } from 'react'
import {
  fetchLookups, fetchBookings, updateBookingStatus, updateBookingStaff,
  updateCallStatus, updateAdminNotes, setSpamFlag, uploadReport, skipReport, resetReport,
  updatePrescriptionNotes, computeStats, computeSpamFlags, STATUSES,
} from '../lib/adminData'
import { exportBookingsCsv } from '../lib/csvExport'
import MapPreview from '../components/MapPreview'
import {
  fetchPaymentSettings, buildUpiQrUrl, createRazorpayLink, savePaymentRequest, markPaymentReceived,
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
  onCallStatus, onNotes, onSpamToggle, onReportUpload, onReportSkip, onReportReset, onPrescriptionNotes,
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

          {booking.prescription_url && (
            <div className="prescription-panel">
              <span className="detail-row__label">Prescription photo</span>
              <a href={booking.prescription_url} target="_blank" rel="noreferrer">
                <img src={booking.prescription_url} alt="Prescription" className="prescription-panel__img" />
              </a>
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
  const [amountMode, setAmountMode] = useState('full')
  const [customAmount, setCustomAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const fullAmount = Number(booking.total_amount) || 0
  const amount =
    amountMode === 'full' ? fullAmount
    : amountMode === 'partial' ? Math.round(fullAmount * 0.5)
    : Number(customAmount) || 0

  async function handleGenerate() {
    if (amount <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setError('')
    setBusy(true)
    try {
      let link = null
      if (settings.mode === 'razorpay') {
        const result = await createRazorpayLink({
          amount,
          customerName: booking.customer_name,
          customerPhone: booking.customer_phone,
          description: `Plasma Care booking ${booking.id.slice(0, 8).toUpperCase()}`,
        })
        link = result.link
      } else {
        const { upiLink } = buildUpiQrUrl({
          upiId: settings.upi_id,
          payeeName: settings.upi_payee_name,
          amount,
          note: `Plasma Care ${booking.id.slice(0, 8).toUpperCase()}`,
        })
        link = upiLink
      }
      await savePaymentRequest(booking.id, { amount, method: settings.mode, link })
      onPatch({ payment_requested_amount: amount, payment_method: settings.mode, payment_link: link, payment_status: 'requested' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleMarkPaid() {
    try {
      await markPaymentReceived(booking.id)
      onPatch({ payment_status: 'paid' })
    } catch (err) {
      setError(err.message)
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

  if (booking.payment_status === 'requested' && booking.payment_link) {
    const qr = settings.mode === 'upi'
      ? buildUpiQrUrl({ upiId: settings.upi_id, payeeName: settings.upi_payee_name, amount: booking.payment_requested_amount, note: 'Plasma Care' })
      : null
    const message = encodeURIComponent(`Please complete your payment of ₹${booking.payment_requested_amount} here: ${booking.payment_link}`)
    const tenDigitPhone = booking.customer_phone ? booking.customer_phone.replace(/\D/g, '').slice(-10) : ''
    return (
      <div className="payment-request">
        <span className="detail-row__label">Payment requested — ₹{booking.payment_requested_amount}</span>
        {qr && <img src={qr.qrImageUrl} alt="UPI QR" className="payment-request__qr" />}
        <div className="report-share-row__buttons">
          {tenDigitPhone && (
            <a className="report-share-btn report-share-btn--whatsapp" href={`https://wa.me/91${tenDigitPhone}?text=${message}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          )}
          <a className="report-share-btn report-share-btn--telegram" href={`https://t.me/share/url?url=${encodeURIComponent(booking.payment_link)}`} target="_blank" rel="noreferrer">
            Telegram
          </a>
          <button type="button" className="btn btn--secondary" onClick={handleMarkPaid}>Mark as paid</button>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-request">
      <span className="detail-row__label">Request payment</span>
      <div className="payment-request__amount-row">
        <button type="button" className={amountMode === 'full' ? 'is-active' : ''} onClick={() => setAmountMode('full')}>
          Full (₹{fullAmount})
        </button>
        <button type="button" className={amountMode === 'partial' ? 'is-active' : ''} onClick={() => setAmountMode('partial')}>
          Partial (₹{Math.round(fullAmount * 0.5)})
        </button>
        <button type="button" className={amountMode === 'custom' ? 'is-active' : ''} onClick={() => setAmountMode('custom')}>
          Custom
        </button>
        {amountMode === 'custom' && (
          <input
            type="number"
            className="payment-request__custom"
            placeholder="Amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
        )}
      </div>
      {error && <p className="admin-error">{error}</p>}
      <button type="button" className="btn btn--primary" disabled={busy} onClick={handleGenerate}>
        {busy ? 'Generating…' : `Generate ${settings.mode === 'razorpay' ? 'payment link' : 'UPI QR'}`}
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
