const CACHE_NAME = "ihms-cache-v4";

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

// استراتژی network-first: همیشه نسخه‌ی جدید را ترجیح می‌دهد، فقط وقتی آفلاین
// است از کش استفاده می‌کند.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // درخواست‌های افزونه‌های مرورگر (chrome-extension:// و مشابه) هم وارد این
  // event می‌شوند ولی Cache API فقط از scheme های http/https پشتیبانی می‌کند
  if (!event.request.url.startsWith("http")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // پاسخِ خطا (۴xx/۵xx) را کش نمی‌کنیم. نمونهٔ مهم: chunkِ hash‌دارِ
        // نسخهٔ قبلی که بعد از دیپلوی حذف شده و حالا 404 می‌دهد — نباید در
        // کش بنشیند و جای نسخهٔ سالمِ قبلی را بگیرد. در آن حالت اگر نسخه‌ای
        // در کش داریم همان را برمی‌گردانیم تا اپ نشکند؛ وگرنه خودِ پاسخ
        // برمی‌گردد تا لایهٔ بالاتر (main.jsx/ErrorBoundary) یک‌بار صفحه را
        // نو کند و index.html و chunkهای جدید بیایند.
        if (res && res.status >= 400) {
          return caches.match(event.request).then((cached) => cached || res);
        }
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
