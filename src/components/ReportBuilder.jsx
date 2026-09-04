import { useEffect, useRef, useState } from 'react'
import {
  fetchDoctors, addDoctor, ensureLabReport, saveLabReportDraft,
  buildReportQrUrl, generateQrDataUrl, renderReportToPdfBlob, uploadGeneratedReport,
} from '../lib/reportBuilder'
import LabReportTemplate from './LabReportTemplate'

const FLAGS = ['', 'H', 'L']

function emptyTest() {
  return { name: '', flag: '', value: '', unit: '', reference: '', description: '' }
}
function emptySection() {
  return { title: '', tests: [emptyTest()] }
}

export default function ReportBuilder({ booking, onGenerated }) {
  const [doctors, setDoctors] = useState([])
  const [labReport, setLabReport] = useState(null)
  const [doctorId, setDoctorId] = useState('')
  const [sections, setSections] = useState([emptySection()])
  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [newDoctorName, setNewDoctorName] = useState('')
  const [newDoctorQual, setNewDoctorQual] = useState('')
  const [newDoctorSig, setNewDoctorSig] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const templateRef = useRef(null)

  useEffect(() => {
    fetchDoctors().then(setDoctors).catch(() => {})
    ensureLabReport(booking.id).then((report) => {
      setLabReport(report)
      if (report.doctor_id) setDoctorId(report.doctor_id)
      if (report.sections?.length) setSections(report.sections)
    }).catch((err) => setError(err.message))
    generateQrDataUrl(buildReportQrUrl(booking.id)).then(setQrDataUrl).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id])

  function updateSection(si, fields) {
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, ...fields } : s)))
  }
  function updateTest(si, ti, fields) {
    setSections((prev) =>
      prev.map((s, i) => (i !== si ? s : { ...s, tests: s.tests.map((t, j) => (j === ti ? { ...t, ...fields } : t)) })),
    )
  }
  function addSection() {
    setSections((prev) => [...prev, emptySection()])
  }
  function removeSection(si) {
    setSections((prev) => prev.filter((_, i) => i !== si))
  }
  function addTest(si) {
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, tests: [...s.tests, emptyTest()] } : s)))
  }
  function removeTest(si, ti) {
    setSections((prev) => prev.map((s, i) => (i !== si ? s : { ...s, tests: s.tests.filter((_, j) => j !== ti) })))
  }

  async function handleAddDoctor() {
    if (!newDoctorName.trim() || !newDoctorQual.trim()) return
    setBusy(true)
    try {
      const doctor = await addDoctor({ name: newDoctorName.trim(), qualification: newDoctorQual.trim(), signatureFile: newDoctorSig })
      setDoctors((prev) => [...prev, doctor])
      setDoctorId(doctor.id)
      setShowAddDoctor(false)
      setNewDoctorName('')
      setNewDoctorQual('')
      setNewDoctorSig(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleGenerate() {
    setError('')
    setBusy(true)
    try {
      await saveLabReportDraft(labReport.id, { doctorId, sections })
      // Let the off-screen template re-render with the latest state
      // (images especially) before we capture it.
      await new Promise((resolve) => setTimeout(resolve, 150))
      const blob = await renderReportToPdfBlob(templateRef.current)
      const url = await uploadGeneratedReport(booking.id, labReport.id, blob)
      onGenerated?.(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === doctorId) || null

  return (
    <div className="report-builder">
      <label className="report-builder__field">
        Doctor
        <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">Select doctor…</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name} — {d.qualification}</option>
          ))}
        </select>
      </label>
      {!showAddDoctor ? (
        <button type="button" className="btn btn--ghost" onClick={() => setShowAddDoctor(true)}>+ Add new doctor</button>
      ) : (
        <div className="report-builder__add-doctor">
          <input placeholder="Doctor name" value={newDoctorName} onChange={(e) => setNewDoctorName(e.target.value)} />
          <input placeholder="Qualification (e.g. MD Pathology)" value={newDoctorQual} onChange={(e) => setNewDoctorQual(e.target.value)} />
          <label className="report-builder__sig-upload">
            Signature image (optional)
            <input type="file" accept="image/*" onChange={(e) => setNewDoctorSig(e.target.files[0] || null)} />
          </label>
          <button type="button" className="btn btn--secondary" disabled={busy} onClick={handleAddDoctor}>Save doctor</button>
        </div>
      )}

      {sections.map((section, si) => (
        <div key={si} className="report-builder__section">
          <div className="report-builder__section-head">
            <input
              placeholder="Section title (e.g. BIOCHEMISTRY)"
              value={section.title}
              onChange={(e) => updateSection(si, { title: e.target.value.toUpperCase() })}
            />
            {sections.length > 1 && (
              <button type="button" className="catalog-row__delete" onClick={() => removeSection(si)}>Remove section</button>
            )}
          </div>
          {section.tests.map((test, ti) => (
            <div key={ti} className="report-builder__test">
              <div className="report-builder__test-row">
                <input placeholder="Test name" value={test.name} onChange={(e) => updateTest(si, ti, { name: e.target.value })} />
                <select value={test.flag} onChange={(e) => updateTest(si, ti, { flag: e.target.value })}>
                  {FLAGS.map((f) => <option key={f} value={f}>{f || 'Normal'}</option>)}
                </select>
                <input placeholder="Value" value={test.value} onChange={(e) => updateTest(si, ti, { value: e.target.value })} />
                <input placeholder="Unit" value={test.unit} onChange={(e) => updateTest(si, ti, { unit: e.target.value })} />
              </div>
              <textarea
                placeholder={'Reference range, one line each e.g.\nNormal: 70-100\nDiabetes: >126'}
                rows={2}
                value={test.reference}
                onChange={(e) => updateTest(si, ti, { reference: e.target.value })}
              />
              <textarea
                placeholder="Description (optional, shown under the result)"
                rows={2}
                value={test.description}
                onChange={(e) => updateTest(si, ti, { description: e.target.value })}
              />
              {section.tests.length > 1 && (
                <button type="button" className="catalog-row__delete" onClick={() => removeTest(si, ti)}>Remove test</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn--ghost" onClick={() => addTest(si)}>+ Add test</button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost" onClick={addSection}>+ Add section</button>

      {error && <p className="admin-error">{error}</p>}
      <button type="button" className="btn btn--primary btn--block" disabled={busy || !labReport} onClick={handleGenerate}>
        {busy ? 'Generating…' : 'Generate report PDF'}
      </button>

      {/* Rendered off-screen purely so html2canvas has a real DOM node to capture. */}
      {labReport && (
        <div style={{ position: 'fixed', left: -9999, top: 0 }}>
          <div ref={templateRef}>
            <LabReportTemplate
              booking={booking}
              doctor={selectedDoctor}
              regNo={labReport.reg_no}
              registeredOn={labReport.registered_on}
              receivedOn={labReport.received_on}
              sections={sections}
              qrDataUrl={qrDataUrl}
            />
          </div>
        </div>
      )}
    </div>
  )
}
