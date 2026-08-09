import { useEffect, useState } from 'react'
import { isNotificationSupported, getPermission, requestPermission } from '../lib/notifications'

export default function NotificationBanner() {
  const [permission, setPermission] = useState(getPermission())
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pc_notif_dismissed') === '1')

  useEffect(() => {
    setPermission(getPermission())
  }, [])

  if (!isNotificationSupported() || permission === 'granted' || dismissed) return null

  async function handleEnable() {
    const result = await requestPermission()
    setPermission(result)
  }

  function handleDismiss() {
    sessionStorage.setItem('pc_notif_dismissed', '1')
    setDismissed(true)
  }

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
