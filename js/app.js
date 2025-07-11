// 앱 메인 초기화 및 이벤트 관리
class App {
    constructor() {
        this.scanner = null;
    }

    async init() {
        try {
            console.log('🚀 앱 초기화 시작...');
            
            // 스캐너 초기화
            this.scanner = new BrowserStockScanner();
            await this.scanner.init();
            
            // 알림 관리자 초기화 (static 메서드)
            await NotificationManager.init();
            
            // 캐시된 결과 로드
            this.loadCachedResults();
            
            // 설정 UI 초기화
            this.initializeSettings();
            
            // 오프라인 상태 감지
            this.setupOfflineDetection();
            
            console.log('✅ 앱 초기화 완료');
            
        } catch (error) {
            console.error('❌ 앱 초기화 실패:', error);
            this.showError('앱을 초기화하는 중 오류가 발생했습니다.');
        }
    }

    loadCachedResults() {
        try {
            const cachedResults = StorageManager.getResults();
            if (cachedResults && this.scanner) {
                console.log('📦 캐시된 결과 로드 중...');
                this.scanner.displayResults(cachedResults);
            }
        } catch (error) {
            console.error('❌ 캐시 로드 실패:', error);
        }
    }

    initializeSettings() {
        try {
            const settings = StorageManager.getSettings();
            
            // 설정 UI 업데이트
            const volatilityRange = document.getElementById('volatilityRange');
            const volatilityValue = document.getElementById('volatilityValue');
            const minVolumeSelect = document.getElementById('minVolume');
            const autoScanCheck = document.getElementById('autoScan');
            
            if (volatilityRange && volatilityValue) {
                volatilityRange.value = settings.volatilityMax * 100;
                volatilityValue.textContent = `2-${settings.volatilityMax * 100}%`;
            }
            
            if (minVolumeSelect) {
                minVolumeSelect.value = settings.minVolume;
            }
            
            if (autoScanCheck) {
                autoScanCheck.checked = settings.autoScan;
            }
            
        } catch (error) {
            console.error('❌ 설정 초기화 실패:', error);
        }
    }

    setupOfflineDetection() {
        const offlineIndicator = document.getElementById('offlineIndicator');
        
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                offlineIndicator.classList.add('hidden');
            } else {
                offlineIndicator.classList.remove('hidden');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // 초기 상태 확인
        updateOnlineStatus();
    }

    showError(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'status status-error';
        }
    }
}

// 앱 인스턴스
let app;

// DOM 로드 완료 시 앱 초기화
document.addEventListener('DOMContentLoaded', async () => {
    app = new App();
    await app.init();
});