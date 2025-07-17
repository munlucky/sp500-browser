class NotificationManager {
    static lastNotificationTime = 0;
    static notificationQueue = [];
    static maxNotificationsPerHour = 10;
    static notificationHistory = [];

    static async init() {
        try {
            console.log('🔔 알림 관리자 초기화 중...');
            
            // 알림 권한 확인
            if ('Notification' in window) {
                console.log('브라우저 알림 지원됨');
                
                if (Notification.permission === 'default') {
                    console.log('알림 권한이 설정되지 않음');
                } else {
                    console.log('현재 알림 권한:', Notification.permission);
                }
            } else {
                console.warn('브라우저가 알림을 지원하지 않습니다');
                return false;
            }
            
            // 알림 기록 정리 (1시간 이상 된 것 제거)
            this.cleanupNotificationHistory();
            
            // 주기적 정리 설정
            setInterval(() => {
                this.cleanupNotificationHistory();
            }, 60000); // 1분마다
            
            console.log('✅ 알림 관리자 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ 알림 관리자 초기화 실패:', error);
            return false;
        }
    }
    
    static async requestPermission() {
        try {
            if (!('Notification' in window)) {
                throw new Error('브라우저가 알림을 지원하지 않습니다');
            }
            
            if (Notification.permission === 'granted') {
                return true;
            }
            
            const permission = await Notification.requestPermission();
            console.log('알림 권한 요청 결과:', permission);
            
            if (permission === 'granted') {
                StorageManager.updateSettings({ notifications: true });
                
                // 테스트 알림 전송
                this.sendTestNotification();
                return true;
            } else {
                StorageManager.updateSettings({ notifications: false });
                return false;
            }
            
        } catch (error) {
            console.error('알림 권한 요청 실패:', error);
            return false;
        }
    }
    
    static async sendBreakoutAlert(breakoutStocks) {
        if (!this.isNotificationEnabled()) {
            console.log('알림이 비활성화되어 있어 돌파 알림을 보내지 않습니다');
            return false;
        }
        
        // 스팸 방지: 5분 이내 동일한 알림 방지
        const now = Date.now();
        if (now - this.lastNotificationTime < 5 * 60 * 1000) {
            console.log('최근에 알림을 보냈으므로 스킵합니다');
            return false;
        }
        
        // 시간당 알림 제한 확인
        if (this.notificationHistory.length >= this.maxNotificationsPerHour) {
            console.log('시간당 알림 제한에 도달했습니다');
            return false;
        }
        
        try {
            const count = breakoutStocks.length;
            if (count === 0) return false;
            
            const firstStock = breakoutStocks[0];
            
            const title = `🚀 돌파 알림! ${count}개 종목`;
            const body = count === 1 
                ? `${firstStock.ticker}: $${firstStock.currentPrice.toFixed(2)} (진입가: $${firstStock.entryPrice.toFixed(2)})`
                : `${firstStock.ticker} 외 ${count-1}개 종목이 돌파했습니다!`;
            
            const options = {
                body,
                icon: this.getIconDataUrl(),
                badge: this.getIconDataUrl(),
                tag: 'breakout-alert',
                requireInteraction: true,
                silent: false,
                // actions는 Service Worker 알림에서만 지원되므로 제거
                data: {
                    type: 'breakout',
                    stocks: breakoutStocks,
                    timestamp: now,
                    url: window.location.href
                }
            };
            
            // 브라우저 알림 생성
            const notification = new Notification(title, options);
            
            // 알림 이벤트 핸들러
            notification.onclick = () => {
                window.focus();
                notification.close();
                
                // 분석 데이터 전송 (선택사항)
                this.trackNotificationClick('breakout', count);
            };
            
            notification.onshow = () => {
                console.log('돌파 알림 표시됨:', count, '개 종목');
            };
            
            notification.onerror = (error) => {
                console.error('알림 표시 오류:', error);
            };
            
            // 자동 닫기 설정 (10초 후)
            setTimeout(() => {
                notification.close();
            }, 10000);
            
            // 사운드 재생
            this.playNotificationSound('breakout');
            
            // 알림 기록 저장
            this.recordNotification('breakout', { count, stocks: breakoutStocks });
            
            this.lastNotificationTime = now;
            
            console.log(`✅ 돌파 알림 전송 완료: ${count}개 종목`);
            return true;
            
        } catch (error) {
            console.error('❌ 돌파 알림 전송 실패:', error);
            return false;
        }
    }
    
    static sendDailyReport(results) {
        if (!this.isNotificationEnabled()) return false;
        
        try {
            const title = '📊 일일 스캔 리포트';
            const body = `돌파: ${results.breakoutStocks?.length || 0}개, 대기: ${results.waitingStocks?.length || 0}개`;
            
            const options = {
                body,
                icon: this.getIconDataUrl(),
                tag: 'daily-report',
                requireInteraction: false,
                data: {
                    type: 'report',
                    results,
                    timestamp: Date.now()
                }
            };
            
            const notification = new Notification(title, options);
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            // 5초 후 자동 닫기
            setTimeout(() => {
                notification.close();
            }, 5000);
            
            console.log('✅ 일일 리포트 알림 전송됨');
            return true;
            
        } catch (error) {
            console.error('❌ 일일 리포트 알림 실패:', error);
            return false;
        }
    }
    
    static sendPriceAlert(ticker, currentPrice, targetPrice, type) {
        if (!this.isNotificationEnabled()) return false;
        
        try {
            const title = `💰 가격 알림: ${ticker}`;
            const body = type === 'target'
                ? `목표가 도달! $${currentPrice.toFixed(2)} (목표: $${targetPrice.toFixed(2)})`
                : `손절가 근접! $${currentPrice.toFixed(2)} (손절: $${targetPrice.toFixed(2)})`;
            
            const options = {
                body,
                icon: this.getIconDataUrl(),
                tag: `price-alert-${ticker}`,
                requireInteraction: type === 'stop-loss',
                data: {
                    type: 'price-alert',
                    ticker,
                    currentPrice,
                    targetPrice,
                    alertType: type,
                    timestamp: Date.now()
                }
            };
            
            const notification = new Notification(title, options);
            
            // 손절 알림은 더 강한 사운드
            this.playNotificationSound(type === 'stop-loss' ? 'warning' : 'success');
            
            console.log(`✅ 가격 알림 전송됨: ${ticker} (${type})`);
            return true;
            
        } catch (error) {
            console.error('❌ 가격 알림 실패:', error);
            return false;
        }
    }
    
    static sendTestNotification() {
        if (!this.isNotificationEnabled()) return false;
        
        try {
            const notification = new Notification('✅ 알림 설정 완료!', {
                body: 'S&P 500 스캐너 알림이 활성화되었습니다.',
                icon: this.getIconDataUrl(),
                tag: 'test-notification',
                requireInteraction: false
            });
            
            setTimeout(() => {
                notification.close();
            }, 3000);
            
            this.playNotificationSound('success');
            
            console.log('✅ 테스트 알림 전송됨');
            return true;
            
        } catch (error) {
            console.error('❌ 테스트 알림 실패:', error);
            return false;
        }
    }
    
    static isNotificationEnabled() {
        if (!('Notification' in window)) return false;
        if (Notification.permission !== 'granted') return false;
        
        const settings = StorageManager.getSettings();
        return settings.notifications === true;
    }
    
    static playNotificationSound(type = 'default') {
        if (!this.isSoundEnabled()) return;
        
        try {
            // Web Audio API를 사용한 간단한 비프음
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            let frequency, duration, volume;
            
            switch (type) {
                case 'breakout':
                    frequency = 800;
                    duration = 0.6;
                    volume = 0.15;
                    break;
                case 'warning':
                    frequency = 400;
                    duration = 1.0;
                    volume = 0.2;
                    break;
                case 'success':
                    frequency = 600;
                    duration = 0.3;
                    volume = 0.1;
                    break;
                default:
                    frequency = 500;
                    duration = 0.2;
                    volume = 0.05;
            }
            
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
            
            // 돌파 알림의 경우 2번 울림
            if (type === 'breakout') {
                setTimeout(() => {
                    const oscillator2 = audioContext.createOscillator();
                    const gainNode2 = audioContext.createGain();
                    
                    oscillator2.connect(gainNode2);
                    gainNode2.connect(audioContext.destination);
                    
                    oscillator2.frequency.setValueAtTime(frequency * 1.2, audioContext.currentTime);
                    gainNode2.gain.setValueAtTime(volume * 0.8, audioContext.currentTime);
                    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration * 0.8);
                    
                    oscillator2.start(audioContext.currentTime);
                    oscillator2.stop(audioContext.currentTime + duration * 0.8);
                }, 100);
            }
            
        } catch (error) {
            console.error('❌ 사운드 재생 실패:', error);
            // 폴백: 콘솔에만 표시
            console.log(`♪ ${type} 사운드 재생됨`);
        }
    }
    
    static isSoundEnabled() {
        const settings = StorageManager.getSettings();
        return settings.sound !== false; // 기본값은 true
    }
    
    static getIconDataUrl() {
        // 간단한 SVG 아이콘을 데이터 URL로 변환 (Unicode 안전 인코딩)
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
                <rect width="192" height="192" fill="#2563eb" rx="20"/>
                <text x="96" y="120" font-family="Arial, sans-serif" font-size="80" text-anchor="middle" fill="white">↗</text>
            </svg>
        `;
        // Unicode 안전 base64 인코딩
        return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
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
            const results = StorageManager.getResults();
            if (results) {
                this.sendDailyReport(results);
            }
            
            // 24시간마다 반복
            setInterval(() => {
                const dailyResults = StorageManager.getResults();
                if (dailyResults) {
                    this.sendDailyReport(dailyResults);
                }
            }, 24 * 60 * 60 * 1000);
            
        }, timeUntilTarget);
        
        console.log(`⏰ 일일 리포트 예약됨: ${targetTime.toLocaleString('ko-KR')}`);
    }
    
    static recordNotification(type, data) {
        try {
            this.notificationHistory.push({
                type,
                data,
                timestamp: Date.now()
            });
            
            // 기록이 너무 많아지지 않도록 제한
            if (this.notificationHistory.length > 50) {
                this.notificationHistory = this.notificationHistory.slice(-30);
            }
            
        } catch (error) {
            console.error('알림 기록 저장 실패:', error);
        }
    }
    
    static cleanupNotificationHistory() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.notificationHistory = this.notificationHistory.filter(
            record => record.timestamp > oneHourAgo
        );
    }
    
    static trackNotificationClick(type, count = 1) {
        try {
            // 알림 클릭 통계 (향후 분석용)
            const clickData = {
                type,
                count,
                timestamp: Date.now(),
                userAgent: navigator.userAgent.substring(0, 100)
            };
            
            console.log('알림 클릭 추적:', clickData);
            
        } catch (error) {
            console.error('알림 클릭 추적 실패:', error);
        }
    }
    
    static getNotificationStats() {
        try {
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            const recentNotifications = this.notificationHistory.filter(
                record => record.timestamp > oneHourAgo
            );
            
            const stats = {
                totalSent: this.notificationHistory.length,
                lastHourSent: recentNotifications.length,
                canSendMore: recentNotifications.length < this.maxNotificationsPerHour,
                isEnabled: this.isNotificationEnabled(),
                permission: Notification.permission,
                lastNotificationTime: this.lastNotificationTime,
                timeSinceLastNotification: this.lastNotificationTime ? 
                    Date.now() - this.lastNotificationTime : null
            };
            
            return stats;
            
        } catch (error) {
            console.error('알림 통계 조회 실패:', error);
            return null;
        }
    }
    
    // 알림 설정 관리 메서드들
    static enableNotifications() {
        return this.requestPermission();
    }
    
    static disableNotifications() {
        StorageManager.updateSettings({ notifications: false });
        console.log('알림이 비활성화되었습니다');
        return true;
    }
    
    static toggleNotifications() {
        const settings = StorageManager.getSettings();
        if (settings.notifications) {
            return this.disableNotifications();
        } else {
            return this.enableNotifications();
        }
    }
    
    // 디버깅 및 테스트용 메서드들
    static sendDebugNotification(message = '테스트 알림') {
        if (!this.isNotificationEnabled()) {
            console.warn('알림이 비활성화되어 있습니다');
            return false;
        }
        
        try {
            const notification = new Notification('🐛 디버그 알림', {
                body: message,
                icon: this.getIconDataUrl(),
                tag: 'debug-notification'
            });
            
            setTimeout(() => {
                notification.close();
            }, 3000);
            
            console.log('디버그 알림 전송됨:', message);
            return true;
            
        } catch (error) {
            console.error('디버그 알림 실패:', error);
            return false;
        }
    }
    
    static clearNotificationHistory() {
        this.notificationHistory = [];
        this.lastNotificationTime = 0;
        console.log('알림 기록이 초기화되었습니다');
    }
}

// 페이지 로드 시 알림 초기화 및 이벤트 설정
document.addEventListener('DOMContentLoaded', () => {
    // 알림 버튼 이벤트
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', async () => {
            const success = await NotificationManager.requestPermission();
            if (success) {
                notificationBtn.textContent = '🔔 알림 ON';
                notificationBtn.style.background = 'linear-gradient(45deg, #16a34a, #22c55e)';
            } else {
                notificationBtn.textContent = '🔕 알림 OFF';
                notificationBtn.style.background = 'linear-gradient(45deg, #dc2626, #ef4444)';
            }
        });
        
        // 초기 상태 설정
        if (NotificationManager.isNotificationEnabled()) {
            notificationBtn.textContent = '🔔 알림 ON';
            notificationBtn.style.background = 'linear-gradient(45deg, #16a34a, #22c55e)';
        }
    }
    
    console.log('🔔 알림 관리자 이벤트 리스너 설정 완료');
});

// 전역 객체로 노출 (디버깅용)
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}