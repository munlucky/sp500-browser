/**
 * 자동 업데이트 컴포넌트
 * 실시간 가격 자동 업데이트를 담당
 */
class AutoUpdater {
    constructor(dataCollector, stockAnalyzer, uiRenderer, eventBus, errorHandler) {
        this.dataCollector = dataCollector;
        this.stockAnalyzer = stockAnalyzer;
        this.uiRenderer = uiRenderer;
        this.eventBus = eventBus;
        this.errorHandler = errorHandler;
        
        this.isRunning = false;
        this.timeout = null;
        this.intervalMs = Constants.AUTO_UPDATE.DEFAULT_INTERVAL_MS;
        this.lastUpdateTime = null;
        this.progressInterval = null;
        this.currentUpdateData = null;
        
        this.setupEventListeners();
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 설정 변경 감지
        this.eventBus.on('settings:changed', (settings) => {
            if (settings.updateInterval) {
                this.intervalMs = settings.updateInterval * 1000;
            }
        });
        
        // 자동 업데이트 중지 요청
        this.eventBus.on('auto-update:stop-requested', () => {
            this.stop();
        });
        
        // 오프라인 상태에서 중지
        this.eventBus.on(Constants.EVENTS.OFFLINE, () => {
            if (this.isRunning) {
                this.stop();
                console.log('🔌 오프라인 상태로 인해 자동 업데이트 중지됨');
            }
        });
    }
    
    /**
     * 자동 업데이트 시작
     * @param {Object} options - 시작 옵션
     */
    start(options = {}) {
        if (this.isRunning) {
            console.warn('⚠️ 자동 업데이트가 이미 실행 중입니다');
            return;
        }
        
        try {
            this.isRunning = true;
            this.lastUpdateTime = Date.now();
            
            // 옵션 적용
            if (options.intervalMs) {
                this.intervalMs = Math.max(options.intervalMs, Constants.AUTO_UPDATE.MIN_INTERVAL_MS);
            }
            
            console.log(`🔄 자동 업데이트 시작 (${this.intervalMs / 1000}초 주기)`);
            
            this.eventBus.emit(Constants.EVENTS.AUTO_UPDATE_STARTED, {
                interval: this.intervalMs,
                startTime: this.lastUpdateTime
            });
            
            // 첫 번째 업데이트 스케줄링
            this.scheduleNextUpdate();
            
            // 진행률 표시 시작
            this.startProgressIndicator();
            
        } catch (error) {
            this.isRunning = false;
            const appError = AppError.validationError('자동 업데이트 시작 실패', {
                originalError: error.message,
                options
            });
            
            this.errorHandler?.handle(appError, { context: 'autoUpdate:start' });
            throw appError;
        }
    }
    
    /**
     * 자동 업데이트 중지
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        console.log('🛑 자동 업데이트 중지됨');
        
        this.isRunning = false;
        
        // 타이머 정리
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        
        // 진행률 표시 중지
        this.stopProgressIndicator();
        
        // API 매니저의 모든 요청 취소
        if (this.dataCollector.apiManager) {
            this.dataCollector.apiManager.cancelAllRequests();
        }
        
        this.eventBus.emit(Constants.EVENTS.AUTO_UPDATE_STOPPED, {
            lastUpdateTime: this.lastUpdateTime,
            totalRunTime: this.lastUpdateTime ? Date.now() - this.lastUpdateTime : 0
        });
        
        this.currentUpdateData = null;
    }
    
    /**
     * 다음 업데이트 스케줄링
     */
    scheduleNextUpdate() {
        if (!this.isRunning) return;
        
        this.timeout = setTimeout(async () => {
            if (!this.isRunning) return;
            
            try {
                await this.performUpdate();
            } catch (error) {
                this.handleUpdateError(error);
            } finally {
                // 다음 업데이트 스케줄링 (업데이트 완료 후)
                if (this.isRunning) {
                    this.scheduleNextUpdate();
                }
            }
        }, this.intervalMs);
    }
    
    /**
     * 실제 업데이트 수행
     */
    async performUpdate() {
        const updateStartTime = Date.now();
        
        try {
            console.log('🔄 자동 업데이트 실행 중...');
            
            // 현재 표시된 종목들 가져오기
            const currentTickers = this.getCurrentDisplayedTickers();
            
            if (currentTickers.length === 0) {
                console.log('📭 업데이트할 종목이 없습니다');
                return;
            }
            
            this.currentUpdateData = {
                tickers: currentTickers,
                startTime: updateStartTime,
                progress: 0
            };
            
            console.log(`📊 ${currentTickers.length}개 종목 자동 업데이트 시작 (캐시 무시)`);
            
            // 데이터 수집 (캐시 무시)
            const updatedStocks = await this.dataCollector.collectStockData(currentTickers, {
                batchSize: 5, // 자동 업데이트는 더 작은 배치
                isAutoUpdate: true
            });
            
            // 분석 수행
            const settings = this.getUpdateSettings();
            const analysisResults = await this.stockAnalyzer.analyzeStocks(updatedStocks, settings);
            
            // 돌파 상태 재평가 (기존 대기 종목이 돌파했는지 확인)
            this.checkBreakoutStatusChange(analysisResults);
            
            // 업데이트된 결과 가져오기
            const updatedResults = window.browserStockScanner && window.browserStockScanner.lastScanResults ? 
                window.browserStockScanner.lastScanResults : analysisResults;
            
            // 캐시 업데이트 (돌파 상태 변경 사항 반영)
            await this.saveUpdatedResults(updatedResults);
            
            // UI 업데이트 (캐시 저장 완료 후)
            this.uiRenderer.renderResults(updatedResults);
            
            this.lastUpdateTime = Date.now();
            const updateDuration = this.lastUpdateTime - updateStartTime;
            
            console.log(`✅ 자동 업데이트 완료 (${(updateDuration / 1000).toFixed(1)}초)`);
            
            this.eventBus.emit(Constants.EVENTS.AUTO_UPDATE_PROGRESS, {
                completed: true,
                duration: updateDuration,
                tickersUpdated: currentTickers.length,
                results: {
                    breakoutCount: updatedResults.breakoutStocks.length,
                    waitingCount: updatedResults.waitingStocks.length
                }
            });
            
        } catch (error) {
            const updateDuration = Date.now() - updateStartTime;
            
            const appError = error instanceof AppError ? error : 
                AppError.networkError('자동 업데이트 실행 실패', {
                    originalError: error.message,
                    duration: updateDuration
                });
            
            this.errorHandler?.handle(appError, { context: 'autoUpdate:perform' });
            
            this.eventBus.emit(Constants.EVENTS.AUTO_UPDATE_ERROR, {
                error: appError.message,
                duration: updateDuration
            });
            
        } finally {
            this.currentUpdateData = null;
        }
    }
    
    /**
     * 현재 표시된 종목들 가져오기
     * @returns {string[]} 티커 배열
     */
    getCurrentDisplayedTickers() {
        const tickers = new Set();
        
        // 돌파 종목에서 가져오기
        const breakoutCards = document.querySelectorAll('#breakoutStocks .stock-card .stock-ticker');
        breakoutCards.forEach(card => {
            if (card.textContent) {
                tickers.add(card.textContent.trim());
            }
        });
        
        // 대기 종목에서 가져오기
        const waitingCards = document.querySelectorAll('#waitingStocks .stock-card .stock-ticker');
        waitingCards.forEach(card => {
            if (card.textContent) {
                tickers.add(card.textContent.trim());
            }
        });
        
        return Array.from(tickers);
    }
    
    /**
     * 업데이트용 설정 가져오기
     * @returns {Object}
     */
    getUpdateSettings() {
        // StorageManager에서 현재 설정 가져오기
        const settings = StorageManager.getSettings();
        return {
            volatilityMin: settings.volatilityMin || Constants.SCAN.DEFAULT_VOLATILITY_MIN,
            volatilityMax: settings.volatilityMax || Constants.SCAN.DEFAULT_VOLATILITY_MAX,
            minVolume: settings.minVolume || Constants.SCAN.DEFAULT_MIN_VOLUME
        };
    }
    
    /**
     * 진행률 표시 시작
     */
    startProgressIndicator() {
        this.stopProgressIndicator(); // 기존 인터벌 정리
        
        this.progressInterval = setInterval(() => {
            if (!this.isRunning) {
                this.stopProgressIndicator();
                return;
            }
            
            const now = Date.now();
            const timeSinceLastUpdate = now - this.lastUpdateTime;
            const timeRemaining = Math.max(0, this.intervalMs - timeSinceLastUpdate);
            const percentage = Math.max(0, 100 - (timeRemaining / this.intervalMs * 100));
            
            this.eventBus.emit(Constants.EVENTS.AUTO_UPDATE_PROGRESS, {
                timeRemaining,
                percentage,
                isWaiting: !this.currentUpdateData,
                nextUpdateIn: Math.ceil(timeRemaining / 1000)
            });
            
        }, Constants.AUTO_UPDATE.PROGRESS_UPDATE_MS);
    }
    
    /**
     * 진행률 표시 중지
     */
    stopProgressIndicator() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        // 진행률 리셋
        this.eventBus.emit(Constants.EVENTS.AUTO_UPDATE_PROGRESS, {
            timeRemaining: 0,
            percentage: 0,
            isWaiting: false
        });
    }
    
    /**
     * 업데이트 에러 처리
     * @param {Error} error - 발생한 에러
     */
    handleUpdateError(error) {
        console.error('❌ 자동 업데이트 에러:', error.message);
        
        // API 제한 에러인 경우 자동 중지
        if (error.code === Constants.ERROR_CODES.API_LIMIT) {
            console.log('🚫 API 제한으로 인해 자동 업데이트 중지됨');
            this.stop();
            return;
        }
        
        // 연속 에러 발생 시 중지 (향후 구현)
        // this.errorCount++;
        // if (this.errorCount >= 3) {
        //     this.stop();
        // }
    }
    
    /**
     * 업데이트 간격 변경
     * @param {number} intervalMs - 새로운 간격 (밀리초)
     */
    setInterval(intervalMs) {
        const newInterval = Math.max(intervalMs, Constants.AUTO_UPDATE.MIN_INTERVAL_MS);
        
        if (newInterval !== this.intervalMs) {
            this.intervalMs = newInterval;
            console.log(`⏱️ 자동 업데이트 간격 변경: ${this.intervalMs / 1000}초`);
            
            // 실행 중이면 재시작
            if (this.isRunning) {
                this.stop();
                setTimeout(() => this.start(), 1000);
            }
        }
    }
    
    /**
     * 수동 업데이트 트리거
     */
    async triggerManualUpdate() {
        if (!this.isRunning) {
            throw AppError.validationError('자동 업데이트가 실행 중이 아닙니다');
        }
        
        console.log('🔄 수동 업데이트 트리거됨');
        
        // 기존 스케줄 취소
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        
        // 즉시 업데이트 실행
        try {
            await this.performUpdate();
        } catch (error) {
            this.handleUpdateError(error);
        } finally {
            // 다음 업데이트 스케줄링
            if (this.isRunning) {
                this.scheduleNextUpdate();
            }
        }
    }
    
    /**
     * 돌파 상태 변경 확인
     * @param {Object} analysisResults - 분석 결과
     */
    checkBreakoutStatusChange(analysisResults) {
        // 레거시 스캐너의 updateStockStatus 로직 호출
        if (window.browserStockScanner && typeof window.browserStockScanner.updateStockStatus === 'function') {
            // 최신 분석 결과로 lastScanResults 업데이트
            window.browserStockScanner.lastScanResults = analysisResults;
            window.browserStockScanner.updateStockStatus();
            console.log('🔄 돌파 상태 재평가 완료');
        }
    }

    /**
     * 자동 업데이터 상태 조회
     * @returns {Object} 현재 상태
     */
    getStatus() {
        const now = Date.now();
        const timeSinceLastUpdate = this.lastUpdateTime ? now - this.lastUpdateTime : 0;
        const timeToNextUpdate = this.isRunning ? 
            Math.max(0, this.intervalMs - timeSinceLastUpdate) : 0;
        
        return {
            isRunning: this.isRunning,
            intervalMs: this.intervalMs,
            lastUpdateTime: this.lastUpdateTime,
            timeSinceLastUpdate,
            timeToNextUpdate,
            isUpdating: !!this.currentUpdateData,
            currentUpdateData: this.currentUpdateData
        };
    }
    
    /**
     * 업데이트된 결과 캐시 저장
     * @param {Object} results - 저장할 결과
     */
    async saveUpdatedResults(results) {
        try {
            if (typeof StorageManager !== 'undefined' && typeof StorageManager.saveResults === 'function') {
                // 동기적으로 캐시 저장
                StorageManager.saveResults(results);
                console.log('💾 자동 업데이트 결과 캐시 저장 완료');
                
                // 저장 완료를 보장하기 위한 짧은 대기
                await new Promise(resolve => setTimeout(resolve, 10));
            } else {
                console.warn('⚠️ StorageManager를 사용할 수 없습니다');
            }
        } catch (error) {
            console.error('❌ 캐시 저장 실패:', error.message);
            throw error;
        }
    }

    /**
     * 토글 (시작/중지)
     * @param {Object} options - 시작 옵션 (시작할 때만 사용)
     */
    toggle(options = {}) {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start(options);
        }
    }
}

// 전역으로 노출
window.AutoUpdater = AutoUpdater;