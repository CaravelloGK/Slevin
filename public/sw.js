const CACHE_NAME = 'slevin-v1'

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/login',
  '/manifest.json',
  '/api/pwa/icon?size=192',
  '/api/pwa/icon?size=512',
]

// Patterns that should never be cached
const NETWORK_ONLY_PATTERNS = [
  /\/api\/offline-replay/,
  /\/auth\//,
  /\.supabase\.co\//,
]

// Static asset patterns — cache-first
const CACHE_FIRST_PATTERNS = [
  /\/_next\/static\//,
  /\/api\/pwa\/icon/,
  /\/manifest\.json$/,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Non-GET requests: network only, no caching
  if (request.method !== 'GET') return

  // Network-only patterns (auth, mutations, Supabase)
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.href))) return

  // Cache-first for static assets
  if (CACHE_FIRST_PATTERNS.some((p) => p.test(url.href))) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Network-first for everything else (pages, API)
  event.respondWith(networkFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // Return a minimal offline response for navigation requests
    if (request.mode === 'navigate') {
      const offlineMatch = await caches.match('/login')
      if (offlineMatch) return offlineMatch
    }
    return new Response('Offline', { status: 503 })
  }
}
