const CACHE = "lumarig-remote-v3";
const STATIC_SHELL = ["/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("lumarig-remote-") && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never serve the application document from an old cache. A stale index.html
  // can point at hashed Vercel assets that no longer exist and leave Safari on
  // a blank white page.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(
        () =>
          new Response(
            `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#071019">
  <title>LumaRig Remote Offline</title>
  <style>
    html,body{margin:0;min-height:100%;background:#071019;color:#d9e6ed;font-family:system-ui,-apple-system,sans-serif}
    body{display:grid;place-items:center;padding:24px}
    main{max-width:420px;padding:24px;border:1px solid #203542;border-radius:14px;background:#0c1822}
    h1{font-size:22px;margin:0 0 8px}
    p{color:#78909f;line-height:1.5;margin:0}
  </style>
</head>
<body><main><h1>LumaRig Remote is offline</h1><p>Reconnect to the internet and reload. Your Studio pairing will remain available while the session is valid.</p></main></body>
</html>`,
            {
              status: 503,
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store"
              }
            }
          )
      )
    );
    return;
  }

  // Hashed build assets are immutable by filename, so cache-first is safe.
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Small app metadata can use stale-while-revalidate.
  if (
    url.origin === self.location.origin &&
    STATIC_SHELL.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fresh = fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
        return cached || fresh;
      })
    );
  }
});
