/* KAYAR service worker — installable shell, offline-first for app assets.
   NEVER cache authenticated API mutations: all network traffic is same-origin
   static assets only; navigation is network-first with cache fallback. */
const VERSION = "kayar-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // mutations are never cached
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // navigation: network first, offline shell fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // images / icons: stale-while-revalidate
  if (/\.(png|jpe?g|svg|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || network;
      }),
    );
    return;
  }

  // everything else: cache first, network fallback
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
