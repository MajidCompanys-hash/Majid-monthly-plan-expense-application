/* إدارة شؤوني - يحفظ ملفات التطبيق في الجهاز ليعمل بدون إنترنت. لا يرسل أي بيانات.
 * عند كل تحديث يتغيّر رقم CACHE، فيحمّل الجهاز الملفات الجديدة ويحذف القديمة. */
const CACHE = 'masareef-v2.1.0';
const FILES = [
  './', './index.html', './style.css', './app.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ملفات التطبيق من الذاكرة أولًا، وما ليس فيها من الإنترنت ثم يُحفظ.
// طلبات Google (المزامنة) لا تمر من هنا.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
