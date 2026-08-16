import { useEffect, useState } from 'react'
import { fetchLegalPages, updateLegalPage, addLegalPage } from '../lib/contentAdmin'

export default function PagesTab() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newTitle, setNewTitle] = useState('')

  async function load() {
    setLoading(true)
    try {
      setPages(await fetchLegalPages())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleSave(page, content, title) {
    setError('')
    setNotice('')
    try {
      await updateLegalPage(page.id, { content, title })
      setNotice(
        content.trim()
          ? `"${title}" is now live at /pages/${page.slug}.`
          : `"${title}" is empty, so it's hidden from the customer site.`
      )
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddPage(e) {
    e.preventDefault()
    if (!newSlug.trim() || !newTitle.trim()) return
    try {
      await addLegalPage({ slug: newSlug.trim().toLowerCase().replace(/\s+/g, '-'), title: newTitle.trim() })
      setNewSlug('')
      setNewTitle('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="pages-tab">
      {notice && <p className="admin-notice">{notice}</p>}
      {error && <p className="admin-error">{error}</p>}

      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <div className="pages-tab__list">
          {pages.map((page) => (
            <PageEditor key={page.id} page={page} onSave={handleSave} />
          ))}
        </div>
      )}

      <div className="slots-form-card">
        <h3>Add another page</h3>
        <form className="pages-tab__add-form" onSubmit={handleAddPage}>
          <input placeholder="Title (e.g. Shipping Policy)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <input placeholder="URL slug (e.g. shipping)" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
          <button type="submit" className="btn btn--primary">Add</button>
        </form>
      </div>
    </div>
  )
}

function PageEditor({ page, onSave }) {
  const [title, setTitle] = useState(page.title)
  const [content, setContent] = useState(page.content || '')
  const isLive = content.trim().length > 0
  const isDirty = title !== page.title || content !== (page.content || '')

  return (
    <div className="pages-tab__card">
      <div className="pages-tab__card-top">
        <input className="pages-tab__title-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        <span className={`badge ${isLive ? 'badge--confirmed' : ''}`}>{isLive ? 'Live' : 'Hidden'}</span>
      </div>
      <p className="pages-tab__slug">/pages/{page.slug}</p>
      <textarea
        rows={6}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write the page content here. Separate paragraphs with a blank line. Leave empty to keep this page hidden from customers."
      />
      <button
        type="button"
        className="btn btn--primary"
        disabled={!isDirty}
        onClick={() => onSave(page, content, title)}
      >
        Save
      </button>
    </div>
  )
}
