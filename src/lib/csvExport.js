export function exportBookingsCsv(bookings, lookups) {
  const { packagesById, testsById, slotsById } = lookups
  const headers = [
    'Booking ID', 'Name', 'Phone', 'Type', 'Date', 'Slot', 'Tests/Packages',
    'Amount', 'Status', 'Call Status', 'Verified', 'Assigned Staff', 'Report Status',
    'Patient Name', 'Patient Age', 'Patient Gender', 'Patient Blood Group', 'Created At',
  ]

  const rows = bookings.map((b) => {
    const slot = slotsById[b.slot_id]
    const slotLabel = slot ? `${slot.start_time?.slice(0, 5)}-${slot.end_time?.slice(0, 5)}` : ''
    const packageNames = (b.selected_packages || []).map((id) => packagesById[id]?.name).filter(Boolean)
    const testNames = (b.selected_tests || []).map((id) => testsById[id]?.name).filter(Boolean)
    return [
      b.id,
      b.customer_name || '',
      b.customer_phone || '',
      b.booking_type === 'home_collection' ? 'Home Collection' : 'Lab Visit',
      b.scheduled_date || '',
      slotLabel,
      [...packageNames, ...testNames].join('; '),
      b.total_amount ?? '',
      b.status || '',
      b.call_status || '',
      b.phone_verified ? 'Yes' : 'No',
      b.assigned_staff || '',
      b.report_status || '',
      b.patient_name || '',
      b.patient_age ?? '',
      b.patient_gender || '',
      b.patient_blood_group || '',
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
