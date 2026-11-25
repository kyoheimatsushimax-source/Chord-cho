/* コード帖 — Service Worker
   ★アプリを更新したら、必ず下の CACHE の数字を上げること（v1 → v2）。
     上げないと、古い画面がキャッシュから開き続けます。
   ※github.io は他の自作アプリと同じ場所なので、消すのは 'chordcho-' で始まる古いキャッシュだけ。 */
const CACHE = 'chordcho-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('chordcho-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  /* ページ本体はネットワーク優先（更新をすぐ反映）。4秒以内に返らなければキャッシュで開く */
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200) cache.put(e.request, res.clone());
        return res;
      });
      net.catch(() => {});
      const timeout = new Promise(r => setTimeout(() => r(null), 4000));
      try { const res = await Promise.race([net, timeout]); if (res) return res; } catch (_) {}
      const hit = (await cache.match(e.request, { ignoreSearch: true })) || (await cache.match('./index.html'));
      return hit || net;
    })());
    return;
  }
  /* それ以外はキャッシュ優先。裏で取り直して次回に反映 */
  e.respondWith(
    caches.open(CACHE).then(c => c.match(e.request)).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
