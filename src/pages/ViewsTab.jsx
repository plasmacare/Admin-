import { useEffect, useState } from 'react'
import {
  fetchViewStats, fetchViewsByCity, fetchTotalBookingsCount, subscribeLiveViewerCount,
  fetchSiteSettings, updateSiteSettings,
} from '../lib/analyticsAdmin'
import ViewsMap from '../components/ViewsMap'

export default function ViewsTab() {
  const [stats, setStats] = useState(null)
  const [cities, setCities] = useState([])
  const [bookingsCount, setBookingsCount] = useState(null)
  const [liveCount, setLiveCount] = useState(0)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingQuality, setSavingQuality] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [statsData, cityData, bookingCount, settingsData] = await Promise.all([
        fetchViewStats(),
        fetchViewsByCity(),
        fetchTotalBookingsCount(),
        fetchSiteSettings(),
      ])
      setStats(statsData)
      setCities(cityData)
      setBookingsCount(bookingCount)
      setSettings(settingsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const unsubscribe = subscribeLiveViewerCount(setLiveCount)
    return unsubscribe
  }, [])

  async function handleQualityChange(quality) {
    setSavingQuality(true)
    setSettings((s) => ({ ...s, blood_drop_animation_quality: quality }))
    try {
      await updateSiteSettings({ blood_drop_animation_quality: quality })
    } catch (err) {
      setError(err.message)
      load()
    } finally {
      setSavingQuality(false)
    }
  }

  const conversion =
    stats && stats.total_sessions > 0 ? ((bookingsCount / stats.total_sessions) * 100).toFixed(1) : null

  return (
    <div className="views-tab">
      <div className="slots-form-card">
        <h3>Customer site — hero animation</h3>
        <p className="slots-form-card__hint">
          The blood-drop "glass wall" effect on the customer home screen. Changes apply live — no redeploy needed.
        </p>
        <div className="payments-tab__mode-switch">
          {['off', 'low', 'high'].map((q) => (
            <button
              key={q}
              type="button"
              disabled={savingQuality || !settings}
              className={settings?.blood_drop_animation_quality === q ? 'is-active' : ''}
              onClick={() => handleQualityChange(q)}
            >
              {q === 'off' ? 'Off' : q === 'low' ? 'Low (CSS)' : 'High (WebGL)'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <>
          <div className="views-stats-grid">
            <StatCard label="Live now" value={liveCount} accent="live" />
            <StatCard label="Total views" value={stats?.total_views ?? 0} />
            <StatCard label="Today" value={stats?.today_views ?? 0} />
            <StatCard label="This month" value={stats?.month_views ?? 0} />
            <StatCard label="This year" value={stats?.year_views ?? 0} />
            <StatCard label="Conversion" value={conversion !== null ? `${conversion}%` : '—'} />
          </div>
          <p className="views-tab__hint">
            Conversion = total bookings ÷ unique visitor sessions. "Live now" counts browser tabs currently open on
            the customer site (via Realtime Presence) — it drops as soon as someone closes or backgrounds the tab.
          </p>

          <h3 className="slots-list-title">Traffic by city</h3>
          <p className="views-tab__hint">
            Based on each visitor's IP address — accurate to city level, not exact neighbourhood/zone.
          </p>
          {cities.length === 0 ? (
            <p className="admin-empty">No location data yet.</p>
          ) : (
            <>
              <ViewsMap cities={cities} />
              <div className="views-city-list">
                {cities.map((c) => (
                  <div key={`${c.city}-${c.region}`} className="views-city-row">
                    <span>{c.city}{c.region ? `, ${c.region}` : ''}</span>
                    <span className="views-city-row__count">{c.views}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`views-stat-card${accent === 'live' ? ' views-stat-card--live' : ''}`}>
      {accent === 'live' && <span className="views-stat-card__dot" />}
      <span className="views-stat-card__value">{value}</span>
      <span className="views-stat-card__label">{label}</span>
    </div>
  )
}
