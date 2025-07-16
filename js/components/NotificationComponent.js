/**
 * 알림 컴포넌트
 * 브라우저 알림과 인앱 알림을 통합 관리
 */
class NotificationComponent {
    constructor(eventBus, storageManager) {
        this.eventBus = eventBus;
        this.storageManager = storageManager;
        this.permission = null;
        this.isEnabled = true;
        this.queue = [];
        this.isProcessing = false;
        
        this.init();
        console.log('✅ NotificationComponent 초기화 완료');
    }
    
    /**
     * 컴포넌트 초기화
     */
    async init() {
        this.checkPermission();
        this.setupEventListeners();
        this.loadSettings();
        await this.requestPermissionIfNeeded();
    }
    
    /**
     * 알림 권한 확인
     */
    checkPermission() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
            console.log(`🔔 알림 권한 상태: ${this.permission}`);
        } else {
            console.warn('⚠️ 이 브라우저는 알림을 지원하지 않습니다');
        }
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        if (this.eventBus) {
            // 돌파 발생 알림
            this.eventBus.on(Constants.EVENTS.BREAKOUT_DETECTED, (data) => {
                this.showBreakoutNotification(data);
            });
            
            // 스캔 완료 알림
            this.eventBus.on(Constants.EVENTS.SCAN_COMPLETED, (results) => {
                this.showScanCompletedNotification(results);
            });
            
            // 오류 알림
            this.eventBus.on(Constants.EVENTS.APP_ERROR, (error) => {
                if (error.critical) {
                    this.showErrorNotification(error);
                }
            });
            
            // 설정 변경 알림
            this.eventBus.on('settings:notifications-changed', (data) => {
                this.isEnabled = data.enabled;
                this.saveSettings();
            });
        }
    }
    
    /**
     * 설정 로드
     */
    loadSettings() {
        try {
            const settings = this.storageManager?.getSettings?.() || {};
            this.isEnabled = settings.notificationEnabled !== false;
        } catch (error) {
            console.error('❌ 알림 설정 로드 실패:', error);
            this.isEnabled = true;
        }
    }
    
    /**
     * 설정 저장
     */
    saveSettings() {
        try {
            const currentSettings = this.storageManager?.getSettings?.() || {};
            currentSettings.notificationEnabled = this.isEnabled;
            this.storageManager?.saveSettings?.(currentSettings);
        } catch (error) {
            console.error('❌ 알림 설정 저장 실패:', error);
        }
    }
    
    /**
     * 알림 권한 요청
     */
    async requestPermissionIfNeeded() {
        if (!('Notification' in window)) return false;
        
        if (this.permission === 'default') {
            try {
                this.permission = await Notification.requestPermission();
                console.log(`🔔 알림 권한 요청 결과: ${this.permission}`);
                
                if (this.permission === 'granted') {
                    this.showWelcomeNotification();
                }
            } catch (error) {
                console.error('❌ 알림 권한 요청 실패:', error);
            }
        }
        
        return this.permission === 'granted';
    }
    
    /**
     * 환영 알림 표시
     */
    showWelcomeNotification() {
        this.showNotification({
            title: 'S&P 500 스캐너',
            body: '알림이 활성화되었습니다. 돌파 발생 시 알려드리겠습니다.',
            icon: 'icons/icon-192.png',
            tag: 'welcome',
            silent: true
        });
    }
    
    /**
     * 돌파 알림 표시
     * @param {Object} data - 돌파 데이터
     */
    showBreakoutNotification(data) {
        if (!this.isEnabled) return;
        
        const { stock, analysisResults } = data;
        const breakoutCount = analysisResults?.breakoutStocks?.length || 1;
        
        let title, body;
        
        if (breakoutCount === 1) {
            title = `🚀 돌파 발생: ${stock.ticker}`;
            body = `현재가: $${(stock.currentPrice || 0).toFixed(2)} (진입가: $${(stock.entryPrice || 0).toFixed(2)})`;
        } else {
            title = `🚀 ${breakoutCount}개 종목 돌파 발생!`;
            body = `${stock.ticker} 외 ${breakoutCount - 1}개 종목이 진입가를 돌파했습니다.`;
        }
        
        this.showNotification({
            title,
            body,
            icon: 'icons/icon-192.png',
            tag: 'breakout',
            requireInteraction: true,
            actions: [
                {
                    action: 'view',
                    title: '확인하기'
                },
                {
                    action: 'close',
                    title: '닫기'
                }
            ],
            data: {
                type: 'breakout',
                ticker: stock.ticker,
                currentPrice: stock.currentPrice,
                entryPrice: stock.entryPrice
            }
        });
        
        // 인앱 알림도 표시
        this.showInAppNotification({
            type: 'success',
            title: '돌파 발생!',
            message: `${stock.ticker}가 진입가 $${(stock.entryPrice || 0).toFixed(2)}를 돌파했습니다.`,
            duration: 5000
        });
    }
    
    /**
     * 스캔 완료 알림 표시
     * @param {Object} results - 스캔 결과
     */
    showScanCompletedNotification(results) {
        if (!this.isEnabled) return;
        
        const breakoutCount = results.breakoutStocks?.length || 0;
        const waitingCount = results.waitingStocks?.length || 0;
        
        if (breakoutCount > 0) {
            this.showNotification({
                title: '📊 스캔 완료',
                body: `돌파 ${breakoutCount}개, 대기 ${waitingCount}개 종목을 발견했습니다.`,
                icon: 'icons/icon-192.png',
                tag: 'scan-completed',
                silent: true,
                data: {
                    type: 'scan-completed',
                    breakoutCount,
                    waitingCount
                }
            });
        }
    }
    
    /**
     * 오류 알림 표시
     * @param {Object} error - 오류 정보
     */
    showErrorNotification(error) {
        if (!this.isEnabled) return;
        
        this.showNotification({
            title: '⚠️ 시스템 오류',
            body: error.message || '알 수 없는 오류가 발생했습니다.',
            icon: 'icons/icon-192.png',
            tag: 'error',
            requireInteraction: true,
            data: {
                type: 'error',
                code: error.code,
                message: error.message
            }
        });
        
        // 중요한 오류는 인앱 알림도 표시
        this.showInAppNotification({
            type: 'error',
            title: '시스템 오류',
            message: error.message,
            duration: 10000
        });
    }
    
    /**
     * 브라우저 알림 표시
     * @param {Object} options - 알림 옵션
     */
    async showNotification(options) {
        if (!this.isEnabled || this.permission !== 'granted') return;
        
        // 알림 큐에 추가
        this.queue.push(options);
        
        if (!this.isProcessing) {
            this.processNotificationQueue();
        }
    }
    
    /**
     * 알림 큐 처리
     */
    async processNotificationQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }
        
        this.isProcessing = true;
        
        while (this.queue.length > 0) {
            const options = this.queue.shift();
            
            try {
                const notification = new Notification(options.title, {
                    body: options.body,
                    icon: options.icon,
                    tag: options.tag,
                    silent: options.silent,
                    requireInteraction: options.requireInteraction,
                    data: options.data,
                    actions: options.actions
                });
                
                // 알림 클릭 이벤트 처리
                notification.onclick = (event) => {
                    this.handleNotificationClick(event);
                };
                
                // 알림 자동 닫기
                if (!options.requireInteraction) {
                    setTimeout(() => {
                        notification.close();
                    }, options.duration || 5000);
                }
                
                console.log(`🔔 알림 표시: ${options.title}`);
                
            } catch (error) {
                console.error('❌ 알림 표시 실패:', error);
            }
            
            // 알림 간 간격 (스팸 방지)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.isProcessing = false;
    }
    
    /**
     * 알림 클릭 이벤트 처리
     * @param {Event} event - 클릭 이벤트
     */
    handleNotificationClick(event) {
        const notification = event.target;
        const data = notification.data;
        
        // 창 포커스
        if (window.focus) {
            window.focus();
        }
        
        // 데이터 타입별 처리
        switch (data?.type) {
            case 'breakout':
                this.eventBus?.emit('notification:breakout-clicked', data);
                break;
            case 'scan-completed':
                this.eventBus?.emit('notification:scan-clicked', data);
                break;
            case 'error':
                this.eventBus?.emit('notification:error-clicked', data);
                break;
        }
        
        notification.close();
    }
    
    /**
     * 인앱 알림 표시
     * @param {Object} options - 알림 옵션
     */
    showInAppNotification(options) {
        const container = this.getInAppNotificationContainer();
        const notification = this.createInAppNotificationElement(options);
        
        container.appendChild(notification);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // 자동 제거
        setTimeout(() => {
            this.removeInAppNotification(notification);
        }, options.duration || 5000);
    }
    
    /**
     * 인앱 알림 컨테이너 가져오기/생성
     * @returns {HTMLElement} 컨테이너 요소
     */
    getInAppNotificationContainer() {
        let container = document.getElementById('in-app-notifications');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'in-app-notifications';
            container.className = 'in-app-notifications';
            document.body.appendChild(container);
        }
        
        return container;
    }
    
    /**
     * 인앱 알림 요소 생성
     * @param {Object} options - 알림 옵션
     * @returns {HTMLElement} 알림 요소
     */
    createInAppNotificationElement(options) {
        const notification = document.createElement('div');
        notification.className = `in-app-notification ${options.type || 'info'}`;
        
        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">${iconMap[options.type] || 'ℹ️'}</div>
            <div class="notification-content">
                <div class="notification-title">${options.title || ''}</div>
                <div class="notification-message">${options.message || ''}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        return notification;
    }
    
    /**
     * 인앱 알림 제거
     * @param {HTMLElement} notification - 제거할 알림 요소
     */
    removeInAppNotification(notification) {
        if (!notification || !notification.parentElement) return;
        
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }
    
    /**
     * 모든 알림 지우기
     */
    clearAll() {
        // 큐 비우기
        this.queue = [];
        
        // 인앱 알림 모두 제거
        const container = document.getElementById('in-app-notifications');
        if (container) {
            container.innerHTML = '';
        }
        
        console.log('🧹 모든 알림 제거됨');
    }
    
    /**
     * 알림 활성화/비활성화
     * @param {boolean} enabled - 활성화 여부
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        this.saveSettings();
        
        if (!enabled) {
            this.clearAll();
        }
        
        console.log(`🔔 알림 ${enabled ? '활성화' : '비활성화'}됨`);
    }
    
    /**
     * 알림 상태 가져오기
     * @returns {Object} 알림 상태
     */
    getStatus() {
        return {
            permission: this.permission,
            enabled: this.isEnabled,
            supported: 'Notification' in window,
            queueLength: this.queue.length
        };
    }
    
    /**
     * 컴포넌트 파괴
     */
    destroy() {
        // 이벤트 리스너 제거
        if (this.eventBus) {
            this.eventBus.off(Constants.EVENTS.BREAKOUT_DETECTED);
            this.eventBus.off(Constants.EVENTS.SCAN_COMPLETED);
            this.eventBus.off(Constants.EVENTS.APP_ERROR);
            this.eventBus.off('settings:notifications-changed');
        }
        
        // 큐 및 알림 정리
        this.clearAll();
        
        console.log('🗑️ NotificationComponent 파괴됨');
    }
}

// 전역으로 노출
window.NotificationComponent = NotificationComponent;