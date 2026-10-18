// Watchlog 서비스워커 - 오프라인에서도 앱이 열리도록 핵심 파일을 캐시
const CACHE_NAME = 'watchlog-cache-v4';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){ return cache.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (isHTML){
    // 페이지 본문은 항상 최신 버전을 먼저 시도 (HTTP 캐시까지 건너뛰고 서버에서 새로 받아옴).
    // 네트워크가 안 될 때만 저장해둔 캐시로 대체 (오프라인 대비)
    event.respondWith(
      fetch(req, { cache: 'no-store' }).then(function(res){
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        return res;
      }).catch(function(){ return caches.match(req).then(function(c){ return c || caches.match('./index.html'); }); })
    );
    return;
  }

  // 아이콘/매니페스트 등은 캐시 우선 (자주 안 바뀌는 파일)
  event.respondWith(
    caches.match(req).then(function(cached){
      return cached || fetch(req).catch(function(){ return caches.match('./index.html'); });
    })
  );
});
