/// <reference lib="webworker" />
// KAYAR service worker (built by vite-plugin-pwa injectManifest; no external CDN).
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

// App shell + hashed assets (index.html excluded on purpose: pages are network-first)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Never cached: API, auth, uploads endpoint, ops, media streams, audio/video, non-GET
const AV = /\.(mp3|m4a|aac|ogg|wav|mp4|webm)$/i;
const NEVER = (url: URL, req: Request) =>
  req.method !== 'GET' ||
  AV.test(url.pathname) || req.headers.has('range') || req.destination === 'audio' || req.destination === 'video' ||
  (url.origin === self.location.origin && (/^\/(api|upload|ops|healthz|sw\.js)(\/|$|\?)/.test(url.pathname) || url.pathname.startsWith('/media/')));
registerRoute(({ url, request }) => NEVER(url, request), new NetworkOnly());

// HTML navigations: always try the network first so a new deploy is picked up immediately
registerRoute(({ request }) => request.mode === 'navigate', new NetworkFirst({
  cacheName: 'kayar-pages', networkTimeoutSeconds: 5,
  plugins: [new CacheableResponsePlugin({ statuses: [200] }), new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 3600 })],
}));

// Images & covers (same-origin uploads and remote artwork): stale-while-revalidate, bounded
registerRoute(({ request, url }) => request.destination === 'image' && !NEVER(url, request), new StaleWhileRevalidate({
  cacheName: 'kayar-images',
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] }), new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 30 * 24 * 3600, purgeOnQuotaError: true })],
}));

// Fonts: cache-first-ish via SWR
registerRoute(({ request }) => request.destination === 'font', new StaleWhileRevalidate({
  cacheName: 'kayar-fonts', plugins: [new CacheableResponsePlugin({ statuses: [0, 200] }), new ExpirationPlugin({ maxEntries: 20 })],
}));

// Offline fallback for page navigations
setCatchHandler(async ({ request }) => {
  if (request.destination === 'document' || request.mode === 'navigate') return (await matchPrecache('/offline.html')) ?? Response.error();
  return Response.error();
});

// The page asks us to activate when the user taps «به‌روزرسانی»
self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting(); });
