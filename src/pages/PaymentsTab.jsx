import { useEffect, useState } from 'react'
import { fetchPaymentSettings, updatePaymentSettings } from '../lib/payments'

export default function PaymentsTab() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    try {
      setSettings(await fetchPaymentSettings())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleToggle(enabled) {
    try {
      await updatePaymentSettings({ enabled })
      setSettings((s) => ({ ...s, enabled }))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSave(fields) {
    setError('')
    setNotice('')
    try {
      await updatePaymentSettings(fields)
      setNotice('Payment settings saved.')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="admin-loading">Loading…</p>
  if (!settings) return <p className="admin-error">Could not load payment settings.</p>

  return (
    <div className="payments-tab">
      <div className="payments-tab__toggle-card">
        <div>
          <h3>Payment collection</h3>
          <p className="slots-form-card__hint">
            Off by default. When on, every booking collects payment as part of the same booking flow — the customer
            pays (or scans the QR and uploads a screenshot) right there before they finish booking. No separate
            step or link-sharing needed afterward.
          </p>
        </div>
        <label className="payments-tab__switch">
          <input type="checkbox" checked={settings.enabled} onChange={(e) => handleToggle(e.target.checked)} />
          <span>{settings.enabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      {notice && <p className="admin-notice">{notice}</p>}
      {error && <p className="admin-error">{error}</p>}

      <AmountRuleEditor settings={settings} onSave={handleSave} />
      <MethodEditor settings={settings} onSave={handleSave} />
    </div>
  )
}

function AmountRuleEditor({ settings, onSave }) {
  const [paymentType, setPaymentType] = useState(settings.payment_type || 'full')
  const [partialPercentage, setPartialPercentage] = useState(settings.partial_percentage ?? 50)

  return (
    <div className="slots-form-card">
      <h3>How much to collect</h3>
      <p className="slots-form-card__hint">
        This one rule applies to every booking — full amount, or a fixed percentage. There's no per-booking choice
        anymore; whatever you set here is what every customer sees at checkout.
      </p>
      <div className="payments-tab__mode-switch">
        <button type="button" className={paymentType === 'full' ? 'is-active' : ''} onClick={() => setPaymentType('full')}>
          Full payment
        </button>
        <button type="button" className={paymentType === 'partial' ? 'is-active' : ''} onClick={() => setPaymentType('partial')}>
          Partial payment
        </button>
      </div>
      {paymentType === 'partial' && (
        <label className="payments-tab__percentage">
          Percentage of total to collect upfront
          <input
            type="number"
            min="1"
            max="99"
            value={partialPercentage}
            onChange={(e) => setPartialPercentage(Number(e.target.value))}
          />
          <span>%</span>
        </label>
      )}
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => onSave({ payment_type: paymentType, partial_percentage: partialPercentage })}
      >
        Save
      </button>
    </div>
  )
}

function MethodEditor({ settings, onSave }) {
  const [mode, setMode] = useState(settings.mode || 'upi')
  const [upiId, setUpiId] = useState(settings.upi_id || '')
  const [payeeName, setPayeeName] = useState(settings.upi_payee_name || '')
  const [razorpayKeyId, setRazorpayKeyId] = useState(settings.razorpay_key_id || '')

  return (
    <div className="slots-form-card">
      <h3>Payment method</h3>
      <div className="payments-tab__mode-switch">
        <button type="button" className={mode === 'upi' ? 'is-active' : ''} onClick={() => setMode('upi')}>
          UPI (your own ID)
        </button>
        <button type="button" className={mode === 'razorpay' ? 'is-active' : ''} onClick={() => setMode('razorpay')}>
          Razorpay
        </button>
      </div>

      {mode === 'upi' ? (
        <>
          <p className="slots-form-card__hint">
            A dynamic QR is generated for the amount due, right on the customer's booking screen — no third-party
            account needed, payments land directly in this UPI ID. The customer uploads a screenshot as proof, which
            you'll see in the Bookings tab to confirm.
          </p>
          <input placeholder="Your UPI ID (e.g. name@bank)" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
          <input placeholder="Payee name shown to customer" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
        </>
      ) : (
        <>
          <p className="slots-form-card__hint">
            Needs a Razorpay account. Put your Key ID here, and set both <code>RAZORPAY_KEY_ID</code> and{' '}
            <code>RAZORPAY_KEY_SECRET</code> as secrets on the <code>create-payment-link</code> Edge Function — the
            secret key must never go in this form, only in the Edge Function's secrets. Payments are tracked and
            confirmed automatically — no manual review needed. See the README for the one-time webhook setup.
          </p>
          <input placeholder="Razorpay Key ID (rzp_live_... or rzp_test_...)" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} />
        </>
      )}

      <button
        type="button"
        className="btn btn--primary"
        onClick={() => onSave({ mode, upi_id: upiId, upi_payee_name: payeeName, razorpay_key_id: razorpayKeyId })}
      >
        Save
      </button>
    </div>
  )
}
