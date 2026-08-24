import { useEffect, useState } from 'react'
import {
  isNotificationSupported, getPermission, requestPermission,
  areNotificationsEnabled, setNotificationsEnabled,
} from '../lib/notifications'

export default function NotificationBanner() {
  const [permission, setPermission] = useState(getPermission())
  const [enabled, setEnabled] = useState(areNotificationsEnabled())
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pc_notif_dismissed') === '1')

  useEffect(() => {
    setPermission(getPermission())
  }, [])

  if (!isNotificationSupported()) return null

  async function handleEnable() {
    const result = await requestPermission()
    setPermission(result)
    if (result === 'granted') {
      setNotificationsEnabled(true)
      setEnabled(true)
    }
  }

  function handleToggle() {
    const next = !enabled
    setNotificationsEnabled(next)
    setEnabled(next)
  }

  function handleDismiss() {
    sessionStorage.setItem('pc_notif_dismissed', '1')
    setDismissed(true)
  }

  // Permission already granted at least once — show a persistent on/off
  // switch instead of a one-time banner, so admin can always find it.
  if (permission === 'granted') {
    return (
      <div className="notif-toggle">
        <span className="notif-toggle__label">
          New-booking notifications {enabled ? 'on' : 'off'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`notif-toggle__switch${enabled ? ' notif-toggle__switch--on' : ''}`}
          onClick={handleToggle}
        >
          <span className="notif-toggle__knob" />
        </button>
      </div>
    )
  }

  if (dismissed) return null

  return (
    <div className="notif-banner">
      {permission === 'denied' ? (
        <>
          <p>
            Notifications are blocked for this site. To get alerted when a new booking comes in, open your browser's
            site settings for this page and allow Notifications, then reload.
          </p>
          <button type="button" className="btn btn--ghost" onClick={handleDismiss}>Dismiss</button>
        </>
      ) : (
        <>
          <p>Turn on notifications to get alerted the moment a new booking comes in.</p>
          <div className="notif-banner__actions">
            <button type="button" className="btn btn--primary" onClick={handleEnable}>Enable notifications</button>
            <button type="button" className="btn btn--ghost" onClick={handleDismiss}>Not now</button>
          </div>
        </>
      )}
    </div>
  )
}
