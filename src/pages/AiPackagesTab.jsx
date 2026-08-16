import { useEffect, useState } from 'react'
import { generatePackageSuggestions, fetchPendingSuggestions, approveSuggestion, rejectSuggestion } from '../lib/aiPackages'

export default function AiPackagesTab() {
  const [brief, setBrief] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setLoading(true)
    try {
      setSuggestions(await fetchPendingSuggestions())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function handleGenerate() {
    if (!brief.trim()) return
    setError('')
    setNotice('')
    setGenerating(true)
    try {
      await generatePackageSuggestions(brief)
      setNotice('New suggestions are ready below — review and approve the ones you want.')
      setBrief('')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprove(s) {
    try {
      await approveSuggestion(s)
      setNotice(`"${s.name}" is now live on the customer site.`)
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleReject(s) {
    try {
      await rejectSuggestion(s.id)
      setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="ai-packages">
      <div className="slots-form-card">
        <h3>Draft new packages with AI</h3>
        <p className="slots-form-card__hint">
          Describe what you want — themes, margin targets, which tests to build around. E.g. "Weekend package built
          around our blood tests, 40% margin. Weekday package for office-goers, fast turnaround, 25% margin.
          Occasional full-body package, premium pricing."
        </p>
        <textarea
          className="ai-packages__brief"
          rows={4}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Type your brief here…"
        />
        <button type="button" className="btn btn--primary btn--block" disabled={generating || !brief.trim()} onClick={handleGenerate}>
          {generating ? 'Generating…' : 'Generate suggestions'}
        </button>
      </div>

      {notice && <p className="admin-notice">{notice}</p>}
      {error && <p className="admin-error">{error}</p>}

      <h3 className="slots-list-title">Pending review</h3>
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : suggestions.length === 0 ? (
        <p className="admin-empty">No pending suggestions. Generate some above.</p>
      ) : (
        <div className="ai-packages__list">
          {suggestions.map((s) => (
            <div key={s.id} className="ai-package-card">
              <div className="ai-package-card__top">
                <span className="ai-package-card__name">{s.name}</span>
                <span className="ai-package-card__price">₹{s.price}</span>
              </div>
              {s.theme && <span className="badge">{s.theme}</span>}
              <p className="ai-package-card__desc">{s.description}</p>
              {s.ai_rationale && <p className="ai-package-card__rationale">Why: {s.ai_rationale}</p>}
              <p className="ai-package-card__count">{(s.included_tests || []).length} tests included</p>
              <div className="ai-package-card__actions">
                <button type="button" className="btn btn--primary" onClick={() => handleApprove(s)}>Approve & publish</button>
                <button type="button" className="btn btn--ghost" onClick={() => handleReject(s)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
