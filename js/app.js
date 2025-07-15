// 앱 메인 초기화 및 이벤트 관리
class App {
    constructor() {
        this.scanner = null;
        this.breakoutTracker = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🚀 앱 초기화 시작...');
            
            // 기본 상태 확인
            this.checkBrowserCompatibility();
            
            // 캐시 정리 (어제 날짜 데이터 삭제)
            StorageManager.initializeCacheCleanup();
            
            // 스캐너 초기화
            this.scanner = await initScanner();
            
            // 돌파 추적 시스템 초기화
            this.breakoutTracker = await initBreakoutTracker();
            
            // 알림 관리자 초기화
            await NotificationManager.init();
            
            // 캐시된 결과 로드
            this.loadCachedResults();
            
            // 설정 UI 초기화
            this.initializeSettings();
            
            // 추가 이벤트 리스너 설정
            this.setupAdditionalEvents();
            
            // 오프라인 상태 감지
            this.setupOfflineDetection();
            
            // 성능 모니터링 설정
            this.setupPerformanceMonitoring();
            
            this.isInitialized = true;
            console.log('✅ 앱 초기화 완료');
            
            // 초기화 완료 알림
            this.showStatus('앱이 준비되었습니다!', 'completed');
            
        } catch (error) {
            console.error('❌ 앱 초기화 실패:', error);
            this.showError('앱을 초기화하는 중 오류가 발생했습니다: ' + error.message);
            
            // 최소 기능이라도 동작하도록 폴백
            this.setupFallbackMode();
        }
    }

    checkBrowserCompatibility() {
        const requiredFeatures = {
            'localStorage': () => typeof Storage !== 'undefined',
            'fetch': () => typeof fetch !== 'undefined',
            'Promise': () => typeof Promise !== 'undefined',
            'JSON': () => typeof JSON !== 'undefined'
        };

        const missingFeatures = [];
        
        for (const [feature, check] of Object.entries(requiredFeatures)) {
            if (!check()) {
                missingFeatures.push(feature);
            }
        }

        if (missingFeatures.length > 0) {
            const message = `브라우저에서 다음 기능을 지원하지 않습니다: ${missingFeatures.join(', ')}`;
            console.warn('⚠️ ' + message);
            this.showError(message);
        } else {
            console.log('✅ 브라우저 호환성 확인 완료');
        }
    }

    loadCachedResults() {
        try {
            const cachedResults = StorageManager.getResults();
            if (cachedResults && this.scanner) {
                console.log('📦 캐시된 결과 로드 중...');
                
                // 캐시된 결과의 유효성 확인
                if (this.validateCachedResults(cachedResults)) {
                    this.scanner.displayResults(cachedResults);
                    
                    const timeDiff = Date.now() - new Date(cachedResults.timestamp).getTime();
                    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
                    
                    this.showStatus(`캐시된 결과 로드됨 (${minutesAgo}분 전)`, 'default');
                } else {
                    console.warn('⚠️ 캐시된 결과가 유효하지 않음');
                    StorageManager.clearCache();
                }
            }
        } catch (error) {
            console.error('❌ 캐시 로드 실패:', error);
            StorageManager.clearCache();
        }
    }

    validateCachedResults(results) {
        if (!results || typeof results !== 'object') return false;
        if (!Array.isArray(results.breakoutStocks) || !Array.isArray(results.waitingStocks)) return false;
        if (typeof results.totalScanned !== 'number') return false;
        if (!results.timestamp) return false;
        
        // 캐시가 24시간보다 오래되었는지 확인
        const timeDiff = Date.now() - new Date(results.timestamp).getTime();
        const hoursAgo = timeDiff / (1000 * 60 * 60);
        
        return hoursAgo < 24;
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
                
                // 실시간 슬라이더 업데이트
                volatilityRange.addEventListener('input', (e) => {
                    volatilityValue.textContent = `2-${e.target.value}%`;
                });
            }
            
            if (minVolumeSelect) {
                minVolumeSelect.value = settings.minVolume;
            }
            
            if (autoScanCheck) {
                autoScanCheck.checked = settings.autoScan;
                
                // 초기화 시 자동 스캔이 설정되어 있다면 시작
                if (settings.autoScan && this.scanner) {
                    this.scanner.startAutoScan();
                }
            }
            
            console.log('✅ 설정 초기화 완료:', settings);
            
        } catch (error) {
            console.error('❌ 설정 초기화 실패:', error);
            
            // 기본 설정으로 초기화
            const defaultSettings = StorageManager.getDefaultSettings();
            StorageManager.saveSettings(defaultSettings);
        }
    }

    setupAdditionalEvents() {
        try {
            // 키보드 단축키
            document.addEventListener('keydown', (e) => {
                // Ctrl+Enter 또는 Cmd+Enter로 스캔 시작
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (this.scanner && !this.scanner.isScanning) {
                        this.scanner.scanStocks();
                    }
                }
                
                // ESC로 스캔 중지 (향후 구현)
                if (e.key === 'Escape' && this.scanner && this.scanner.isScanning) {
                    console.log('⏹️ 사용자가 스캔 중지 요청');
                    // 향후 스캔 중지 기능 구현
                }
            });

            // 페이지 가시성 변경 감지 (백그라운드/포그라운드)
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    console.log('📴 앱이 백그라운드로 이동');
                } else {
                    console.log('📱 앱이 포그라운드로 복귀');
                    
                    // 포그라운드 복귀 시 캐시된 결과 새로고침
                    const cachedResults = StorageManager.getResults();
                    if (cachedResults && this.scanner) {
                        this.scanner.displayResults(cachedResults);
                    }
                }
            });

            // 윈도우 크기 변경 감지 (반응형)
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    console.log('📐 윈도우 크기 변경됨:', window.innerWidth, 'x', window.innerHeight);
                    // 필요한 경우 레이아웃 재조정
                }, 250);
            });

            // 메모리 정리용 이벤트
            window.addEventListener('beforeunload', () => {
                if (this.scanner && this.scanner.autoScanInterval) {
                    this.scanner.stopAutoScan();
                }
                if (this.breakoutTracker && this.breakoutTracker.isTracking) {
                    this.breakoutTracker.stopRealTimeTracking();
                }
                console.log('🧹 앱 종료 전 정리 작업 완료');
            });

            console.log('✅ 추가 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ 이벤트 설정 실패:', error);
        }
    }

    setupOfflineDetection() {
        const offlineIndicator = document.getElementById('offlineIndicator');
        
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                offlineIndicator?.classList.add('hidden');
                console.log('🌐 온라인 상태');
            } else {
                offlineIndicator?.classList.remove('hidden');
                console.log('📡 오프라인 상태');
                
                // 오프라인 시 자동 스캔 중지
                if (this.scanner && this.scanner.autoScanInterval) {
                    this.scanner.stopAutoScan();
                    this.showStatus('오프라인 모드 - 자동 스캔 중지됨', 'error');
                }
                
                // 오프라인 시 돌파 추적 중지
                if (this.breakoutTracker && this.breakoutTracker.isTracking) {
                    this.breakoutTracker.stopRealTimeTracking();
                    this.showStatus('오프라인 모드 - 실시간 추적 중지됨', 'error');
                }
            }
        };

        window.addEventListener('online', () => {
            updateOnlineStatus();
            this.showStatus('온라인 연결됨', 'completed');
        });
        
        window.addEventListener('offline', () => {
            updateOnlineStatus();
            this.showStatus('오프라인 모드', 'error');
        });
        
        // 초기 상태 확인
        updateOnlineStatus();
    }

    setupPerformanceMonitoring() {
        try {
            // 메모리 사용량 모니터링 (Chrome만 지원)
            if ('memory' in performance) {
                setInterval(() => {
                    const memory = performance.memory;
                    const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                    const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
                    
                    // 메모리 사용량이 너무 높으면 경고
                    if (used > 100) {
                        console.warn(`⚠️ 높은 메모리 사용량: ${used}MB / ${total}MB`);
                    }
                }, 30000); // 30초마다 확인
            }

            // localStorage 사용량 모니터링
            const checkStorageUsage = () => {
                try {
                    const usage = StorageManager.getStorageUsage();
                    if (usage.usedMB > 3) { // 3MB 이상 사용 시 경고
                        console.warn(`⚠️ 높은 저장소 사용량: ${usage.usedMB}MB`);
                        
                        // 필요시 오래된 캐시 삭제
                        StorageManager.clearCache();
                    }
                } catch (error) {
                    console.error('저장소 사용량 확인 실패:', error);
                }
            };

            setInterval(checkStorageUsage, 60000); // 1분마다 확인
            
            console.log('✅ 성능 모니터링 설정 완료');
            
        } catch (error) {
            console.error('❌ 성능 모니터링 설정 실패:', error);
        }
    }

    setupFallbackMode() {
        console.log('🚨 폴백 모드 활성화');
        
        try {
            // 최소한의 UI 동작만 보장
            const scanBtn = document.getElementById('scanBtn');
            const generateBtn = document.getElementById('generateWatchListBtn');
            const trackingBtn = document.getElementById('trackingBtn');
            
            if (scanBtn) {
                scanBtn.addEventListener('click', () => {
                    this.showError('초기화 오류로 인해 스캔 기능을 사용할 수 없습니다.');
                });
            }
            
            if (generateBtn) {
                generateBtn.addEventListener('click', () => {
                    this.showError('초기화 오류로 인해 워치리스트 생성 기능을 사용할 수 없습니다.');
                });
            }
            
            if (trackingBtn) {
                trackingBtn.addEventListener('click', () => {
                    this.showError('초기화 오류로 인해 돌파 추적 기능을 사용할 수 없습니다.');
                });
            }
            
            // 에러 메시지 표시
            this.showError('일부 기능이 제한될 수 있습니다. 페이지를 새로고침해 주세요.');
            
        } catch (error) {
            console.error('❌ 폴백 모드 설정 실패:', error);
        }
    }

    showStatus(message, type = 'default') {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status status-${type}`;
            statusEl.style.display = 'block'; // 상태 메시지가 있을 때는 표시
            
            // 3초 후 기본 메시지로 돌아가기 (에러가 아닌 경우)
            if (type !== 'error' && type !== 'scanning') {
                setTimeout(() => {
                    if (statusEl.textContent === message) {
                        statusEl.textContent = '준비됨';
                        statusEl.className = 'status';
                        // "준비됨" 상태일 때도 계속 표시 (스캔 중일 수 있음)
                        statusEl.style.display = 'block';
                    }
                }, 3000);
            }
        }
        
        console.log(`📢 상태: ${message} (${type})`);
    }

    showError(message) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = 'status status-error';
        }
        
        console.error('❌ 오류:', message);
        
        // 선택적: 사용자에게 더 자세한 오류 정보 제공
        if (confirm('오류가 발생했습니다. 자세한 정보를 개발자 콘솔에서 확인하시겠습니까?')) {
            console.log('📋 개발자 도구를 열어 콘솔을 확인해 주세요.');
        }
    }

    // 공개 메서드들
    getScanner() {
        return this.scanner;
    }
    
    getBreakoutTracker() {
        return this.breakoutTracker;
    }

    isReady() {
        return this.isInitialized && this.scanner !== null;
    }

    restart() {
        console.log('🔄 앱 재시작 중...');
        
        // 기존 리소스 정리
        if (this.scanner && this.scanner.autoScanInterval) {
            this.scanner.stopAutoScan();
        }
        
        if (this.breakoutTracker && this.breakoutTracker.isTracking) {
            this.breakoutTracker.stopRealTimeTracking();
        }
        
        // 재초기화
        this.isInitialized = false;
        this.scanner = null;
        this.breakoutTracker = null;
        
        // 3초 후 재시작
        setTimeout(() => {
            this.init();
        }, 3000);
    }
}

// 앱 인스턴스
let app;

// DOM 로드 완료 시 앱 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('📱 DOM 로드 완료, 앱 초기화 시작...');
        
        app = new App();
        await app.init();
        
        // 전역 객체로 노출 (디버깅용)
        window.sp500App = app;
        window.stockScanner = app.getScanner();
        window.breakoutTracker = app.getBreakoutTracker();
        
        console.log('🎉 모든 초기화 완료!');
        
    } catch (error) {
        console.error('💥 치명적 초기화 오류:', error);
        
        // 최후의 수단: 기본 에러 메시지 표시
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = '초기화 실패 - 페이지를 새로고침해 주세요';
            statusEl.className = 'status status-error';
        }
    }
});

// 전역 에러 핸들러
window.addEventListener('error', (event) => {
    console.error('💥 전역 오류:', event.error);
    
    if (app && app.isReady()) {
        app.showError('예상치 못한 오류가 발생했습니다.');
    }
});

// Promise rejection 핸들러
window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 처리되지 않은 Promise 거부:', event.reason);
    
    if (app && app.isReady()) {
        app.showError('비동기 작업 중 오류가 발생했습니다.');
    }
    
    event.preventDefault();
});