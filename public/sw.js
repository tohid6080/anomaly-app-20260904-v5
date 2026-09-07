const CACHE_NAME = "ihms-cache-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// استراتژی network-first: همیشه نسخه‌ی جدید را ترجیح می‌دهد، فقط وقتی آفلاین است از کش استفاده می‌کند
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // درخواست‌های افزونه‌های مرورگر (chrome-extension:// و مشابه) هم وارد این
  // event می‌شوند ولی Cache API فقط از scheme های http/https پشتیبانی می‌کند
  if (!event.request.url.startsWith("http")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
