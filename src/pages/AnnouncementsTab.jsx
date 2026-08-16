import { useEffect, useState } from 'react'
import {
  fetchAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement, setActiveAnnouncement,
} from '../lib/contentAdmin'

export default function AnnouncementsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [ctaText, setCtaText] = useState('')
  const [ctaLink, setCtaLink] = useState('')

  async function load() {
    setLoading(true)
    try {
      setItems(await fetchAnnouncements())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    try {
      await addAnnouncement({ title: title.trim(), message: message.trim(), ctaText: ctaText.trim(), ctaLink: ctaLink.trim() })
      setTitle('')
      setMessage('')
      setCtaText('')
      setCtaLink('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleActivate(id) {
    try {
      await setActiveAnnouncement(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeactivate(id) {
    try {
      await updateAnnouncement(id, { is_active: false })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    try {
      await deleteAnnouncement(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="announcements-tab">
      <div className="slots-form-card">
        <h3>New announcement</h3>
        <p className="slots-form-card__hint">
          Shows as a popup when a customer opens the site — skippable, or auto-closes after 15 seconds. Only one can
          be active at a time.
        </p>
        <form className="announcements-tab__form" onSubmit={handleAdd}>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea rows={3} placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
          <input placeholder="Button text (optional)" value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
          <input placeholder="Button link (optional)" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} />
          <button type="submit" className="btn btn--primary btn--block">Create</button>
        </form>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <h3 className="slots-list-title">All announcements</h3>
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : items.length === 0 ? (
        <p className="admin-empty">None yet.</p>
      ) : (
        <div className="announcements-tab__list">
          {items.map((a) => (
            <div key={a.id} className={`announcement-row${a.is_active ? ' announcement-row--active' : ''}`}>
              <div className="announcement-row__top">
                <span className="announcement-row__title">{a.title}</span>
                {a.is_active && <span className="badge badge--confirmed">Live</span>}
              </div>
              <p className="announcement-row__message">{a.message}</p>
              <div className="announcement-row__actions">
                {a.is_active ? (
                  <button type="button" className="btn btn--ghost" onClick={() => handleDeactivate(a.id)}>Deactivate</button>
                ) : (
                  <button type="button" className="btn btn--secondary" onClick={() => handleActivate(a.id)}>Activate</button>
                )}
                <button type="button" className="catalog-row__delete" onClick={() => handleDelete(a.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
