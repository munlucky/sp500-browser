/**
 * API 관리자 - 여러 데이터 소스와 요청 제한 관리
 */
class APIManager {
    constructor() {
        // 여러 무료 API 키들 (로테이션 용)
        this.apiKeys = [
            'VVTMQ91XVOYZSYFR', // 기본 키
            'demo',              // 데모 키 (제한적)
            // 추가 키들을 여기에 등록 가능
        ];
        
        this.currentKeyIndex = 0;
        this.requestCounts = {}; // 각 키별 요청 횟수 추적
        this.dailyLimits = {}; // 각 키별 일일 제한
        
        // Yahoo Finance만 사용 (가장 안정적이고 무제한)
        this.dataSources = [
            {
                name: 'Yahoo Finance',
                baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart/',
                parser: this.parseYahooData.bind(this),
                rateLimit: 1000, // 1초당 1요청 (안정적)
                priority: 1 // 최우선
            }
        ];
        
        this.corsProxy = 'https://api.allorigins.win/raw?url=';
        this.lastRequestTimes = {};
        this.requestQueue = [];
        this.isProcessingQueue = false;
        
        // 실패한 항목들 관리
        this.failedTickers = new Set();
        this.retryQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2초 후 재시도
        
        // 중복 요청 방지
        this.pendingRequests = new Set(); // 현재 처리 중인 요청들
    }

    /**
     * 현재 사용 가능한 API 키 가져오기
     */
    getCurrentApiKey() {
        const today = new Date().toDateString();
        
        for (let i = 0; i < this.apiKeys.length; i++) {
            const key = this.apiKeys[i];
            const dailyCount = this.requestCounts[key]?.[today] || 0;
            const limit = key === 'demo' ? 25 : 500; // 데모 키는 25개, 일반 키는 500개
            
            if (dailyCount < limit) {
                this.currentKeyIndex = i;
                return key;
            }
        }
        
        return null; // 모든 키가 제한에 도달
    }

    /**
     * API 요청 기록
     */
    recordRequest(apiKey) {
        const today = new Date().toDateString();
        
        if (!this.requestCounts[apiKey]) {
            this.requestCounts[apiKey] = {};
        }
        
        this.requestCounts[apiKey][today] = (this.requestCounts[apiKey][today] || 0) + 1;
        
        // 로컬 스토리지에 저장
        localStorage.setItem('api_request_counts', JSON.stringify(this.requestCounts));
    }

    /**
     * 저장된 요청 기록 로드
     */
    loadRequestCounts() {
        try {
            const saved = localStorage.getItem('api_request_counts');
            if (saved) {
                this.requestCounts = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('요청 기록 로드 실패:', error);
            this.requestCounts = {};
        }
    }

    /**
     * Alpha Vantage API 호출
     */
    async fetchAlphaVantageData(ticker) {
        const apiKey = this.getCurrentApiKey();
        
        if (!apiKey) {
            throw new Error('모든 API 키가 일일 제한에 도달했습니다');
        }
        
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${apiKey}&outputsize=compact`;
        
        try {
            const response = await fetch(this.corsProxy + encodeURIComponent(url));
            const data = await response.json();
            
            // API 오류 체크
            if (data['Error Message']) {
                throw new Error(data['Error Message']);
            }
            
            if (data['Note']) {
                throw new Error('API 호출 빈도 제한에 도달');
            }
            
            this.recordRequest(apiKey);
            return this.parseAlphaVantageData(data);
            
        } catch (error) {
            console.warn(`Alpha Vantage 실패 (${ticker}):`, error.message);
            throw error;
        }
    }

    /**
     * Yahoo Finance에서 주식 데이터 가져오기
     */
    async fetchFromDataSources(ticker) {
        const source = this.dataSources[0]; // Yahoo Finance만 사용
        
        try {
            // API 상세 로그는 console.log만 사용 (로거에서 제외)
            if (window.originalConsole) {
                window.originalConsole.log(`🔄 ${source.name}에서 ${ticker} 데이터 시도...`);
            }
            
            // Rate limiting
            await this.respectRateLimit(source.name, source.rateLimit);
            
            const data = await this.callDataSourceAPI(this.dataSources[0], ticker);
            if (data) {
                // API 성공 로그는 console.log만 사용 (로거에서 제외)
                if (window.originalConsole) {
                    window.originalConsole.log(`✅ ${source.name}에서 ${ticker} 데이터 성공`);
                }
                return data;
            }
        } catch (error) {
            // API 오류는 console.log만 사용 (로거에서 제외)
            if (window.originalConsole) {
                window.originalConsole.warn(`⚠️ ${source.name} 실패 (${ticker}): ${error.message}`);
            }
            throw error;
        }
        
        throw new Error(`Yahoo Finance에서 ${ticker} 조회 실패`);
    }

    /**
     * Yahoo Finance API 호출
     */
    async callDataSourceAPI(source, ticker) {
        if (source.name !== 'Yahoo Finance') {
            throw new Error(`지원하지 않는 데이터 소스: ${source.name}`);
        }
        
        const url = `${source.baseUrl}${ticker}?interval=1d&range=5d`;
        
        try {
            const response = await fetch(this.corsProxy + encodeURIComponent(url));
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Yahoo Finance 오류 체크
            if (data.chart?.error) {
                throw new Error(`Yahoo Finance 오류: ${data.chart.error.description}`);
            }
            
            return source.parser(data, ticker);
            
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('네트워크 연결 오류');
            }
            throw error;
        }
    }

    /**
     * Rate limiting 적용
     */
    async respectRateLimit(sourceName, limitMs) {
        const lastTime = this.lastRequestTimes[sourceName] || 0;
        const timePassed = Date.now() - lastTime;
        
        if (timePassed < limitMs) {
            const waitTime = limitMs - timePassed;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTimes[sourceName] = Date.now();
    }

    /**
     * 큐 기반 요청 처리
     */
    async queueRequest(ticker) {
        // 중복 요청 감지
        if (this.pendingRequests.has(ticker)) {
            // 중복 요청 감지는 console.log만 사용 (로거에서 제외)
            if (window.originalConsole) {
                window.originalConsole.warn(`⚠️ ${ticker} 중복 요청 감지됨, 무시`);
            }
            throw new Error(`${ticker} 이미 처리 중인 요청입니다`);
        }
        
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ ticker, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const { ticker, resolve, reject, retryCount = 0 } = this.requestQueue.shift();
            
            // 중복 요청 방지를 위해 처리 중 목록에 추가
            this.pendingRequests.add(ticker);
            
            try {
                // Yahoo Finance에서 데이터 가져오기 시도 (console.log만 사용, 로거에서 제외)
                if (window.originalConsole) {
                    window.originalConsole.log(`📡 ${ticker} 데이터 요청 중... (시도 ${retryCount + 1}/${this.maxRetries + 1})`);
                }
                const data = await this.fetchFromDataSources(ticker);
                
                // 성공 시 실패 목록에서 제거 및 처리 중 목록에서도 제거
                this.failedTickers.delete(ticker);
                this.pendingRequests.delete(ticker);
                // 개별 성공 로그는 console.log만 사용 (로거에서 제외)
                if (window.originalConsole) {
                    window.originalConsole.log(`✅ ${ticker} 데이터 가져오기 성공`);
                }
                resolve(data);
                
                // 요청 간 딜레이 (Yahoo Finance는 안정적이므로 1초만 대기)
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                // API 상세 오류는 console.log만 사용 (로거에서 제외)
                if (window.originalConsole) {
                    window.originalConsole.warn(`❌ ${ticker} 데이터 가져오기 실패 (시도 ${retryCount + 1}): ${error.message}`);
                }
                
                // 재시도 로직
                if (retryCount < this.maxRetries) {
                    // 실패한 항목을 재시도 큐에 추가하고 현재 처리 중 목록에서 제거
                    this.pendingRequests.delete(ticker);
                    this.addToRetryQueue({ ticker, resolve, reject, retryCount: retryCount + 1 });
                    // 재시도 큐 추가는 console.log만 사용 (로거에서 제외)
                    if (window.originalConsole) {
                        window.originalConsole.log(`🔄 ${ticker} 재시도 큐에 추가됨 (${retryCount + 1}/${this.maxRetries})`);
                    }
                } else {
                    // 최대 재시도 횟수 초과 시 실패 목록에 추가 및 처리 중 목록에서 제거
                    this.failedTickers.add(ticker);
                    this.pendingRequests.delete(ticker);
                    // 최종 실패는 logger에 기록하지 않음 (중요한 결과가 아님)
                    reject(new Error(`${ticker}: ${error.message} (${this.maxRetries + 1}회 시도 후 실패)`));
                }
                
                // 실패 시에도 짧은 딜레이
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        this.isProcessingQueue = false;
        
        // 재시도 큐 처리
        this.processRetryQueue();
    }

    /**
     * 재시도 큐에 추가
     */
    addToRetryQueue(requestItem) {
        this.retryQueue.push(requestItem);
    }

    /**
     * 재시도 큐 처리 (딜레이 후 메인 큐에 추가)
     */
    async processRetryQueue() {
        if (this.retryQueue.length === 0) {
            return;
        }

        // 재시도 큐 처리는 console.log만 사용 (로거에서 제외)
        if (window.originalConsole) {
            window.originalConsole.log(`🔄 재시도 큐 처리 중... ${this.retryQueue.length}개 항목`);
        }

        // 재시도 딜레이 후 메인 큐에 추가
        setTimeout(() => {
            while (this.retryQueue.length > 0) {
                const retryItem = this.retryQueue.shift();
                this.requestQueue.push(retryItem);
                // 메인 큐 재추가는 console.log만 사용 (로거에서 제외)
                if (window.originalConsole) {
                    window.originalConsole.log(`↻ ${retryItem.ticker} 메인 큐에 재추가`);
                }
            }
            
            // 메인 큐 처리 재시작
            this.processQueue();
        }, this.retryDelay);
    }

    /**
     * 실패한 항목들 정보 가져오기
     */
    getFailedTickers() {
        return Array.from(this.failedTickers);
    }

    /**
     * 실패한 항목들 수동 재시도
     */
    async retryFailedTickers() {
        const failed = this.getFailedTickers();
        if (failed.length === 0) {
            // 수동 재시도 결과는 logger에 기록
            if (window.logger) {
                window.logger.info('재시도할 실패 항목이 없습니다');
            }
            return [];
        }

        // 수동 재시도 시작은 logger에 기록 (중요한 결과)
        if (window.logger) {
            window.logger.info(`실패한 ${failed.length}개 항목 수동 재시도 시작`);
        }
        
        // 실패 목록 초기화
        this.failedTickers.clear();
        
        // 재시도를 위해 큐에 추가
        const results = [];
        for (const ticker of failed) {
            try {
                const data = await this.queueRequest(ticker);
                results.push({ ticker, success: true, data });
            } catch (error) {
                results.push({ ticker, success: false, error: error.message });
            }
        }

        // 재시도 결과를 logger에 기록 (중요한 결과)
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        
        if (window.logger) {
            window.logger.info(`수동 재시도 완료: 성공 ${successCount}개, 실패 ${failedCount}개`);
            if (failedCount > 0) {
                const failedTickers = results.filter(r => !r.success).map(r => r.ticker);
                window.logger.warn(`재시도 실패 항목: ${failedTickers.join(', ')}`);
            }
        }

        return results;
    }

    /**
     * API 매니저 상태 리포트
     */
    getStatusReport() {
        const failedCount = this.failedTickers.size;
        const queueCount = this.requestQueue.length;
        const retryCount = this.retryQueue.length;
        const pendingCount = this.pendingRequests.size;
        
        return {
            failedTickers: Array.from(this.failedTickers),
            pendingTickers: Array.from(this.pendingRequests),
            failedCount,
            queueCount,
            retryCount,
            pendingCount,
            isProcessing: this.isProcessingQueue,
            summary: `처리중: ${pendingCount}개, 실패: ${failedCount}개, 대기: ${queueCount}개, 재시도: ${retryCount}개`
        };
    }

    /**
     * 실패 통계 로깅
     */
    logFailureStats() {
        const report = this.getStatusReport();
        
        // 상태 리포트는 logger에 기록 (중요한 결과)
        if (window.logger) {
            window.logger.info(`API 매니저 상태: ${report.summary}`);
            
            if (report.failedCount > 0) {
                window.logger.warn(`실패한 항목들: ${report.failedTickers.join(', ')}`);
            }
        }
        
        return report;
    }

    /**
     * Yahoo Finance 데이터 파싱 (개선된 버전)
     */
    parseYahooData(data, ticker) {
        // 파싱 상세 로그는 console.log만 사용 (로거에서 제외)
        if (window.originalConsole) {
            window.originalConsole.log(`📊 Yahoo Finance 데이터 파싱 시작: ${ticker}`);
        }
        
        if (!data.chart?.result?.[0]) {
            // 파싱 오류는 console.log만 사용 (로거에서 제외)
            if (window.originalConsole) {
                window.originalConsole.error('Yahoo Finance 응답 구조 오류:', data);
            }
            throw new Error('Yahoo Finance 데이터 형식 오류');
        }
        
        const result = data.chart.result[0];
        const quote = result.indicators?.quote?.[0];
        const timestamps = result.timestamp;
        
        if (!quote || !timestamps || timestamps.length === 0) {
            // 파싱 오류는 console.log만 사용 (로거에서 제외)
            if (window.originalConsole) {
                window.originalConsole.error('Yahoo Finance 필수 데이터 누락:', { quote: !!quote, timestamps: timestamps?.length });
            }
            throw new Error('Yahoo Finance 필수 데이터 없음');
        }
        
        // 가장 최근 유효한 데이터 찾기
        let latestIndex = timestamps.length - 1;
        while (latestIndex >= 0 && (!quote.close[latestIndex] || quote.close[latestIndex] === null)) {
            latestIndex--;
        }
        
        if (latestIndex < 0) {
            throw new Error('Yahoo Finance에서 유효한 가격 데이터 없음');
        }
        
        // 어제 데이터 (latestIndex - 1)
        const yesterdayIndex = Math.max(0, latestIndex - 1);
        
        const currentPrice = quote.close[latestIndex] || 0;
        const yesterdayClose = quote.close[yesterdayIndex] || currentPrice;
        const yesterdayHigh = quote.high[yesterdayIndex] || currentPrice;
        const yesterdayLow = quote.low[yesterdayIndex] || currentPrice;
        const yesterdayVolume = quote.volume[yesterdayIndex] || 0;
        
        // 파싱 완료 로그도 console.log만 사용 (로거에서 제외)
        if (window.originalConsole) {
            window.originalConsole.log(`✅ ${ticker} Yahoo Finance 파싱 완료: $${currentPrice.toFixed(2)}`);
        }
        
        return {
            currentPrice,
            yesterdayClose,
            yesterdayHigh,
            yesterdayLow,
            yesterdayVolume,
            timeSeries: this.convertToAlphaVantageFormat(timestamps, quote)
        };
    }


    /**
     * 포맷 변환 헬퍼 메서드들
     */
    convertToAlphaVantageFormat(timestamps, quote) {
        const converted = {};
        
        for (let i = 0; i < timestamps.length; i++) {
            try {
                const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
                
                // null 값 처리 및 기본값 설정
                const open = quote.open[i] || quote.close[i] || 0;
                const high = quote.high[i] || quote.close[i] || 0;
                const low = quote.low[i] || quote.close[i] || 0;
                const close = quote.close[i] || 0;
                const volume = quote.volume[i] || 0;
                
                // 유효한 데이터만 포함
                if (close > 0) {
                    converted[date] = {
                        '1. open': open.toString(),
                        '2. high': high.toString(),
                        '3. low': low.toString(),
                        '4. close': close.toString(),
                        '5. volume': volume.toString()
                    };
                }
            } catch (error) {
                // 변환 실패는 console.log만 사용 (로거에서 제외)
                if (window.originalConsole) {
                    window.originalConsole.warn(`타임스탬프 변환 실패 [${i}]:`, error);
                }
                continue;
            }
        }
        
        return converted;
    }


    /**
     * 현재 API 상태 정보 (Yahoo Finance용)
     */
    getAPIStatus() {
        const report = this.getStatusReport();
        
        return {
            source: 'Yahoo Finance',
            status: 'unlimited', // Yahoo Finance는 무제한
            failedCount: report.failedCount,
            queueCount: report.queueCount,
            retryCount: report.retryCount,
            isProcessing: report.isProcessing,
            summary: report.summary
        };
    }

    /**
     * 모든 대기 중인 요청을 취소
     */
    cancelAllRequests() {
        console.log('🛑 API Manager: 모든 대기 중인 요청 취소');
        
        // 대기 중인 요청들을 모두 거부로 해결
        while (this.requestQueue.length > 0) {
            const { ticker, reject } = this.requestQueue.shift();
            if (reject) {
                reject(new Error('Request cancelled by user'));
            }
        }
        
        // 재시도 큐도 비우기
        this.retryQueue = [];
        
        // 처리 중인 요청 목록 초기화
        this.pendingRequests.clear();
        
        // 처리 상태 리셋
        this.isProcessingQueue = false;
        
        console.log('✅ API Manager: 모든 요청이 취소되었습니다');
    }

    /**
     * 특정 ticker의 요청만 취소
     */
    cancelRequest(ticker) {
        // 큐에서 해당 ticker 제거
        const initialLength = this.requestQueue.length;
        this.requestQueue = this.requestQueue.filter(item => {
            if (item.ticker === ticker) {
                if (item.reject) {
                    item.reject(new Error(`Request for ${ticker} cancelled`));
                }
                return false;
            }
            return true;
        });
        
        // 처리 중인 요청에서도 제거
        this.pendingRequests.delete(ticker);
        
        const cancelledCount = initialLength - this.requestQueue.length;
        if (cancelledCount > 0) {
            console.log(`🛑 API Manager: ${ticker} 요청 ${cancelledCount}개 취소됨`);
        }
        
        return cancelledCount;
    }

    /**
     * API Manager 상태 확인
     */
    isActive() {
        return this.isProcessingQueue || this.requestQueue.length > 0 || this.pendingRequests.size > 0;
    }
}

// 전역 인스턴스
const apiManager = new APIManager();
apiManager.loadRequestCounts();

// 전역으로 노출
window.apiManager = apiManager;