import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'

function offlineServiceWorker(): Plugin {
  return {
    name: 'sur-offline-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const precache = [
        './',
        './index.html',
        './favicon.svg',
        './manifest.webmanifest',
        ...Object.keys(bundle)
          .filter((file) => file !== 'index.html' && /\.(?:js|css|html|svg|webmanifest)$/.test(file))
          .map((file) => `./${file}`),
      ]
      const cacheVersion = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12)
      const source = `
const CACHE_NAME = 'sur-app-${cacheVersion}';
const APP_SHELL = ${JSON.stringify(precache)};
const SHELL_URLS = APP_SHELL.map((path) => new URL(path, self.registration.scope).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('sur-app-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(new URL('index.html', self.registration.scope).href);
        return cached || fetch(request);
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
  );
});
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), offlineServiceWorker()],
})
