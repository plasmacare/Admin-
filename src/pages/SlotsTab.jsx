import { useEffect, useState } from 'react'
import { fetchSlots, addSlot, addSlotsBulk, updateSlot, deleteSlot, generateSlotRange } from '../lib/catalogData'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SlotsTab() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [single, setSingle] = useState({ date: todayStr(), start: '', end: '', capacity: 5 })
  const [bulk, setBulk] = useState({
    startDate: todayStr(),
    endDate: todayStr(),
    start: '08:00',
    end: '18:00',
    interval: 60,
    capacity: 5,
  })
  const [preview, setPreview] = useState([])

  async function load() {
    setLoading(true)
    try {
      setSlots(await fetchSlots({ fromDate: todayStr() }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleAddSingle(e) {
    e.preventDefault()
    if (!single.date || !single.start || !single.end) return
    try {
      await addSlot({
        slot_date: single.date,
        start_time: `${single.start}:00`,
        end_time: `${single.end}:00`,
        max_capacity: Number(single.capacity),
      })
      setSingle({ date: single.date, start: '', end: '', capacity: 5 })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  function handlePreviewBulk() {
    const generated = generateSlotRange({
      startDate: bulk.startDate,
      endDate: bulk.endDate,
      startTime: bulk.start,
      endTime: bulk.end,
      intervalMinutes: Number(bulk.interval),
      capacity: Number(bulk.capacity),
    })
    setPreview(generated)
  }

  async function handleConfirmBulk() {
    if (preview.length === 0) return
    try {
      await addSlotsBulk(preview)
      setNotice(`${preview.length} slots added.`)
      setPreview([])
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCapacity(slot, capacity) {
    setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, max_capacity: capacity } : s)))
    try {
      await updateSlot(slot.id, { max_capacity: capacity })
    } catch (err) {
      setError(err.message)
      load()
    }
  }

  async function handleDelete(slot) {
    if (!confirm('Delete this slot?')) return
    try {
      await deleteSlot(slot.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const slotsByDate = slots.reduce((acc, s) => {
    ;(acc[s.slot_date] ||= []).push(s)
    return acc
  }, {})

  return (
    <div className="slots">
      <div className="slots-form-card">
        <h3>Add a single slot</h3>
        <form className="slots-single-form" onSubmit={handleAddSingle}>
          <input type="date" value={single.date} onChange={(e) => setSingle({ ...single, date: e.target.value })} required />
          <input type="time" value={single.start} onChange={(e) => setSingle({ ...single, start: e.target.value })} required />
          <span>to</span>
          <input type="time" value={single.end} onChange={(e) => setSingle({ ...single, end: e.target.value })} required />
          <input
            type="number"
            min="1"
            value={single.capacity}
            onChange={(e) => setSingle({ ...single, capacity: e.target.value })}
            placeholder="Capacity"
          />
          <button type="submit" className="btn btn--primary">Add</button>
        </form>
      </div>

      <div className="slots-form-card">
        <h3>Add in bulk</h3>
        <p className="slots-form-card__hint">
          Pick a date range, a daily time window, and an interval — a slot is generated for every day in the range.
        </p>
        <div className="slots-bulk-form">
          <label>
            From date
            <input type="date" value={bulk.startDate} onChange={(e) => setBulk({ ...bulk, startDate: e.target.value })} />
          </label>
          <label>
            To date
            <input type="date" value={bulk.endDate} onChange={(e) => setBulk({ ...bulk, endDate: e.target.value })} />
          </label>
          <label>
            Day start
            <input type="time" value={bulk.start} onChange={(e) => setBulk({ ...bulk, start: e.target.value })} />
          </label>
          <label>
            Day end
            <input type="time" value={bulk.end} onChange={(e) => setBulk({ ...bulk, end: e.target.value })} />
          </label>
          <label>
            Interval (min)
            <input type="number" min="5" step="5" value={bulk.interval} onChange={(e) => setBulk({ ...bulk, interval: e.target.value })} />
          </label>
          <label>
            Capacity/slot
            <input type="number" min="1" value={bulk.capacity} onChange={(e) => setBulk({ ...bulk, capacity: e.target.value })} />
          </label>
        </div>
        <button type="button" className="btn btn--secondary btn--block" onClick={handlePreviewBulk}>
          Preview slots
        </button>

        {preview.length > 0 && (
          <div className="slots-preview">
            <p>{preview.length} slots will be created:</p>
            <div className="slots-preview__chips">
              {preview.slice(0, 30).map((s, i) => (
                <span key={i} className="slots-preview__chip">
                  {s.slot_date} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                </span>
              ))}
              {preview.length > 30 && <span className="slots-preview__chip">+{preview.length - 30} more</span>}
            </div>
            <button type="button" className="btn btn--primary btn--block" onClick={handleConfirmBulk}>
              Confirm all
            </button>
          </div>
        )}
      </div>

      {notice && <p className="admin-notice">{notice}</p>}
      {error && <p className="admin-error">{error}</p>}

      <h3 className="slots-list-title">Upcoming slots</h3>
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <div className="slots-by-date">
          {Object.keys(slotsByDate).sort().map((date) => (
            <div key={date} className="slots-date-group">
              <p className="slots-date-group__label">{date}</p>
              <div className="catalog-list">
                {slotsByDate[date].map((s) => (
                  <div key={s.id} className="catalog-row">
                    <span className="slots-row__time">{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</span>
                    <span className="slots-row__booked">{s.booked_count ?? 0}/{s.max_capacity} booked</span>
                    <input
                      className="catalog-row__price"
                      type="number"
                      defaultValue={s.max_capacity}
                      onBlur={(e) => Number(e.target.value) !== s.max_capacity && handleCapacity(s, Number(e.target.value))}
                    />
                    <button type="button" className="catalog-row__delete" onClick={() => handleDelete(s)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {slots.length === 0 && <p className="admin-empty">No upcoming slots yet.</p>}
        </div>
      )}
    </div>
  )
}
