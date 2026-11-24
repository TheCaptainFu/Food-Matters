// The service worker only runs in production builds. In development it
// would serve stale cached files over Vite's live reload, so any left over
// from testing a build on localhost is removed.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Not fatal: the app works the same, just not offline.
      })
    })
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
  }
}
