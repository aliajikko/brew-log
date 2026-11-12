const CACHE = "brewlog-v15";
const OCR = "brewlog-ocr-7.0.0"; // the label reader, kept across app updates
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
// cache: "reload" skips the browser's own 10 minute copy, so a new version never stores the old page
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" }))))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== OCR).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    if (e.request.mode === "navigate") {
      // Network first so updates arrive, cached copy when offline
      e.respondWith(fetch(new Request(e.request.url, { cache: "no-cache" })).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return r; })
        .catch(() => caches.match("./index.html")));
      return;
    }
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }
  if (url.hostname === "cdn.jsdelivr.net" && /^\/npm\/(tesseract\.js|tesseract\.js-core|@tesseract\.js-data|wasm-feature-detect)@/.test(url.pathname)) {
    e.respondWith(caches.open(OCR).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }))));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }))));
  }
});
