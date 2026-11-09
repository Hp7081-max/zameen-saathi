/* ऑफ़लाइन में भी ऐप खुले: पन्ना, JS/CSS, फ़ॉन्ट, आइकन और नमूना फ़ाइलें cache होती हैं।
   सुरक्षा: /api/* (OTP, फ़ोटो, जाँच के नतीजे) को यह कभी छूता नहीं, न cache में रखता है। */
const CACHE = "zs-shell-v1";

self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"]).catch(() => undefined))); });

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  // पहले नेटवर्क (नया संस्करण मिले), न चले तो cache। सफल जवाब cache में रखो।
  e.respondWith(
    fetch(e.request).then((r) => {
      if (r.ok && r.type === "basic") { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match(e.request).then((m) => m || (e.request.mode === "navigate" ? caches.match("/") : Response.error())))
  );
});
