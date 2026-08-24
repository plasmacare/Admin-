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
  return Notification.requestPermission()
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

export function notify(title, options) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  if (!areNotificationsEnabled()) return
  try {
    new Notification(title, options)
  } catch {
    // Some browsers (mostly mobile Chrome) require a service worker for
    // notifications while the tab is backgrounded — fail quietly rather
    // than crash the app over a missed alert.
  }
}
