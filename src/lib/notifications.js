const ENABLED_KEY = 'pc_notifications_enabled'

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

export async function requestPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  const result = await Notification.requestPermission()
  // Register the service worker as soon as we have permission — needed
  // so notify() can route through it (see notify() below for why).
  if (result === 'granted' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  }
  return result
}

/**
 * A separate on/off switch on top of the browser permission. Browser
 * permission ('granted') just means notifications are *allowed* — this
 * flag is the admin's own choice to actually receive them right now.
 * Defaults to on once permission has been granted at all.
 */
export function areNotificationsEnabled() {
  const stored = localStorage.getItem(ENABLED_KEY)
  if (stored === null) return true
  return stored === '1'
}

export function setNotificationsEnabled(enabled) {
  localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0')
}

/**
 * Shows a notification. Routes through the registered service worker's
 * showNotification() when available — plain `new Notification()` is
 * unreliable on Android Chrome once the tab is backgrounded/screen is
 * off, which is why "enabled but nothing arrives" happens even with
 * permission granted. Falls back to the plain constructor only if no
 * service worker is available (e.g. this runs before it finishes
 * registering, or an unsupported browser).
 */
export async function notify(title, options) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  if (!areNotificationsEnabled()) return

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null)
      if (registration) {
        await registration.showNotification(title, options)
        return
      }
    }
    new Notification(title, options)
  } catch {
    // Fail quietly rather than crash the app over a missed alert.
  }
}
