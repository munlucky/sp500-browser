/**
 * 개선된 API 관리자
 * 기존 api-manager.js를 대체하는 향상된 버전
 */
class APIManager {
    constructor(eventBus, errorHandler) {
        this.eventBus = eventBus;
        this.errorHandler = errorHandler;
        
        // API 설정
        this.corsProxy = Constants.API.CORS_PROXY;
        this.rateLimit = Constants.API.RATE_LIMIT_MS;
        this.maxRetries = Constants.API.MAX_RETRIES;
        this.timeout = Constants.API.TIMEOUT_MS;
        
        // 요청 관리
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.pendingRequests = new Set();
        this.lastRequestTime = 0;
        
        // 실패 관리
        this.failedTickers = new Set();
        this.retryQueue = [];
        this.retryDelay = 2000;
        
        // API 키 관리 (기존 로직 유지)
        this.apiKeys = ['VVTMQ91XVOYZSYFR', 'demo'];
        this.currentKeyIndex = 0;
        this.requestCounts = {};
        
        this.loadRequestCounts();
    }
    
    /**
     * 주식 데이터 요청 (메인 인터페이스)
     * @param {string} ticker - 주식 티커
     * @param {Object} options - 요청 옵션
     * @param {boolean} options.isAutoUpdate - 자동 업데이트 여부 (캐시 무시)
     * @returns {Promise<Object>} 주식 데이터
     */
    async fetchStockData(ticker, options = {}) {
        if (this.pendingRequests.has(ticker)) {
            throw AppError.validationError(`${ticker} 요청이 이미 진행 중입니다.`);
        }
        
        return this.queueRequest(ticker, options);
    }
    
    /**
     * 여러 주식 데이터 배치 요청
     * @param {string[]} tickers - 주식 티커 배열
     * @param {Function} progressCallback - 진행률 콜백
     * @param {Object} options - 요청 옵션
     * @param {boolean} options.isAutoUpdate - 자동 업데이트 여부 (캐시 무시)
     * @returns {Promise<Object[]>} 주식 데이터 배열
     */
    async fetchMultipleStocks(tickers, progressCallback = null, options = {}) {
        const results = [];
        let processed = 0;
        
        for (const ticker of tickers) {
            try {
                const data = await this.fetchStockData(ticker, options);
                results.push({ ticker, data, success: true });
                
                if (progressCallback) {
                    progressCallback({
                        processed: ++processed,
                        total: tickers.length,
                        ticker,
                        success: true
                    });
                }
                
                // 이벤트 발생
                this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_PROGRESS, {
                    processed,
                    total: tickers.length,
                    ticker
                });
                
            } catch (error) {
                results.push({ ticker, error: error.message, success: false });
                
                if (progressCallback) {
                    progressCallback({
                        processed: ++processed,
                        total: tickers.length,
                        ticker,
                        success: false,
                        error: error.message
                    });
                }
                
                // 에러 이벤트 발생
                this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_ERROR, {
                    ticker,
                    error: error.message
                });
            }
            
            // Rate limiting
            await Utils.delay(this.rateLimit);
        }
        
        return results;
    }
    
    /**
     * 요청을 큐에 추가
     * @param {string} ticker - 주식 티커
     * @param {Object} options - 요청 옵션
     * @param {boolean} options.isAutoUpdate - 자동 업데이트 여부 (캐시 무시)
     * @returns {Promise<Object>}
     */
    async queueRequest(ticker, options = {}) {
        // 자동 업데이트가 아닌 경우에만 캐시 데이터 확인
        if (!options.isAutoUpdate) {
            const todayData = this.getTodaysCachedData(ticker);
            if (todayData) {
                console.log(`📦 ${ticker}: 오늘 날짜 캐시 데이터 사용`);
                return Promise.resolve(todayData);
            }
        } else {
            console.log(`🔄 ${ticker}: 자동 업데이트 - 캐시 무시하고 API 호출`);
        }
        
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ 
                ticker, 
                resolve, 
                reject, 
                timestamp: Date.now(),
                options 
            });
            this.processQueue();
        });
    }

    /**
     * 오늘 날짜로 캐시된 데이터 조회
     * @param {string} ticker - 주식 티커
     * @returns {Object|null} 캐시된 데이터 또는 null
     */
    getTodaysCachedData(ticker) {
        try {
            const today = new Date().toISOString().split('T')[0]; // "2025-07-17" 형식 (ISO 표준)
            const cacheKey = `stock_${ticker}_${today}`;
            
            const cachedData = StorageManager.getCachedData(cacheKey);
            
            if (cachedData) {
                console.log(`✅ ${ticker}: 오늘(${today}) 캐시 데이터 발견`);
                return cachedData;
            }
            
            return null;
            
        } catch (error) {
            console.warn(`⚠️ ${ticker}: 캐시 확인 실패:`, error.message);
            return null;
        }
    }

    /**
     * 오늘 날짜로 데이터를 캐시에 저장
     * @param {string} ticker - 주식 티커
     * @param {Object} data - 저장할 데이터
     */
    cacheTodaysData(ticker, data) {
        try {
            const today = new Date().toISOString().split('T')[0]; // "2025-07-17" 형식 (ISO 표준)
            const cacheKey = `stock_${ticker}_${today}`;
            
            // 24시간(1440분) 동안 캐시 유지 - 하루가 지나면 자동 삭제
            StorageManager.cacheData(cacheKey, data, 1440);
            
            console.log(`💾 ${ticker}: 오늘(${today}) 데이터 캐시에 저장`);
            
        } catch (error) {
            console.warn(`⚠️ ${ticker}: 캐시 저장 실패:`, error.message);
        }
    }
    
    /**
     * 기존 잘못된 형식의 캐시 키들을 정리
     * @returns {number} 정리된 캐시 수
     */
    static cleanupOldCacheKeys() {
        try {
            console.log('🧹 기존 캐시 키 형식 정리 시작...');
            
            let cleanedCount = 0;
            const keys = Object.keys(localStorage);
            
            // 잘못된 형식 패턴: "stock_TICKER_Wed Jul 17 2025" 같은 형식
            const oldFormatPattern = /^stock_[A-Z]+_[A-Za-z]{3}\s[A-Za-z]{3}\s\d{1,2}\s\d{4}$/;
            
            for (const key of keys) {
                if (oldFormatPattern.test(key)) {
                    console.log(`🗑️ 구 형식 캐시 키 삭제: ${key}`);
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            }
            
            console.log(`✅ ${cleanedCount}개의 구 형식 캐시 키 정리 완료`);
            return cleanedCount;
            
        } catch (error) {
            console.error('❌ 캐시 키 정리 실패:', error);
            return 0;
        }
    }
    
    /**
     * 큐 처리
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const { ticker, resolve, reject, retryCount = 0, options = {} } = this.requestQueue.shift();
            
            this.pendingRequests.add(ticker);
            
            try {
                // Rate limiting 적용
                await this.respectRateLimit();
                
                const data = await this.fetchFromYahooFinance(ticker);
                
                // 항상 캐시에 저장 (자동 업데이트 시에는 기존 캐시 갱신)
                this.cacheTodaysData(ticker, data);
                
                if (options.isAutoUpdate) {
                    console.log(`🔄 ${ticker}: 자동 업데이트 - 캐시 갱신 완료`);
                }
                
                // 성공 시 정리
                this.failedTickers.delete(ticker);
                this.pendingRequests.delete(ticker);
                resolve(data);
                
            } catch (error) {
                this.pendingRequests.delete(ticker);
                
                // 재시도 로직
                if (retryCount < this.maxRetries) {
                    this.addToRetryQueue({ ticker, resolve, reject, retryCount: retryCount + 1, options });
                } else {
                    this.failedTickers.add(ticker);
                    
                    // 에러 핸들러를 통한 처리
                    if (this.errorHandler) {
                        this.errorHandler.handle(error, { ticker, retryCount }, false);
                    }
                    
                    reject(error);
                }
            }
        }
        
        this.isProcessingQueue = false;
        
        // 재시도 큐 처리
        this.processRetryQueue();
    }
    
    /**
     * Yahoo Finance에서 데이터 가져오기
     * @param {string} ticker - 주식 티커
     * @returns {Promise<Object>}
     */
    async fetchFromYahooFinance(ticker) {
        const url = `${Constants.API.YAHOO_FINANCE_BASE}${ticker}?interval=1d&range=5d`;
        const fullUrl = this.corsProxy + encodeURIComponent(url);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(fullUrl, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; SP500Scanner/1.0)'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw AppError.networkError(`HTTP ${response.status}: ${response.statusText}`, {
                    ticker,
                    status: response.status,
                    statusText: response.statusText
                });
            }
            
            const data = await response.json();
            
            if (data.chart?.error) {
                throw AppError.networkError(`Yahoo Finance Error: ${data.chart.error.description}`, {
                    ticker,
                    yahooError: data.chart.error
                });
            }
            
            return this.parseYahooData(data, ticker);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw AppError.timeoutError(`${ticker} 요청 시간 초과`, { ticker });
            }
            
            if (error instanceof AppError) {
                throw error;
            }
            
            throw AppError.networkError(`${ticker} 데이터 요청 실패: ${error.message}`, {
                ticker,
                originalError: error.message
            });
        }
    }
    
    /**
     * Yahoo Finance 데이터 파싱
     * @param {Object} data - Yahoo Finance 응답 데이터
     * @param {string} ticker - 주식 티커
     * @returns {Object} 파싱된 주식 데이터
     */
    parseYahooData(data, ticker) {
        if (!data.chart?.result?.[0]) {
            throw AppError.validationError(`${ticker}: Yahoo Finance 데이터 형식 오류`, {
                ticker,
                receivedData: data
            });
        }
        
        const result = data.chart.result[0];
        const quote = result.indicators?.quote?.[0];
        const timestamps = result.timestamp;
        
        if (!quote || !timestamps || timestamps.length === 0) {
            throw AppError.validationError(`${ticker}: 필수 데이터 누락`, {
                ticker,
                hasQuote: !!quote,
                timestampCount: timestamps?.length || 0
            });
        }
        
        // 가장 최근 유효한 데이터 찾기
        let latestIndex = timestamps.length - 1;
        while (latestIndex >= 0 && (!quote.close[latestIndex] || quote.close[latestIndex] === null)) {
            latestIndex--;
        }
        
        if (latestIndex < 0) {
            throw AppError.validationError(`${ticker}: 유효한 가격 데이터 없음`, { ticker });
        }
        
        const yesterdayIndex = Math.max(0, latestIndex - 1);
        
        const stockData = {
            ticker,
            currentPrice: quote.close[latestIndex] || 0,
            yesterdayClose: quote.close[yesterdayIndex] || quote.close[latestIndex] || 0,
            yesterdayHigh: quote.high[yesterdayIndex] || quote.close[latestIndex] || 0,
            yesterdayLow: quote.low[yesterdayIndex] || quote.close[latestIndex] || 0,
            yesterdayVolume: quote.volume[yesterdayIndex] || 0,
            timestamp: new Date().toISOString(),
            source: 'yahoo'
        };
        
        // 데이터 유효성 검사
        if (!Utils.isValidStockData(stockData)) {
            throw AppError.validationError(`${ticker}: 파싱된 데이터가 유효하지 않음`, {
                ticker,
                stockData
            });
        }
        
        return stockData;
    }
    
    /**
     * Rate limiting 적용
     */
    async respectRateLimit() {
        const now = Date.now();
        const timePassed = now - this.lastRequestTime;
        
        if (timePassed < this.rateLimit) {
            const waitTime = this.rateLimit - timePassed;
            await Utils.delay(waitTime);
        }
        
        this.lastRequestTime = Date.now();
    }
    
    /**
     * 재시도 큐에 추가
     * @param {Object} requestItem - 재시도할 요청
     */
    addToRetryQueue(requestItem) {
        this.retryQueue.push(requestItem);
    }
    
    /**
     * 재시도 큐 처리
     */
    async processRetryQueue() {
        if (this.retryQueue.length === 0) return;
        
        setTimeout(() => {
            while (this.retryQueue.length > 0) {
                const retryItem = this.retryQueue.shift();
                this.requestQueue.push(retryItem);
            }
            this.processQueue();
        }, this.retryDelay);
    }
    
    /**
     * 모든 대기 중인 요청 취소
     */
    cancelAllRequests() {
        console.log('🛑 API Manager: 모든 대기 중인 요청 취소');
        
        // 대기 중인 요청들을 거부로 해결
        while (this.requestQueue.length > 0) {
            const { ticker, reject } = this.requestQueue.shift();
            if (reject) {
                reject(new AppError(`${ticker} 요청이 사용자에 의해 취소됨`, 'REQUEST_CANCELLED'));
            }
        }
        
        // 재시도 큐도 비우기
        this.retryQueue = [];
        this.pendingRequests.clear();
        this.isProcessingQueue = false;
        
        if (this.eventBus) {
            this.eventBus.emit('api:requests-cancelled');
        }
    }
    
    /**
     * 특정 티커의 요청 취소
     * @param {string} ticker - 취소할 티커
     * @returns {number} 취소된 요청 수
     */
    cancelRequest(ticker) {
        let cancelledCount = 0;
        
        // 메인 큐에서 제거
        this.requestQueue = this.requestQueue.filter(item => {
            if (item.ticker === ticker) {
                if (item.reject) {
                    item.reject(new AppError(`${ticker} 요청이 취소됨`, 'REQUEST_CANCELLED'));
                }
                cancelledCount++;
                return false;
            }
            return true;
        });
        
        // 재시도 큐에서도 제거
        this.retryQueue = this.retryQueue.filter(item => item.ticker !== ticker);
        
        // 처리 중인 요청에서 제거
        this.pendingRequests.delete(ticker);
        
        return cancelledCount;
    }
    
    /**
     * API 상태 정보 반환
     * @returns {Object} API 상태
     */
    getStatus() {
        const failedCount = this.failedTickers.size;
        const queueCount = this.requestQueue.length;
        const retryCount = this.retryQueue.length;
        const pendingCount = this.pendingRequests.size;
        
        return {
            isActive: this.isProcessingQueue || queueCount > 0 || pendingCount > 0,
            failedTickers: Array.from(this.failedTickers),
            pendingTickers: Array.from(this.pendingRequests),
            queueCount,
            retryCount,
            pendingCount,
            failedCount,
            summary: `처리중: ${pendingCount}개, 대기: ${queueCount}개, 재시도: ${retryCount}개, 실패: ${failedCount}개`
        };
    }
    
    /**
     * 실패한 티커들 수동 재시도
     * @returns {Promise<Array>} 재시도 결과
     */
    async retryFailedTickers() {
        const failed = Array.from(this.failedTickers);
        if (failed.length === 0) {
            return [];
        }
        
        console.log(`실패한 ${failed.length}개 티커 재시도 시작`);
        this.failedTickers.clear();
        
        const results = [];
        for (const ticker of failed) {
            try {
                const data = await this.fetchStockData(ticker);
                results.push({ ticker, success: true, data });
            } catch (error) {
                results.push({ ticker, success: false, error: error.message });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        console.log(`재시도 완료: 성공 ${successCount}개, 실패 ${results.length - successCount}개`);
        
        return results;
    }
    
    /**
     * API 요청 기록 로드 (기존 로직 유지)
     */
    loadRequestCounts() {
        try {
            const saved = localStorage.getItem('api_request_counts');
            if (saved) {
                this.requestCounts = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('API 요청 기록 로드 실패:', error);
            this.requestCounts = {};
        }
    }
    
    /**
     * API 요청 기록 저장 (기존 로직 유지)
     * @param {string} apiKey - API 키
     */
    recordRequest(apiKey) {
        const today = new Date().toDateString();
        
        if (!this.requestCounts[apiKey]) {
            this.requestCounts[apiKey] = {};
        }
        
        this.requestCounts[apiKey][today] = (this.requestCounts[apiKey][today] || 0) + 1;
        
        try {
            localStorage.setItem('api_request_counts', JSON.stringify(this.requestCounts));
        } catch (error) {
            console.warn('API 요청 기록 저장 실패:', error);
        }
    }
}

// 전역으로 노출
window.APIManager = APIManager;