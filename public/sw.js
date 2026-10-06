const CACHE = 'petlist-shell-v5';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch('/');
    const html = await response.clone().text();
    await cache.put('/', response);
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"\s]+)"/g)].map(match => match[1]);
    await cache.addAll([...assets, '/dog.png', '/dog-walk.png', '/cat.png', '/bunny.png', '/hamster.png', '/hunger-bubble.png', '/heart-bubble.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest']);
    for (const asset of assets.filter(path => path.endsWith('.css'))) {
      const css = await (await cache.match(asset)).text();
      const fonts = [...css.matchAll(/url\((?:["'])?([^)'"\s]+\.woff2?)(?:["'])?\)/g)].map(match => new URL(match[1], self.location.origin + asset).pathname);
      await cache.addAll([...new Set(fonts)]);
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request.mode === 'navigate' ? '/' : event.request, response.clone());
      return response;
    } catch {
      return await cache.match(event.request.mode === 'navigate' ? '/' : event.request) ?? Response.error();
    }
  })());
});
