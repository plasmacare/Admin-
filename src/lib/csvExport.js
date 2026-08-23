export function exportBookingsCsv(bookings, lookups) {
  const { packagesById, testsById } = lookups
  const headers = [
    'Booking ID', 'Name', 'Phone', 'Type', 'Date', 'Tests/Packages',
    'Amount', 'Status', 'Call Status', 'Assigned Staff', 'Report Status',
    'Patient Name', 'Patient Age', 'Patient Gender', 'Patient Blood Group',
    'Has Prescription', 'IP Address', 'Created At',
  ]

  const rows = bookings.map((b) => {
    const packageNames = (b.selected_packages || []).map((id) => packagesById[id]?.name).filter(Boolean)
    const testNames = (b.selected_tests || []).map((id) => testsById[id]?.name).filter(Boolean)
    return [
      b.id,
      b.customer_name || '',
      b.customer_phone || '',
      b.booking_type === 'home_collection' ? 'Home Collection' : 'Lab Visit',
      b.scheduled_date || '',
      [...packageNames, ...testNames].join('; '),
      b.total_amount ?? '',
      b.status || '',
      b.call_status || '',
      b.assigned_staff || '',
      b.report_status || '',
      b.patient_name || '',
      b.patient_age ?? '',
      b.patient_gender || '',
      b.patient_blood_group || '',
      b.prescription_url ? 'Yes' : 'No',
      b.customer_ip || '',
      b.created_at || '',
    ]
  })

  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plasma-care-bookings-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
