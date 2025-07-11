class NotificationManager {
    static async init() {
        // 알림 권한 요청
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log('알림 권한:', permission);
            }
        }
        
        // 브라우저 알림 지원 확인
        console.log('브라우저 알림 지원:', 'Notification' in window);
    }
    
    static async sendBreakoutAlert(breakoutStocks) {
        if (!this.isNotificationEnabled()) return;
        
        try {
            const count = breakoutStocks.length;
            const firstStock = breakoutStocks[0];
            
            const title = `🚀 돌파 알림! ${count}개 종목`;
            const body = count === 1 
                ? `${firstStock.ticker}: $${firstStock.currentPrice} (진입가: $${firstStock.entryPrice})`
                : `${firstStock.ticker} 외 ${count-1}개 종목이 돌파했습니다!`;
            
            const options = {
                body,
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: 'breakout-alert',
                requireInteraction: true,
                actions: [
                    {
                        action: 'view',
                        title: '확인하기'
                    },
                    {
                        action: 'dismiss',
                        title: '닫기'
                    }
                ],
                data: {
                    type: 'breakout',
                    stocks: breakoutStocks,
                    timestamp: Date.now()
                }
            };
            
            // 브라우저 알림
            new Notification(title, options);
            
            // 사운드 재생 (선택적)
            this.playNotificationSound();
            
        } catch (error) {
            console.error('알림 전송 실패:', error);
        }
    }
    
    static sendDailyReport(results) {
        if (!this.isNotificationEnabled()) return;
        
        const title = '📊 일일 스캔 리포트';
        const body = `돌파: ${results.breakoutStocks.length}개, 대기: ${results.waitingStocks.length}개`;
        
        const options = {
            body,
            icon: 'icons/icon-192.png',
            tag: 'daily-report',
            data: {
                type: 'report',
                results,
                timestamp: Date.now()
            }
        };
        
        new Notification(title, options);
    }
    
    static sendPriceAlert(ticker, currentPrice, targetPrice, type) {
        if (!this.isNotificationEnabled()) return;
        
        const title = `💰 가격 알림: ${ticker}`;
        const body = type === 'target'
            ? `목표가 도달! $${currentPrice} (목표: $${targetPrice})`
            : `손절가 근접! $${currentPrice} (손절: $${targetPrice})`;
        
        const options = {
            body,
            icon: 'icons/icon-192.png',
            tag: `price-alert-${ticker}`,
            requireInteraction: type === 'stop-loss',
            data: {
                type: 'price-alert',
                ticker,
                currentPrice,
                targetPrice,
                alertType: type
            }
        };
        
        new Notification(title, options);
    }
    
    static isNotificationEnabled() {
        return 'Notification' in window && 
               Notification.permission === 'granted' && 
               StorageManager.getSettings().notifications;
    }
    
    static playNotificationSound() {
        try {
            // Web Audio API를 사용한 간단한 비프음
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('사운드 재생 실패:', error);
        }
    }
    
    static setupPeriodicNotifications() {
        // 일일 리포트 스케줄링 (오전 9시)
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(9, 0, 0, 0);
        
        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }
        
        const timeUntilTarget = targetTime.getTime() - now.getTime();
        
        setTimeout(() => {
            this.sendDailyReport(StorageManager.getResults() || {});
            
            // 24시간마다 반복
            setInterval(() => {
                this.sendDailyReport(StorageManager.getResults() || {});
            }, 24 * 60 * 60 * 1000);
            
        }, timeUntilTarget);
    }
}

// 알림 클릭 이벤트 처리 (브라우저 알림)
document.addEventListener('DOMContentLoaded', () => {
    // 알림 클릭 시 페이지로 포커스
    if ('Notification' in window) {
        // 브라우저 알림은 클릭 시 자동으로 페이지로 포커스됨
        console.log('브라우저 알림 이벤트 리스너 설정됨');
    }
});

// 페이지 로드 시 알림 초기화
document.addEventListener('DOMContentLoaded', () => {
    NotificationManager.init();
    
    // 알림 버튼 이벤트
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', async () => {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                StorageManager.updateSettings({ notifications: true });
                notificationBtn.textContent = '🔔 알림 ON';
                NotificationManager.setupPeriodicNotifications();
            }
        });
    }
});