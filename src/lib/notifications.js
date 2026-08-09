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

export function notify(title, options) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, options)
  } catch {
    // Some browsers (mostly mobile Chrome) require a service worker for
    // notifications while the tab is backgrounded — fail quietly rather
    // than crash the app over a missed alert.
  }
}
