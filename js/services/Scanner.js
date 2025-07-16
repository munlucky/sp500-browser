/**
 * 메인 스캐너 서비스 (조정자 역할)
 * 기존 1,418줄에서 약 200줄로 축소된 버전
 * 데이터 수집, 분석, UI 렌더링을 조정하는 역할만 담당
 */
class Scanner {
    constructor(dataCollector, stockAnalyzer, uiRenderer, autoUpdater, eventBus, errorHandler) {
        this.dataCollector = dataCollector;
        this.stockAnalyzer = stockAnalyzer;
        this.uiRenderer = uiRenderer;
        this.autoUpdater = autoUpdater;
        this.eventBus = eventBus;
        this.errorHandler = errorHandler;
        
        this.isScanning = false;
        this.lastScanResults = null;
        this.scanStartTime = null;
        
        this.setupEventListeners();
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 스캔 완료 후 자동 업데이트 시작 여부 확인
        this.eventBus.on(Constants.EVENTS.SCAN_COMPLETED, (results) => {
            this.lastScanResults = results;
            
            // 설정에 따라 자동 업데이트 시작
            const settings = StorageManager.getSettings();
            if (settings.autoUpdateEnabled && !this.autoUpdater.isRunning) {
                setTimeout(() => {
                    this.autoUpdater.start();
                }, 2000); // 2초 후 시작
            }
        });
        
        // 오프라인 상태에서 스캔 중지
        this.eventBus.on(Constants.EVENTS.OFFLINE, () => {
            if (this.isScanning) {
                this.cancelScan();
            }
        });
    }
    
    /**
     * 메인 스캔 실행
     * @param {Object} options - 스캔 옵션
     * @returns {Promise<Object>} 스캔 결과
     */
    async scan(options = {}) {
        if (this.isScanning) {
            throw AppError.validationError('이미 스캔이 진행 중입니다.');
        }
        
        try {
            this.isScanning = true;
            this.scanStartTime = Date.now();
            
            console.log('🚀 스마트 스캔 시작...');
            
            this.eventBus.emit(Constants.EVENTS.SCAN_STARTED, {
                startTime: this.scanStartTime,
                options
            });
            
            // 1단계: 데이터 수집
            console.log('📊 1단계: S&P 500 데이터 수집');
            const stocksData = await this.dataCollector.collectStockData(
                options.tickers, 
                options.collectionOptions
            );
            
            if (stocksData.length === 0) {
                throw AppError.validationError('수집된 데이터가 없습니다.');
            }
            
            // 2단계: 주식 분석
            console.log('🔍 2단계: 래리 윌리엄스 변동성 돌파 분석');
            const analysisResults = await this.stockAnalyzer.analyzeStocks(
                stocksData, 
                options.analysisSettings
            );
            
            // 3단계: 결과 저장
            this.saveResults(analysisResults);
            
            const scanDuration = Date.now() - this.scanStartTime;
            
            console.log(`✅ 스캔 완료: 돌파 ${analysisResults.breakoutStocks.length}개, 대기 ${analysisResults.waitingStocks.length}개 (${(scanDuration / 1000).toFixed(1)}초)`);
            
            // 스캔 완료 이벤트 발생 (UI는 이벤트 리스너에서 처리)
            this.eventBus.emit(Constants.EVENTS.SCAN_COMPLETED, {
                ...analysisResults,
                duration: scanDuration,
                scanOptions: options
            });
            
            return analysisResults;
            
        } catch (error) {
            const scanDuration = this.scanStartTime ? Date.now() - this.scanStartTime : 0;
            
            const appError = error instanceof AppError ? error : 
                AppError.networkError('스캔 실행 실패', {
                    originalError: error.message,
                    duration: scanDuration
                });
            
            this.errorHandler?.handle(appError, { context: 'scanner:scan' });
            
            this.eventBus.emit(Constants.EVENTS.SCAN_ERROR, {
                error: appError.message,
                duration: scanDuration
            });
            
            throw appError;
            
        } finally {
            this.isScanning = false;
            this.scanStartTime = null;
        }
    }
    
    /**
     * 빠른 스캔 (현재 표시된 종목들만)
     * @returns {Promise<Object>} 스캔 결과
     */
    async quickScan() {
        const currentTickers = this.getCurrentDisplayedTickers();
        
        if (currentTickers.length === 0) {
            throw AppError.validationError('스캔할 종목이 없습니다. 먼저 전체 스캔을 실행해주세요.');
        }
        
        return this.scan({
            tickers: currentTickers,
            collectionOptions: { batchSize: 5 },
            analysisSettings: StorageManager.getSettings()
        });
    }
    
    /**
     * 데모 스캔 (테스트용 가짜 데이터)
     * @returns {Promise<Object>} 스캔 결과
     */
    async demoScan() {
        console.log('🎭 데모 스캔 시작...');
        
        this.eventBus.emit(Constants.EVENTS.SCAN_STARTED, {
            startTime: Date.now(),
            demoMode: true
        });
        
        // 가짜 데이터 생성
        const demoData = this.generateDemoData();
        
        // 실제 분석 수행 (가짜 데이터로)
        const analysisResults = await this.stockAnalyzer.analyzeStocks(demoData);
        
        // 결과 저장
        this.saveResults(analysisResults);
        
        this.eventBus.emit(Constants.EVENTS.SCAN_COMPLETED, {
            ...analysisResults,
            demoMode: true,
            duration: 2000
        });
        
        return analysisResults;
    }
    
    /**
     * 스캔 취소
     */
    cancelScan() {
        if (!this.isScanning) {
            return;
        }
        
        console.log('🛑 스캔 취소 요청됨');
        
        // 데이터 수집 취소
        this.dataCollector.cancelCollection();
        
        // 분석 취소
        this.stockAnalyzer.cancelAnalysis();
        
        this.isScanning = false;
        this.scanStartTime = null;
        
        this.eventBus.emit(Constants.EVENTS.SCAN_CANCELLED, {
            cancelTime: Date.now()
        });
    }
    
    /**
     * 스캔 결과 저장
     * @param {Object} results - 저장할 결과
     */
    saveResults(results) {
        try {
            // 캐시에 저장 (30분 TTL)
            StorageManager.saveResults(results);
            
            console.log('💾 스캔 결과 저장됨');
            
        } catch (error) {
            console.warn('⚠️ 결과 저장 실패:', error.message);
            // 저장 실패해도 스캔은 계속 진행
        }
    }
    
    /**
     * 캐시된 결과 로드
     * @returns {Object|null} 캐시된 결과
     */
    loadCachedResults() {
        try {
            const cachedResults = StorageManager.getResults();
            
            if (cachedResults && this.isValidResults(cachedResults)) {
                this.lastScanResults = cachedResults;
                
                // UI에 표시
                this.uiRenderer.renderResults(cachedResults);
                
                const cacheAge = Date.now() - new Date(cachedResults.timestamp).getTime();
                const minutesAgo = Math.floor(cacheAge / (1000 * 60));
                
                console.log(`📦 캐시된 결과 로드됨 (${minutesAgo}분 전)`);
                
                return cachedResults;
            }
            
        } catch (error) {
            console.warn('⚠️ 캐시된 결과 로드 실패:', error.message);
        }
        
        return null;
    }
    
    /**
     * 결과 유효성 검사
     * @param {Object} results - 검사할 결과
     * @returns {boolean}
     */
    isValidResults(results) {
        return results &&
               typeof results === 'object' &&
               Array.isArray(results.breakoutStocks) &&
               Array.isArray(results.waitingStocks) &&
               typeof results.totalScanned === 'number' &&
               results.timestamp;
    }
    
    /**
     * 현재 표시된 종목들 가져오기
     * @returns {string[]}
     */
    getCurrentDisplayedTickers() {
        const tickers = new Set();
        
        // DOM에서 현재 표시된 종목들 수집
        const stockCards = document.querySelectorAll('.stock-card .stock-ticker');
        stockCards.forEach(card => {
            if (card.textContent) {
                tickers.add(card.textContent.trim());
            }
        });
        
        return Array.from(tickers);
    }
    
    /**
     * 데모 데이터 생성
     * @returns {Object[]} 가짜 주식 데이터
     */
    generateDemoData() {
        const demoTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'CRM', 'ADBE'];
        
        return demoTickers.map(ticker => {
            const basePrice = 100 + Math.random() * 200;
            const volatility = 2 + Math.random() * 6;
            
            return {
                ticker,
                currentPrice: basePrice + (Math.random() - 0.5) * basePrice * 0.05,
                yesterdayClose: basePrice,
                yesterdayHigh: basePrice * (1 + volatility / 100),
                yesterdayLow: basePrice * (1 - volatility / 100),
                yesterdayVolume: 1000000 + Math.random() * 5000000,
                timestamp: new Date().toISOString(),
                source: 'demo'
            };
        });
    }
    
    /**
     * 스캐너 상태 조회
     * @returns {Object} 현재 상태
     */
    getStatus() {
        return {
            isScanning: this.isScanning,
            scanStartTime: this.scanStartTime,
            hasLastResults: !!this.lastScanResults,
            lastScanTime: this.lastScanResults?.timestamp || null,
            dataCollectorStatus: this.dataCollector.getCollectionStatus(),
            stockAnalyzerStatus: this.stockAnalyzer.getAnalysisStatus(),
            autoUpdaterStatus: this.autoUpdater.getStatus()
        };
    }
    
    /**
     * 마지막 스캔 결과 조회
     * @returns {Object|null}
     */
    getLastResults() {
        return this.lastScanResults;
    }
    
    /**
     * 설정 업데이트
     * @param {Object} newSettings - 새로운 설정
     */
    updateSettings(newSettings) {
        // 설정 저장
        const currentSettings = StorageManager.getSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        StorageManager.saveSettings(updatedSettings);
        
        // 설정 변경 이벤트 발생
        this.eventBus.emit('settings:changed', updatedSettings);
        
        console.log('⚙️ 스캐너 설정 업데이트됨:', newSettings);
    }
    
    /**
     * 스캔 통계 조회
     * @returns {Object|null}
     */
    getScanStatistics() {
        if (!this.lastScanResults) {
            return null;
        }
        
        return this.stockAnalyzer.getAnalysisStatistics(this.lastScanResults);
    }
    
    /**
     * 스캐너 리셋
     */
    reset() {
        // 실행 중인 작업들 중지
        this.cancelScan();
        this.autoUpdater.stop();
        
        // 상태 초기화
        this.lastScanResults = null;
        this.scanStartTime = null;
        
        // UI 초기화
        this.uiRenderer.reset();
        
        console.log('🔄 스캐너 리셋됨');
    }
}

// 전역으로 노출
window.Scanner = Scanner;