// 주령구 PWA 서비스 워커
const CACHE = 'jurenggu-v5';

// 앱 실행에 필요한 로컬 자산 (오프라인 대비 미리 저장)
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './vendor/three/three.module.js',
  './vendor/three/addons/controls/OrbitControls.js',
  './vendor/three/addons/geometries/ConvexGeometry.js',
  './vendor/three/addons/math/ConvexHull.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
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

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // HTML: 네트워크 우선 → 항상 최신 화면, 오프라인이면 캐시로 폴백
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(h => h || caches.match('./index.html')))
    );
    return;
  }

  // 그 외 자산: stale-while-revalidate (캐시 즉시 반환 + 백그라운드 갱신)
  e.respondWith(
    caches.match(req).then(hit => {
      const fetchPromise = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || fetchPromise;
    })
  );
});
