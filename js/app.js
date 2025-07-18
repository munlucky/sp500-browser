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
            
            // 필수 클래스들이 로드되었는지 확인
            this.checkRequiredClasses();
            
            // 캐시된 결과 먼저 로드 (스캐너 초기화 전에)
            this.loadCachedResults();
            
            // 캐시 정리 (어제 날짜 데이터 삭제)
            StorageManager.initializeCacheCleanup();
            
            // 구 형식 캐시 키 정리
            if (typeof APIManager !== 'undefined' && APIManager.cleanupOldCacheKeys) {
                const cleanedKeys = APIManager.cleanupOldCacheKeys();
                if (cleanedKeys > 0) {
                    console.log(`🧹 구 형식 캐시 키 ${cleanedKeys}개 정리됨`);
                }
            }
            
            // 스캐너 초기화
            try {
                console.log('📡 스캐너 초기화 시작...');
                
                // initScanner 함수 존재 확인
                if (typeof window.initScanner !== 'function') {
                    throw new Error('initScanner 함수를 찾을 수 없습니다. 호환성 레이어가 로드되지 않았을 수 있습니다.');
                }
                
                console.log('🔧 initScanner 함수 호출...');
                this.scanner = await initScanner();
                console.log('✅ 스캐너 초기화 완료');
            } catch (scannerError) {
                console.error('❌ 스캐너 초기화 실패:', scannerError);
                console.error('❌ 스캐너 오류 스택:', scannerError.stack);
                throw new Error(`스캐너 초기화 실패: ${scannerError.message}`);
            }
            
            // 돌파 추적 시스템 초기화
            this.breakoutTracker = await initBreakoutTracker();
            
            // 알림 관리자 초기화
            await NotificationManager.init();
            
            // 스캐너 초기화 후 캐시된 결과 다시 로드 (스캐너 메서드 사용)
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
            console.error('❌ 상세 스택 트레이스:', error.stack);
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

    checkRequiredClasses() {
        const requiredClasses = {
            'Constants': () => typeof window.Constants !== 'undefined',
            'EventBus': () => typeof window.EventBus !== 'undefined',
            'DIContainer': () => typeof window.DIContainer !== 'undefined',
            'ErrorHandler': () => typeof window.ErrorHandler !== 'undefined',
            'StorageManager': () => typeof window.StorageManager !== 'undefined',
            'APIManager': () => typeof window.APIManager !== 'undefined',
            'DataCollector': () => typeof window.DataCollector !== 'undefined',
            'StockAnalyzer': () => typeof window.StockAnalyzer !== 'undefined',
            'UIRenderer': () => typeof window.UIRenderer !== 'undefined',
            'AutoUpdater': () => typeof window.AutoUpdater !== 'undefined',
            'Scanner': () => typeof window.Scanner !== 'undefined'
        };

        const missingClasses = [];
        
        for (const [className, check] of Object.entries(requiredClasses)) {
            if (!check()) {
                missingClasses.push(className);
            }
        }

        if (missingClasses.length > 0) {
            const message = `다음 필수 클래스들이 로드되지 않았습니다: ${missingClasses.join(', ')}`;
            console.error('❌ ' + message);
            throw new Error(message);
        } else {
            console.log('✅ 필수 클래스 로딩 확인 완료');
        }
    }

    loadCachedResults() {
        try {
            // 일반 스캔 결과 캐시 로드
            const cachedResults = StorageManager.getResults();
            if (cachedResults) {
                console.log('📦 캐시된 스캔 결과 로드 중...');
                
                // 캐시된 결과의 유효성 확인
                if (this.validateCachedResults(cachedResults)) {
                    // 스캐너가 아직 초기화되지 않은 경우, 직접 UI 렌더링
                    this.renderCachedResultsDirectly(cachedResults);
                    
                    const timeDiff = Date.now() - new Date(cachedResults.timestamp).getTime();
                    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
                    
                    this.showStatus(`캐시된 결과 로드됨 (${minutesAgo}분 전)`, 'default');
                } else {
                    console.warn('⚠️ 캐시된 결과가 유효하지 않음');
                    StorageManager.clearCache();
                }
            }
            
            // 돌파 결과 캐시 로드
            const cachedBreakoutResults = StorageManager.getBreakoutResults();
            if (cachedBreakoutResults) {
                console.log('📦 캐시된 돌파 결과 로드 중...');
                
                const timeDiff = Date.now() - new Date(cachedBreakoutResults.timestamp).getTime();
                const minutesAgo = Math.floor(timeDiff / (1000 * 60));
                
                // 캐시가 최신(1시간 이내)인 경우에만 표시
                if (timeDiff < 60 * 60 * 1000) { // 1시간
                    this.renderCachedBreakoutResults(cachedBreakoutResults);
                    console.log(`📦 돌파 결과 캐시 로드 완료: 돌파 ${cachedBreakoutResults.breakoutStocks?.length || 0}개, 대기 ${cachedBreakoutResults.waitingStocks?.length || 0}개 (${minutesAgo}분 전)`);
                } else {
                    console.log('⏰ 돌파 결과 캐시가 너무 오래됨 (1시간 초과)');
                }
            }
            
            if (!cachedResults && !cachedBreakoutResults) {
                console.log('📦 캐시된 결과 없음');
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

    renderCachedResultsDirectly(results) {
        try {
            console.log('🎨 직접 UI 렌더링 시작...');
            
            // 대시보드 카운터 업데이트
            const breakoutCountEl = document.getElementById('breakoutCount');
            const waitingCountEl = document.getElementById('waitingCount');
            const totalScannedEl = document.getElementById('totalScanned');
            
            if (breakoutCountEl) breakoutCountEl.textContent = results.breakoutStocks?.length || 0;
            if (waitingCountEl) waitingCountEl.textContent = results.waitingStocks?.length || 0;
            if (totalScannedEl) totalScannedEl.textContent = results.totalScanned || 0;
            
            // 돌파 종목 렌더링
            this.renderStockList('breakoutStocks', results.breakoutStocks || [], '🚀');
            
            // 대기 종목 렌더링
            this.renderStockList('waitingStocks', results.waitingStocks || [], '⏰');
            
            console.log('✅ 직접 UI 렌더링 완료');
            
        } catch (error) {
            console.error('❌ 직접 UI 렌더링 실패:', error);
        }
    }

    renderCachedBreakoutResults(cachedBreakoutResults) {
        try {
            console.log('🎨 캐시된 돌파 결과 렌더링 시작...');
            
            const { breakoutStocks = [], waitingStocks = [] } = cachedBreakoutResults;
            
            // 대시보드 카운터 업데이트 (기존 값과 병합)
            const breakoutCountEl = document.getElementById('breakoutCount');
            const waitingCountEl = document.getElementById('waitingCount');
            
            if (breakoutCountEl) {
                const currentCount = parseInt(breakoutCountEl.textContent) || 0;
                breakoutCountEl.textContent = Math.max(currentCount, breakoutStocks.length);
            }
            
            if (waitingCountEl) {
                const currentCount = parseInt(waitingCountEl.textContent) || 0;
                waitingCountEl.textContent = Math.max(currentCount, waitingStocks.length);
            }
            
            // 돌파 종목이 있으면 렌더링 (기존 데이터 덮어쓰지 않고 추가)
            if (breakoutStocks.length > 0) {
                this.renderStockListCached('breakoutStocks', breakoutStocks, '🚀', true);
            }
            
            // 대기 종목이 있으면 렌더링 (기존 데이터 덮어쓰지 않고 추가)
            if (waitingStocks.length > 0) {
                this.renderStockListCached('waitingStocks', waitingStocks, '⏰', false);
            }
            
            console.log('✅ 캐시된 돌파 결과 렌더링 완료');
            
        } catch (error) {
            console.error('❌ 캐시된 돌파 결과 렌더링 실패:', error);
        }
    }

    renderStockListCached(containerId, stocks, icon, isBreakout) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // 기존 컨텐츠가 있으면 유지하고 새 데이터 추가
        const existingCards = container.querySelectorAll('.stock-card');
        const existingTickers = Array.from(existingCards).map(card => {
            const tickerEl = card.querySelector('.stock-header h3');
            return tickerEl ? tickerEl.textContent : null;
        }).filter(Boolean);
        
        // 중복되지 않는 새 종목들만 필터링
        const newStocks = stocks.filter(stock => !existingTickers.includes(stock.ticker));
        
        if (newStocks.length === 0) {
            console.log(`📦 ${icon} ${containerId}: 새로운 캐시 종목 없음 (중복 제거됨)`);
            return;
        }
        
        // 새 종목 카드들 생성
        const newStockCards = newStocks.map(stock => 
            this.createStockCardCached(stock, icon, isBreakout)
        ).join('');
        
        // 기존 컨텐츠에 추가 (덮어쓰지 않음)
        if (existingCards.length === 0) {
            container.innerHTML = newStockCards;
        } else {
            container.innerHTML += newStockCards;
        }
        
        console.log(`📦 ${icon} ${containerId}: ${newStocks.length}개 캐시 종목 추가됨`);
    }

    createStockCardCached(stock, icon, isBreakout) {
        const price = stock.currentPrice || stock.price || 0;
        const entryPrice = stock.entryPrice || 0;
        const stopLoss = stock.stopLoss || 0;
        const target1 = stock.target1 || 0;
        const target2 = stock.target2 || 0;
        const volatility = stock.volatility || 0;
        const volume = stock.yesterdayVolume || stock.volume || 0;
        const score = stock.score || 0;
        
        // 캐시 표시 배지
        const cacheType = stock.cacheType || 'cached';
        const cacheIcon = cacheType === 'breakout' ? '🚀' : cacheType === 'waiting' ? '⏰' : '📦';
        
        let statusDisplay = '';
        if (isBreakout) {
            const gain = price > 0 && entryPrice > 0 ? ((price - entryPrice) / entryPrice * 100).toFixed(1) : '0.0';
            statusDisplay = `<div class="breakout-badge">돌파! +${gain}%</div>`;
        } else {
            const gap = entryPrice > price ? (entryPrice - price).toFixed(2) : '0.00';
            statusDisplay = `<div class="gap">돌파까지: $${gap}</div>`;
        }
        
        return `
            <div class="stock-card ${isBreakout ? 'breakout' : 'waiting'} cached-card" onclick="window.open('https://finance.yahoo.com/quote/${stock.ticker}', '_blank')" style="cursor: pointer;">
                <div class="stock-header">
                    <h3>${stock.ticker}</h3>
                    ${statusDisplay}
                    <div class="cache-badge" title="캐시된 데이터">${cacheIcon}</div>
                </div>
                <div class="price-info">
                    <div class="current-price">$${price.toFixed(2)}</div>
                    <div class="entry-price">진입: $${entryPrice.toFixed(2)}</div>
                </div>
                <div class="targets">
                    <div class="target stop-loss">손절: $${stopLoss.toFixed(2)}</div>
                    <div class="target profit">목표1: $${target1.toFixed(2)}</div>
                    <div class="target profit">목표2: $${target2.toFixed(2)}</div>
                </div>
                <div class="stats">
                    <span>변동률: ${volatility.toFixed(1)}%</span>
                    <span>거래량: ${this.formatNumber(volume)}</span>
                    <span>점수: ${score}/100</span>
                </div>
            </div>
        `;
    }

    formatNumber(num) {
        if (!num || isNaN(num)) {
            return '0';
        }
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    renderStockList(containerId, stocks, icon) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!stocks || stocks.length === 0) {
            container.innerHTML = `<div class="no-results">캐시된 ${icon} 종목이 없습니다.</div>`;
            return;
        }
        
        const stockCards = stocks.map(stock => this.createStockCard(stock, icon)).join('');
        container.innerHTML = stockCards;
    }

    createStockCard(stock, icon) {
        const price = stock.currentPrice || stock.price || 0;
        const entryPrice = stock.entryPrice || 0;
        const change = stock.change || 0;
        const changePercent = stock.changePercent || 0;
        
        const changeClass = change >= 0 ? 'positive' : 'negative';
        const changeSign = change >= 0 ? '+' : '';
        
        return `
            <div class="stock-card" data-ticker="${stock.ticker}" onclick="window.open('https://finance.yahoo.com/quote/${stock.ticker}', '_blank')" style="cursor: pointer;">
                <div class="stock-header">
                    <span class="stock-icon">${icon}</span>
                    <span class="stock-ticker">${stock.ticker}</span>
                    <span class="stock-name">${stock.name || ''}</span>
                </div>
                <div class="stock-price">
                    <span class="current-price">$${price.toFixed(2)}</span>
                    <span class="price-change ${changeClass}">
                        ${changeSign}${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)
                    </span>
                </div>
                <div class="stock-details">
                    <div class="detail-item">
                        <span class="detail-label">진입가:</span>
                        <span class="detail-value">$${entryPrice.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">변동성:</span>
                        <span class="detail-value">${(stock.volatility * 100).toFixed(1)}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">거래량:</span>
                        <span class="detail-value">${(stock.volume / 1000000).toFixed(1)}M</span>
                    </div>
                </div>
                <div class="stock-timestamp">
                    캐시됨: ${new Date(stock.timestamp || Date.now()).toLocaleTimeString()}
                </div>
            </div>
        `;
    }

    initializeSettings() {
        try {
            const settings = StorageManager.getSettings();
            
            // 스캔 필터 설정 UI 업데이트
            const volatilityRange = document.getElementById('volatilityRange');
            const volatilityValue = document.getElementById('volatilityValue');
            const minVolumeSelect = document.getElementById('minVolume');
            
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

            // 자동 업데이트 설정 UI 업데이트
            const autoUpdateEnabledCheck = document.getElementById('autoUpdateEnabled');
            const updateIntervalSelect = document.getElementById('updateInterval');

            if (autoUpdateEnabledCheck) {
                autoUpdateEnabledCheck.checked = settings.autoUpdateEnabled;
            }

            if (updateIntervalSelect) {
                updateIntervalSelect.value = settings.updateInterval;
            }

            // 시스템 설정 UI 업데이트
            const demoModeCheck = document.getElementById('demoMode');
            const notificationEnabledCheck = document.getElementById('notificationEnabled');

            if (demoModeCheck) {
                demoModeCheck.checked = settings.demoMode;
            }

            if (notificationEnabledCheck) {
                notificationEnabledCheck.checked = settings.notificationEnabled;
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
                    if (cachedResults) {
                        if (this.scanner) {
                            if (typeof this.scanner.displayResults === 'function') {
                                this.scanner.displayResults(cachedResults);
                            } else if (this.scanner.uiRenderer && typeof this.scanner.uiRenderer.renderResults === 'function') {
                                this.scanner.uiRenderer.renderResults(cachedResults);
                            }
                        } else {
                            this.renderCachedResultsDirectly(cachedResults);
                        }
                    }
                }
            });

            // 종목 카드 클릭 이벤트 (이벤트 위임)
            document.addEventListener('click', (event) => {
                const stockCard = event.target.closest('.stock-card');
                if (stockCard) {
                    // 이미 onclick이 설정된 카드는 건너뛰기
                    if (stockCard.onclick) return;
                    
                    const ticker = stockCard.dataset.ticker || 
                                  stockCard.querySelector('.stock-ticker')?.textContent ||
                                  stockCard.querySelector('.stock-header h3')?.textContent;
                    
                    if (ticker) {
                        console.log(`📈 ${ticker} 차트 열기`);
                        window.open(`https://finance.yahoo.com/quote/${ticker}`, '_blank');
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
                if (this.scanner) {
                    if (this.scanner.autoScanInterval) {
                        this.scanner.stopAutoScan();
                    }
                    if (this.scanner.autoUpdateEnabled) {
                        this.scanner.stopAutoUpdate();
                    }
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
                
                // 오프라인 시 자동 기능들 중지
                if (this.scanner) {
                    if (this.scanner.autoScanInterval) {
                        this.scanner.stopAutoScan();
                        this.showStatus('오프라인 모드 - 자동 스캔 중지됨', 'error');
                    }
                    if (this.scanner.autoUpdateEnabled) {
                        this.scanner.stopAutoUpdate();
                        this.showStatus('오프라인 모드 - 자동 업데이트 중지됨', 'error');
                    }
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
                    const usage = StorageManager.getStorageInfo ? 
                        StorageManager.getStorageInfo() : 
                        StorageManager.getStorageUsage();
                    
                    if (usage && usage.usedMB && usage.usedMB > 3) { // 3MB 이상 사용 시 경고
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