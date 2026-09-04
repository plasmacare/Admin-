import QRCode from 'qrcode'
import { supabase } from './supabase'

/* ---------- Doctors ---------- */
export async function fetchDoctors() {
  const { data, error } = await supabase.from('doctors').select('*').eq('is_active', true).order('name')
  if (error) throw error
  return data || []
}

export async function addDoctor({ name, qualification, signatureFile }) {
  let signatureUrl = null
  if (signatureFile) {
    const path = `${Date.now()}-${signatureFile.name}`
    const { error: uploadError } = await supabase.storage.from('doctor-signatures').upload(path, signatureFile)
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('doctor-signatures').getPublicUrl(path)
    signatureUrl = data.publicUrl
  }
  const { data, error } = await supabase
    .from('doctors')
    .insert({ name, qualification, signature_url: signatureUrl })
    .select()
    .single()
  if (error) throw error
  return data
}

/* ---------- Lab reports ---------- */
export async function fetchLabReport(bookingId) {
  const { data, error } = await supabase
    .from('lab_reports')
    .select('*, doctor:doctors(*)')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Creates (or reuses) the lab_reports row for a booking, so the reg no stays stable across edits before the PDF is generated. */
export async function ensureLabReport(bookingId) {
  const existing = await fetchLabReport(bookingId)
  if (existing) return existing
  const { data, error } = await supabase
    .from('lab_reports')
    .insert({ booking_id: bookingId })
    .select('*, doctor:doctors(*)')
    .single()
  if (error) throw error
  return data
}

export async function saveLabReportDraft(id, { doctorId, sections }) {
  const { error } = await supabase
    .from('lab_reports')
    .update({ doctor_id: doctorId || null, sections })
    .eq('id', id)
  if (error) throw error
}

/** Builds the QR payload — a link to the customer-facing report page for this booking. */
export function buildReportQrUrl(bookingId) {
  const base = (import.meta.env.VITE_CUSTOMER_SITE_URL || '').replace(/\/$/, '')
  return `${base}/report/${bookingId}`
}

export async function generateQrDataUrl(text) {
  return QRCode.toDataURL(text, { width: 240, margin: 1, color: { dark: '#0B2545', light: '#FFFFFF' } })
}

/**
 * Captures the given DOM node (the rendered LabReportTemplate) with
 * html2canvas and assembles it into a single-page A4 PDF, returning a
 * Blob ready to upload.
 */
export async function renderReportToPdfBlob(node) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
  const imgData = canvas.toDataURL('image/jpeg', 0.95)

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const imgHeight = (canvas.height * pageWidth) / canvas.width

  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, imgHeight)
  } else {
    // Content taller than one A4 page (e.g. many tests) — split across
    // multiple pages by shifting the same image up each time.
    let remaining = imgHeight
    let offset = 0
    while (remaining > 0) {
      pdf.addImage(imgData, 'JPEG', 0, offset, pageWidth, imgHeight)
      remaining -= pageHeight
      offset -= pageHeight
      if (remaining > 0) pdf.addPage()
    }
  }
  return pdf.output('blob')
}

/** Uploads the generated PDF to the same `reports` bucket the manual "Upload report" flow uses, and marks the booking accordingly. */
export async function uploadGeneratedReport(bookingId, labReportId, blob) {
  const path = `${bookingId}/${Date.now()}-report.pdf`
  const file = new File([blob], 'report.pdf', { type: 'application/pdf' })
  const { error: uploadError } = await supabase.storage.from('reports').upload(path, file, { upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('reports').getPublicUrl(path)

  const { error: bookingError } = await supabase
    .from('bookings')
    .update({ report_url: data.publicUrl, report_status: 'uploaded' })
    .eq('id', bookingId)
  if (bookingError) throw bookingError

  const { error: reportError } = await supabase.from('lab_reports').update({ pdf_url: data.publicUrl }).eq('id', labReportId)
  if (reportError) throw reportError

  return data.publicUrl
}
