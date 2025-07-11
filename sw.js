const CACHE_NAME = 'sp500-scanner-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/scanner.js',
    '/js/calculator.js',
    '/js/storage.js',
    '/js/notifications.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// 설치 이벤트
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('캐시 생성됨');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch 이벤트 (오프라인 지원)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // 캐시에서 찾으면 반환
                if (response) {
                    return response;
                }
                
                // 네트워크에서 가져오기
                return fetch(event.request).then((response) => {
                    // 유효한 응답인지 확인
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // 응답 복사본 생성
                    const responseToCache = response.clone();
                    
                    // 캐시에 저장
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
            .catch(() => {
                // 오프라인 시 기본 페이지 반환
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
    console.log('알림 클릭됨:', event.notification.data);
    
    event.notification.close();
    
    const data = event.notification.data;
    
    if (event.action === 'view' || !event.action) {
        // 앱 열기
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
        
        // 메인 창에 메시지 전송
        self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                client.postMessage({
                    type: 'notification-click',
                    notificationData: data
                });
            });
        });
    }
});

// 푸시 메시지 수신 (향후 확장용)
self.addEventListener('push', (event) => {
    console.log('푸시 메시지 수신됨');
    
    let data = {};
    if (event.data) {
        data = event.data.json();
    }
    
    const title = data.title || 'S&P 500 스캐너';
    const options = {
        body: data.body || '새로운 알림이 있습니다.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: data
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 백그라운드 동기화 (향후 확장용)
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-scan') {
        console.log('백그라운드 스캔 실행');
        event.waitUntil(doBackgroundScan());
    }
});

async function doBackgroundScan() {
    // 백그라운드에서 주식 스캔 실행
    try {
        // 간단한 스캔 로직
        console.log('백그라운드 스캔 완료');
    } catch (error) {
        console.error('백그라운드 스캔 실패:', error);
    }
}