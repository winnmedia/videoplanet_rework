/**
 * Service Worker for VLANET Performance Optimization
 * Implements caching strategies for improved Core Web Vitals
 */

const CACHE_NAME = 'vlanet-v1.0.0';
const PERFORMANCE_CACHE = 'vlanet-perf-v1.0.0';
const API_CACHE = 'vlanet-api-v1.0.0';
const STATIC_CACHE = 'vlanet-static-v1.0.0';

// Resources to cache immediately on install
const CRITICAL_RESOURCES = [
  '/',
  '/projects',
  '/calendar',
  '/feedback',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
];

// Cache strategies configuration
const CACHE_STRATEGIES = {
  // Critical resources - Cache First (fastest loading)
  critical: {
    cacheName: STATIC_CACHE,
    strategy: 'CacheFirst',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // API responses - Network First with fallback
  api: {
    cacheName: API_CACHE,
    strategy: 'NetworkFirst',
    maxAge: 5 * 60 * 1000, // 5 minutes
    networkTimeout: 3000, // 3 seconds
  },
  
  // Static assets - Cache First with update
  static: {
    cacheName: STATIC_CACHE,
    strategy: 'CacheFirst',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  
  // Images and media - Cache First
  media: {
    cacheName: STATIC_CACHE,
    strategy: 'CacheFirst',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  
  // Performance metrics - Network Only (always fresh)
  performance: {
    cacheName: PERFORMANCE_CACHE,
    strategy: 'NetworkOnly',
  },
};

/**
 * Install event - Cache critical resources
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache critical resources for instant loading
        await cache.addAll(CRITICAL_RESOURCES);
        console.log('[SW] Critical resources cached');
        
        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Failed to cache critical resources:', error);
      }
    })()
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name !== CACHE_NAME && 
          name !== PERFORMANCE_CACHE && 
          name !== API_CACHE && 
          name !== STATIC_CACHE
        );
        
        await Promise.all(
          oldCaches.map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
        
        // Take control of all clients immediately
        await self.clients.claim();
        
        console.log('[SW] Service worker activated');
      } catch (error) {
        console.error('[SW] Failed to activate service worker:', error);
      }
    })()
  );
});

/**
 * Fetch event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') return;
  
  // Determine cache strategy based on request
  const strategy = getCacheStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
  );
});

/**
 * Message event - Handle commands from main thread
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      cacheUrls(data.urls);
      break;
      
    case 'CLEAR_CACHE':
      clearCache(data.cacheName);
      break;
      
    case 'PRELOAD_CRITICAL':
      preloadCriticalResources(data.urls);
      break;
      
    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

/**
 * Determine caching strategy for a request
 */
function getCacheStrategy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Performance metrics - never cache
  if (pathname.includes('/api/performance') || pathname.includes('/api/metrics')) {
    return CACHE_STRATEGIES.performance;
  }
  
  // API requests - network first with cache fallback
  if (pathname.startsWith('/api/')) {
    return CACHE_STRATEGIES.api;
  }
  
  // Next.js static files - cache first
  if (pathname.startsWith('/_next/static/')) {
    return CACHE_STRATEGIES.static;
  }
  
  // Images and media - cache first
  if (isMediaRequest(request)) {
    return CACHE_STRATEGIES.media;
  }
  
  // Critical pages - cache first
  if (CRITICAL_RESOURCES.includes(pathname)) {
    return CACHE_STRATEGIES.critical;
  }
  
  // Default to network first for HTML pages
  if (request.headers.get('accept')?.includes('text/html')) {
    return CACHE_STRATEGIES.api;
  }
  
  // Default to cache first for other resources
  return CACHE_STRATEGIES.static;
}

/**
 * Handle request with appropriate caching strategy
 */
async function handleRequest(request, strategy) {
  const { cacheName, strategy: strategyName, maxAge, networkTimeout } = strategy;
  
  try {
    switch (strategyName) {
      case 'CacheFirst':
        return await cacheFirst(request, cacheName, maxAge);
        
      case 'NetworkFirst':
        return await networkFirst(request, cacheName, maxAge, networkTimeout);
        
      case 'NetworkOnly':
        return await networkOnly(request);
        
      default:
        return await fetch(request);
    }
  } catch (error) {
    console.error('[SW] Request failed:', error);
    
    // Fallback to cache if network fails
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return getOfflineFallback();
    }
    
    throw error;
  }
}

/**
 * Cache First strategy - serve from cache, update in background
 */
async function cacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Return cached response if available and fresh
  if (cachedResponse && isCacheFresh(cachedResponse, maxAge)) {
    // Update cache in background for next time
    fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Ignore background update errors
    });
    
    return cachedResponse;
  }
  
  // Fetch from network and cache
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return stale cache if network fails
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Network First strategy - try network first, fallback to cache
 */
async function networkFirst(request, cacheName, maxAge, networkTimeout) {
  const cache = await caches.open(cacheName);
  
  try {
    // Race network request with timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network timeout')), networkTimeout)
    );
    
    const networkResponse = await Promise.race([networkPromise, timeoutPromise]);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.warn('[SW] Network request failed, trying cache:', error.message);
  }
  
  // Fallback to cache
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // No cache available, re-throw network error
  throw new Error('Network and cache both failed');
}

/**
 * Network Only strategy - always fetch from network
 */
async function networkOnly(request) {
  return await fetch(request);
}

/**
 * Check if cached response is still fresh
 */
function isCacheFresh(response, maxAge) {
  if (!maxAge) return true;
  
  const cachedDate = new Date(response.headers.get('date') || 0);
  const now = new Date();
  
  return (now - cachedDate) < maxAge;
}

/**
 * Check if request is for media resources
 */
function isMediaRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.toLowerCase();
  
  return /\.(jpg|jpeg|png|gif|webp|avif|svg|mp4|webm|ogg|mp3|wav)$/i.test(pathname);
}

/**
 * Get offline fallback page
 */
function getOfflineFallback() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>VLANET - 오프라인</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f3f4f6;
          }
          .container { 
            text-align: center; 
            padding: 2rem; 
            background: white; 
            border-radius: 8px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          h1 { color: #374151; margin: 0 0 1rem; }
          p { color: #6b7280; margin: 0; }
          .retry-btn {
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>인터넷 연결을 확인해주세요</h1>
          <p>오프라인 상태입니다. 연결이 복원되면 다시 시도해주세요.</p>
          <button class="retry-btn" onclick="window.location.reload()">다시 시도</button>
        </div>
      </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    }
  );
}

/**
 * Cache specific URLs (called from main thread)
 */
async function cacheUrls(urls) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          console.warn('[SW] Failed to cache URL:', url, error);
        }
      })
    );
  } catch (error) {
    console.error('[SW] Failed to cache URLs:', error);
  }
}

/**
 * Clear specific cache
 */
async function clearCache(cacheName) {
  try {
    const deleted = await caches.delete(cacheName);
    console.log('[SW] Cache cleared:', cacheName, deleted);
  } catch (error) {
    console.error('[SW] Failed to clear cache:', error);
  }
}

/**
 * Preload critical resources for better performance
 */
async function preloadCriticalResources(urls) {
  const cache = await caches.open(CACHE_NAME);
  
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { 
          mode: 'no-cors',
          credentials: 'omit' 
        });
        
        if (response.ok || response.type === 'opaque') {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn('[SW] Failed to preload resource:', url, error);
      }
    })
  );
}

console.log('[SW] Service Worker loaded');