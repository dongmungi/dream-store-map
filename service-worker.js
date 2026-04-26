const CACHE_NAME = 'gwangju-dream-map-v1';
const urlsToCache = [
  './',
  './index.html',
  './stores.json',
  './manifest.json'
];

// 설치 이벤트
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache opened');
      return cache.addAll(urlsToCache).catch(err => {
        console.log('Cache addAll error:', err);
        // 일부 리소스가 없어도 계속 진행
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// 활성화 이벤트
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트 - 캐시 우선 전략
self.addEventListener('fetch', event => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') {
    return;
  }

  // chrome-extension 등 특수 스키마는 처리하지 않음
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // 캐시에 있으면 반환
      if (response) {
        return response;
      }

      // 캐시에 없으면 네트워크에서 요청
      return fetch(event.request).then(response => {
        // 유효한 응답이 아니면 그대로 반환
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // 응답을 캐시에 저장
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(err => {
        // 네트워크 요청 실패 시 오프라인 페이지 반환
        console.log('Fetch error:', err);
        // 캐시된 index.html이 있으면 반환
        return caches.match('./index.html');
      });
    })
  );
});
