import { useEffect, useState } from 'react'
import { fetchSlots, addSlot, addSlotsBulk, updateSlot, deleteSlot, generateSlotRange } from '../lib/catalogData'

export default function SlotsTab() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [single, setSingle] = useState({ start: '', end: '', capacity: 5 })
  const [bulk, setBulk] = useState({ start: '08:00', end: '18:00', interval: 60, capacity: 5 })
  const [preview, setPreview] = useState([])

  async function load() {
    setLoading(true)
    try {
      setSlots(await fetchSlots())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleAddSingle(e) {
    e.preventDefault()
    if (!single.start || !single.end) return
    try {
      await addSlot({ start_time: `${single.start}:00`, end_time: `${single.end}:00`, max_capacity: Number(single.capacity) })
      setSingle({ start: '', end: '', capacity: 5 })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  function handlePreviewBulk() {
    const generated = generateSlotRange({
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
      setNotice(`${preview.length} slots add ho gaye.`)
      setPreview([])
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleToggleActive(slot) {
    setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, is_active: !s.is_active } : s)))
    try {
      await updateSlot(slot.id, { is_active: !slot.is_active })
    } catch (err) {
      setError(err.message)
      load()
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
    if (!confirm('Ye slot delete karein?')) return
    try {
      await deleteSlot(slot.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="slots">
      <div className="slots-form-card">
        <h3>Ek slot add karo</h3>
        <form className="slots-single-form" onSubmit={handleAddSingle}>
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
        <h3>Bulk mein add karo</h3>
        <p className="slots-form-card__hint">Ek time range aur interval do — sab slots khud ban jayenge.</p>
        <div className="slots-bulk-form">
          <label>
            Start
            <input type="time" value={bulk.start} onChange={(e) => setBulk({ ...bulk, start: e.target.value })} />
          </label>
          <label>
            End
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
            <p>{preview.length} slots banenge:</p>
            <div className="slots-preview__chips">
              {preview.map((s, i) => (
                <span key={i} className="slots-preview__chip">
                  {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                </span>
              ))}
            </div>
            <button type="button" className="btn btn--primary btn--block" onClick={handleConfirmBulk}>
              In sabko confirm karo
            </button>
          </div>
        )}
      </div>

      {notice && <p className="admin-notice">{notice}</p>}
      {error && <p className="admin-error">{error}</p>}

      <h3 className="slots-list-title">Sab slots</h3>
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <div className="catalog-list">
          {slots.map((s) => (
            <div key={s.id} className={`catalog-row${s.is_active ? '' : ' catalog-row--inactive'}`}>
              <span className="slots-row__time">{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</span>
              <input
                className="catalog-row__price"
                type="number"
                defaultValue={s.max_capacity}
                onBlur={(e) => Number(e.target.value) !== s.max_capacity && handleCapacity(s, Number(e.target.value))}
              />
              <label className="catalog-row__active">
                <input type="checkbox" checked={s.is_active} onChange={() => handleToggleActive(s)} />
                Active
              </label>
              <button type="button" className="catalog-row__delete" onClick={() => handleDelete(s)}>
                Delete
              </button>
            </div>
          ))}
          {slots.length === 0 && <p className="admin-empty">Koi slot nahi hai abhi.</p>}
        </div>
      )}
    </div>
  )
}
