/**
 * 데이터 수집 서비스
 * S&P 500 종목 리스트와 개별 주식 데이터 수집을 담당
 */
class DataCollector {
    constructor(apiManager, storageManager, eventBus, errorHandler) {
        this.apiManager = apiManager;
        this.storageManager = storageManager;
        this.eventBus = eventBus;
        this.errorHandler = errorHandler;
        
        this.sp500Tickers = [];
        this.isCollecting = false;
        this.collectionStartTime = null;
    }
    
    /**
     * S&P 500 종목 리스트 로드
     * @returns {Promise<string[]>} 종목 리스트
     */
    async loadSP500Tickers() {
        try {
            console.log('📋 S&P 500 종목 리스트 로드 시작...');
            this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_STARTED, { type: 'sp500-tickers' });
            
            // 캐시된 리스트 먼저 확인
            const cachedTickers = this.storageManager.getCachedData(Constants.STORAGE_KEYS.TICKERS);
            if (cachedTickers && Array.isArray(cachedTickers) && cachedTickers.length > 400) {
                this.sp500Tickers = cachedTickers;
                console.log(`📦 캐시된 ${this.sp500Tickers.length}개 S&P 500 종목 로드됨`);
                this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_COMPLETED, { 
                    type: 'sp500-tickers',
                    count: this.sp500Tickers.length,
                    source: 'cache'
                });
                return this.sp500Tickers;
            }
            
            // 무료 데이터 소스들
            const dataSources = [
                {
                    name: 'Wikipedia JSON API',
                    url: Constants.API.CORS_PROXY + encodeURIComponent('https://en.wikipedia.org/api/rest_v1/page/mobile-sections/List_of_S%26P_500_companies'),
                    parser: this.parseWikipediaJSON.bind(this)
                },
                {
                    name: 'GitHub S&P 500 CSV',
                    url: 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv',
                    parser: this.parseCSV.bind(this)
                },
                {
                    name: 'Alternative GitHub CSV',
                    url: 'https://raw.githubusercontent.com/dxjoshi/sp500_stocks/main/sp500_stocks.csv',
                    parser: this.parseAlternativeCSV.bind(this)
                }
            ];
            
            for (const source of dataSources) {
                try {
                    console.log(`📡 ${source.name}에서 S&P 500 리스트 로드 시도...`);
                    
                    const response = await fetch(source.url);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.text();
                    const tickers = await source.parser(data);
                    
                    if (tickers && tickers.length > 400) {
                        this.sp500Tickers = tickers;
                        
                        // 캐시에 저장 (7일)
                        this.storageManager.cacheData(
                            Constants.STORAGE_KEYS.TICKERS, 
                            this.sp500Tickers, 
                            Constants.CACHE.SP500_TICKERS_TTL_HOURS * 60
                        );
                        
                        console.log(`📊 ${source.name}에서 ${this.sp500Tickers.length}개 S&P 500 종목 로드됨`);
                        
                        this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_COMPLETED, {
                            type: 'sp500-tickers',
                            count: this.sp500Tickers.length,
                            source: source.name
                        });
                        
                        return this.sp500Tickers;
                    }
                    
                } catch (error) {
                    console.warn(`❌ ${source.name} 로드 실패:`, error.message);
                    continue;
                }
            }
            
            // 모든 소스 실패 시 폴백 리스트 사용
            console.warn('⚠️ 모든 외부 소스 실패, 폴백 리스트 사용');
            this.sp500Tickers = this.getFallbackTickers();
            
            this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_COMPLETED, {
                type: 'sp500-tickers',
                count: this.sp500Tickers.length,
                source: 'fallback'
            });
            
            return this.sp500Tickers;
            
        } catch (error) {
            console.warn('❌ S&P 500 리스트 로드 중 오류 발생, 폴백 사용:', error.message);
            
            // 오류 발생 시에도 폴백 리스트 반환
            this.sp500Tickers = this.getFallbackTickers();
            
            this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_COMPLETED, {
                type: 'sp500-tickers',
                count: this.sp500Tickers.length,
                source: 'fallback-error'
            });
            
            console.log(`📦 폴백으로 ${this.sp500Tickers.length}개 S&P 500 종목 제공`);
            return this.sp500Tickers;
        }
    }
    
    /**
     * 여러 종목의 주식 데이터 수집
     * @param {string[]} tickers - 수집할 종목 리스트 (선택사항, 기본값: 전체 S&P 500)
     * @param {Object} options - 수집 옵션
     * @returns {Promise<Object[]>} 수집된 주식 데이터 배열
     */
    async collectStockData(tickers = null, options = {}) {
        if (this.isCollecting) {
            throw AppError.validationError('이미 데이터 수집이 진행 중입니다.');
        }
        
        try {
            this.isCollecting = true;
            this.collectionStartTime = Date.now();
            
            // 기본값: 전체 S&P 500 종목
            if (!tickers) {
                if (this.sp500Tickers.length === 0) {
                    await this.loadSP500Tickers();
                }
                tickers = this.sp500Tickers;
            }
            
            console.log(`📊 ${tickers.length}개 종목 데이터 수집 시작...`);
            
            this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_STARTED, {
                type: 'stock-data',
                total: tickers.length
            });
            
            // 배치 처리로 메모리 효율성 향상
            const batchSize = options.batchSize || Constants.SCAN.BATCH_SIZE;
            const batches = Utils.chunk(tickers, batchSize);
            const allResults = [];
            
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`📦 배치 ${i + 1}/${batches.length} 처리 중... (${batch.length}개 종목)`);
                
                const batchResults = await this.collectBatch(batch, {
                    batchIndex: i,
                    totalBatches: batches.length,
                    processedSoFar: allResults.length
                });
                
                allResults.push(...batchResults);
                
                // 배치 간 딜레이 (API 부하 분산)
                if (i < batches.length - 1) {
                    await Utils.delay(1000);
                }
            }
            
            const successfulResults = allResults.filter(r => r.success);
            const failedResults = allResults.filter(r => !r.success);
            
            const collectionTime = Date.now() - this.collectionStartTime;
            
            console.log(`✅ 데이터 수집 완료: 성공 ${successfulResults.length}개, 실패 ${failedResults.length}개 (${(collectionTime / 1000).toFixed(1)}초)`);
            
            this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_COMPLETED, {
                type: 'stock-data',
                total: tickers.length,
                successful: successfulResults.length,
                failed: failedResults.length,
                duration: collectionTime,
                data: successfulResults.map(r => r.data)
            });
            
            return successfulResults.map(r => r.data);
            
        } catch (error) {
            const appError = error instanceof AppError ? error : 
                AppError.networkError('주식 데이터 수집 실패', {
                    originalError: error.message,
                    tickerCount: tickers?.length || 0
                });
            
            this.errorHandler?.handle(appError, { context: 'collectStockData' });
            this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_ERROR, {
                type: 'stock-data',
                error: appError.message
            });
            
            throw appError;
            
        } finally {
            this.isCollecting = false;
            this.collectionStartTime = null;
        }
    }
    
    /**
     * 배치 단위로 주식 데이터 수집
     * @param {string[]} batch - 배치 내 종목들
     * @param {Object} batchInfo - 배치 정보
     * @returns {Promise<Object[]>} 배치 수집 결과
     */
    async collectBatch(batch, batchInfo) {
        const results = [];
        
        try {
            const batchResults = await this.apiManager.fetchMultipleStocks(batch, (progress) => {
                // 전체 진행률 계산
                const totalProcessed = batchInfo.processedSoFar + progress.processed;
                const totalCount = batchInfo.processedSoFar + batch.length;
                
                this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_PROGRESS, {
                    processed: totalProcessed,
                    total: totalCount,
                    ticker: progress.ticker,
                    batchIndex: batchInfo.batchIndex,
                    totalBatches: batchInfo.totalBatches
                });
            });
            
            return batchResults;
            
        } catch (error) {
            // 배치 실패 시에도 개별 종목별로 실패 정보 반환
            return batch.map(ticker => ({
                ticker,
                success: false,
                error: error.message,
                data: null
            }));
        }
    }
    
    /**
     * 수집 진행 상태 조회
     * @returns {Object|null} 현재 수집 상태
     */
    getCollectionStatus() {
        if (!this.isCollecting) {
            return null;
        }
        
        return {
            isCollecting: this.isCollecting,
            startTime: this.collectionStartTime,
            duration: Date.now() - this.collectionStartTime
        };
    }
    
    /**
     * 데이터 수집 취소
     */
    cancelCollection() {
        if (!this.isCollecting) {
            return;
        }
        
        console.log('🛑 데이터 수집 취소 요청됨');
        
        // API Manager의 모든 요청 취소
        this.apiManager.cancelAllRequests();
        
        this.isCollecting = false;
        this.collectionStartTime = null;
        
        this.eventBus?.emit(Constants.EVENTS.DATA_COLLECTION_ERROR, {
            type: 'stock-data',
            error: '사용자에 의해 취소됨'
        });
    }
    
    /**
     * Wikipedia JSON API 파서
     */
    parseWikipediaJSON(data) {
        try {
            const jsonData = JSON.parse(data);
            const sections = jsonData.sections || [];
            const tickers = [];
            
            for (const section of sections) {
                if (section.text) {
                    const tickerMatches = section.text.match(/\\b[A-Z]{1,5}\\b/g);
                    if (tickerMatches) {
                        tickers.push(...tickerMatches);
                    }
                }
            }
            
            return [...new Set(tickers)].filter(ticker => 
                ticker.length >= 1 && ticker.length <= 5
            ).slice(0, 500);
            
        } catch (error) {
            console.warn('Wikipedia JSON 파싱 실패:', error);
            return [];
        }
    }
    
    /**
     * CSV 파서 (GitHub 표준 형식)
     */
    parseCSV(csvData) {
        try {
            const lines = csvData.split('\\n');
            const tickers = [];
            
            for (let i = 1; i < lines.length; i++) { // 헤더 제외
                const line = lines[i].trim();
                if (line) {
                    const columns = line.split(',');
                    if (columns.length > 0) {
                        const ticker = columns[0].replace(/"/g, '').trim();
                        if (ticker && ticker.match(/^[A-Z]{1,5}$/)) {
                            tickers.push(ticker);
                        }
                    }
                }
            }
            
            return tickers;
            
        } catch (error) {
            console.warn('CSV 파싱 실패:', error);
            return [];
        }
    }
    
    /**
     * 대체 CSV 파서
     */
    parseAlternativeCSV(csvData) {
        try {
            const lines = csvData.split('\\n');
            const tickers = [];
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && trimmed.match(/^[A-Z]{1,5}$/)) {
                    tickers.push(trimmed);
                }
            }
            
            return tickers;
            
        } catch (error) {
            console.warn('대체 CSV 파싱 실패:', error);
            return [];
        }
    }
    
    /**
     * 폴백 종목 리스트 (주요 S&P 500 종목들)
     */
    getFallbackTickers() {
        return [
            'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'GOOG', 'TSLA', 'META', 'UNH', 'XOM',
            'JNJ', 'JPM', 'V', 'PG', 'MA', 'CVX', 'HD', 'PFE', 'ABBV', 'PEP',
            'KO', 'AVGO', 'COST', 'WMT', 'DIS', 'DHR', 'VZ', 'ADBE', 'NFLX', 'CRM',
            'ABT', 'BMY', 'LIN', 'NKE', 'TMO', 'ACN', 'WFC', 'NEE', 'ORCL', 'MCD',
            'TXN', 'QCOM', 'UPS', 'PM', 'RTX', 'HON', 'T', 'INTU', 'LOW', 'SPGI'
        ];
    }
}

// 전역으로 노출
window.DataCollector = DataCollector;