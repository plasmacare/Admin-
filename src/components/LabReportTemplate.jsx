import { Fragment } from 'react'
import Barcode from './Barcode'
import logoFull from '../assets/logo-full.png'
import './LabReportTemplate.css'

const BADGES = [
  { label: 'ADVANCED\nTECHNOLOGY', icon: MicroscopeIcon },
  { label: 'ACCURATE\nRESULTS', icon: TargetIcon },
  { label: 'TRUSTED\nEXPERTISE', icon: ShieldIcon },
  { label: 'PATIENT\nFOCUSED', icon: HeartIcon },
]

function formatDateTime(iso) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB').replaceAll('/', '/')
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date} ${time}`
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB')
}

export default function LabReportTemplate({ booking, doctor, regNo, registeredOn, receivedOn, sections, qrDataUrl }) {
  return (
    <div className="lab-report" id="lab-report-capture">
      <header className="lab-report__header">
        <img src={logoFull} alt="" className="lab-report__logo" />
        <div className="lab-report__badges">
          {BADGES.map((b, i) => (
            <div key={i} className="lab-report__badge">
              <span className="lab-report__badge-icon"><b.icon /></span>
              <span className="lab-report__badge-label">{b.label.split('\n').map((line, j) => <span key={j}>{line}<br /></span>)}</span>
            </div>
          ))}
        </div>
      </header>
      <div className="lab-report__accent-bar" />

      <div className="lab-report__patient-row">
        <div className="lab-report__patient-info">
          <p className="lab-report__patient-name">{booking.patient_gender === 'female' ? 'Ms.' : booking.patient_gender === 'other' ? '' : 'Mr.'} {(booking.patient_name || booking.customer_name || '').toUpperCase()}</p>
          <p><span>Age / Sex</span> : {booking.patient_age || '—'} YRS / {(booking.patient_gender || '?').slice(0, 1).toUpperCase()}</p>
          <p><span>Referred by</span> : Self</p>
          <p><span>Reg. no.</span> : <strong>{regNo}</strong></p>
        </div>
        <div className="lab-report__barcode-block">
          <Barcode value={regNo} />
          <span className="lab-report__reg-no">{regNo}</span>
          <p><span>Registered on</span> : {formatDateTime(registeredOn)}</p>
          <p><span>Received on</span> : {formatDate(receivedOn)}</p>
        </div>
        <div className="lab-report__qr-block">
          <span>Scan to download</span>
          {qrDataUrl && <img src={qrDataUrl} alt="" className="lab-report__qr-img" />}
        </div>
      </div>

      {sections.map((section, si) => (
        <div key={si} className="lab-report__section">
          <h2 className="lab-report__section-title">{section.title}</h2>
          <table className="lab-report__table">
            <thead>
              <tr>
                <th>TEST</th>
                <th>VALUE</th>
                <th>UNIT</th>
                <th>REFERENCE</th>
              </tr>
            </thead>
            <tbody>
              {section.tests.map((test, ti) => (
                <Fragment key={ti}>
                  <tr className="lab-report__test-row">
                    <td className="lab-report__test-name">{test.name}</td>
                    <td className={`lab-report__test-value${test.flag ? ' lab-report__test-value--flag' : ''}`}>
                      {test.flag && <span className="lab-report__flag">{test.flag}</span>} {test.value}
                    </td>
                    <td>{test.unit}</td>
                    <td className="lab-report__reference">
                      {(test.reference || '').split('\n').map((line, li) => <span key={li}>{line}<br /></span>)}
                    </td>
                  </tr>
                  {test.description && (
                    <tr className="lab-report__desc-row">
                      <td colSpan={4}>{test.description}</td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <p className="lab-report__end">~~~ End of report ~~~</p>

      <div className="lab-report__sign-row">
        <span className="lab-report__page">Page 1 of 1</span>
        {doctor && (
          <div className="lab-report__sign-block">
            {doctor.signature_url && <img src={doctor.signature_url} alt="" crossOrigin="anonymous" className="lab-report__sign-img" />}
            <p className="lab-report__doctor-name">{doctor.name}</p>
            <p className="lab-report__doctor-qual">{doctor.qualification}</p>
          </div>
        )}
      </div>

      <footer className="lab-report__footer">
        <div className="lab-report__footer-item">
          <MicroscopeIcon light /> <span>Advanced Technology<br />for Accurate Results</span>
        </div>
        <div className="lab-report__footer-item">
          <PinIcon light /> <span>G13, K8, BDA Market Complex,<br />Kalinga Nagar, Bhubaneswar,<br />Odisha 751003</span>
        </div>
        <div className="lab-report__footer-item">
          <PhoneIcon light /> <span>8112060205<br />(Call &amp; WhatsApp)</span>
        </div>
        <div className="lab-report__footer-item">
          <MailIcon light /> <span>official.plasmacare<br />@gmail.com</span>
        </div>
      </footer>
    </div>
  )
}

function MicroscopeIcon({ light }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={light ? '#fff' : 'var(--red-600)'} strokeWidth="1.8"><path d="M9 18h8M12 18v-4M8 14h6l1-5-3-3-3 1-1 4-3 1 1 3z" /><circle cx="12" cy="7" r="2" /></svg>
}
function TargetIcon({ light }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={light ? '#fff' : 'var(--red-600)'} strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" fill={light ? '#fff' : 'var(--red-600)'} /></svg>
}
function ShieldIcon({ light }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={light ? '#fff' : 'var(--red-600)'} strokeWidth="1.8"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /></svg>
}
function HeartIcon({ light }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={light ? '#fff' : 'var(--red-600)'} strokeWidth="1.8"><path d="M12 21s-7-4.4-9.5-9C0.8 8.4 2 5 5.2 4.2 7.5 3.6 9.7 4.8 12 7c2.3-2.2 4.5-3.4 6.8-2.8C22 5 23.2 8.4 21.5 12 19 16.6 12 21 12 21z" /></svg>
}
function PinIcon({ light }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={light ? '#fff' : 'var(--navy-950)'} strokeWidth="1.8"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
}
function PhoneIcon({ light }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={light ? '#fff' : 'var(--navy-950)'} strokeWidth="1.8"><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2C9.6 22 2 14.4 2 6a2 2 0 0 1 2-2z" /></svg>
}
function MailIcon({ light }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={light ? '#fff' : 'var(--navy-950)'} strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
}
