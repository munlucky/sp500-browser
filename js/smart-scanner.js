/**
 * 스마트 스캐너 - API 제한을 고려한 효율적인 스캔 전략
 */
class SmartScanner {
    constructor() {
        this.priorityTickers = this.getPriorityTickers();
        this.batchSizes = {
            demo: 50,
            free: 200,
            premium: 500
        };
        this.scanStrategies = {
            priority: 'high_priority_only',      // 우선순위 종목만
            batch: 'batch_scan',                 // 배치별 스캔
            hybrid: 'hybrid_approach',           // 혼합 접근법
            adaptive: 'adaptive_scan'            // 적응형 스캔
        };
        this.currentStrategy = 'adaptive';
    }

    /**
     * 우선순위 종목 리스트 (시가총액 상위 및 인기 종목)
     */
    getPriorityTickers() {
        return [
            // 시가총액 Top 50 (높은 변동성 + 높은 거래량)
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BERKB', 'UNH', 'JNJ',
            'XOM', 'JPM', 'V', 'PG', 'HD', 'CVX', 'MA', 'ABBV', 'PFE', 'AVGO',
            'KO', 'COST', 'NFLX', 'DIS', 'PEP', 'TMO', 'MRK', 'ADBE', 'WMT', 'BAC',
            'CRM', 'ORCL', 'AMD', 'INTC', 'QCOM', 'TXN', 'IBM', 'CMCSA', 'VZ', 'T',
            'CSCO', 'PYPL', 'UBER', 'NOW', 'COP', 'NKE', 'BMY', 'UPS', 'RTX', 'LOW',
            
            // 고변동성 기술주
            'ROKU', 'ZOOM', 'DOCU', 'PTON', 'SNOW', 'PLTR', 'COIN', 'RBLX', 'RIVN', 'LCID',
            
            // 금융주 (변동성 높음)
            'GS', 'MS', 'C', 'WFC', 'USB', 'PNC', 'TFC', 'COF', 'AXP', 'BLK',
            
            // 에너지주 (고변동성)
            'SLB', 'HAL', 'BKR', 'OXY', 'DVN', 'FANG', 'EOG', 'PXD', 'CQP', 'KMI',
            
            // 소매/소비재 (변동성 중간)
            'AMZN', 'HD', 'WMT', 'TGT', 'COST', 'LOW', 'TJX', 'SBUX', 'MCD', 'NKE',
            
            // 헬스케어 (안정성 + 성장성)
            'UNH', 'JNJ', 'PFE', 'ABBV', 'TMO', 'DHR', 'MDT', 'ABT', 'BMY', 'AMGN'
        ];
    }

    /**
     * 현재 API 상태에 따른 최적 스캔 전략 결정
     */
    async determineOptimalStrategy() {
        const apiStatus = window.apiManager?.getAPIStatus() || { availableKeys: 0 };
        const currentHour = new Date().getHours();
        const isMarketHours = currentHour >= 9 && currentHour < 16;
        
        // 장시간 여부에 따른 전략 조정
        // if (!isMarketHours) {
        //     return {
        //         strategy: 'priority',
        //         batchSize: this.batchSizes.demo,
        //         delayMs: 15000,
        //         description: '장외시간 - 우선순위 종목만 스캔'
        //     };
        // }
        
        // // API 키 가용성에 따른 전략
        // if (apiStatus.availableKeys === 0) {
        //     return {
        //         strategy: 'demo',
        //         batchSize: 0,
        //         delayMs: 0,
        //         description: 'API 제한 도달 - 데모 모드 권장'
        //     };
        // }
        
        // if (apiStatus.availableKeys === 1) {
        //     return {
        //         strategy: 'priority',
        //         batchSize: this.batchSizes.demo,
        //         delayMs: 12000,
        //         description: '제한적 API - 우선순위 종목 중심'
        //     };
        // }
        
        return {
            strategy: 'hybrid',
            batchSize: this.batchSizes.premium,
            delayMs: 5000,
            description: '충분한 API - 혼합 스캔 전략'
        };
    }

    /**
     * 우선순위 기반 종목 선별
     */
    async scanPriorityStocks() {
        console.log('🎯 우선순위 종목 스캔 시작...');
        
        const results = {
            breakoutStocks: [],
            waitingStocks: [],
            totalScanned: 0,
            errors: 0,
            strategy: 'priority'
        };
        
        const settings = StorageManager.getSettings();
        
        for (let i = 0; i < Math.min(this.priorityTickers.length, 100); i++) {
            const ticker = this.priorityTickers[i];
            
            try {
                // 데이터를 한 번만 가져와서 분석에 전달 (중복 호출 방지)
                const stockData = await window.stockScanner.fetchStockData(ticker);
                
                if (stockData) {
                    const analysis = await window.stockScanner.analyzeStock(ticker, settings, stockData);
                    
                    if (analysis) {
                        if (analysis.breakoutSignal === 'breakout') {
                            results.breakoutStocks.push(analysis);
                        } else if (analysis.breakoutSignal === 'waiting') {
                            results.waitingStocks.push(analysis);
                        }
                    }
                }
                
                results.totalScanned++;
                
                // 진행률 업데이트
                const totalItems = Math.min(this.priorityTickers.length, 100);
                const progress = Math.round(((i + 1) / totalItems) * 100);
                window.stockScanner.updateStatus(
                    `우선순위 스캔 중... ${ticker} (${i + 1}/${totalItems}) ${progress}%`, 
                    'scanning'
                );
                
                // Yahoo Finance는 빠르므로 딜레이 단축
                await this.delay(1000);
                
            } catch (error) {
                console.warn(`❌ ${ticker} 스캔 실패:`, error);
                results.errors++;
            }
        }
        
        return results;
    }

    /**
     * 배치 스캔 - 제한된 API로 효율적 스캔
     */
    async scanInBatches(tickers, batchSize = 50) {
        console.log(`📦 배치 스캔 시작 (배치 크기: ${batchSize})`);
        
        const results = {
            breakoutStocks: [],
            waitingStocks: [],
            totalScanned: 0,
            errors: 0,
            strategy: 'batch'
        };
        
        const settings = StorageManager.getSettings();
        const totalBatches = Math.ceil(tickers.length / batchSize);
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const batchStart = batchIndex * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, tickers.length);
            const batchTickers = tickers.slice(batchStart, batchEnd);
            
            console.log(`📦 배치 ${batchIndex + 1}/${totalBatches} 처리 중... (${batchTickers.length}개 종목)`);
            
            // 순차적 처리로 변경 (429 에러 방지)
            const batchResults = [];
            for (let i = 0; i < batchTickers.length; i++) {
                const ticker = batchTickers[i];
                try {
                    // 각 요청 간 1초 딜레이
                    if (i > 0) {
                        await this.delay(1000);
                    }
                    
                    const stockData = await window.stockScanner.fetchStockData(ticker);
                    
                    if (stockData) {
                        const result = await window.stockScanner.analyzeStock(ticker, settings, stockData);
                        batchResults.push({ status: 'fulfilled', value: result });
                    } else {
                        batchResults.push({ status: 'fulfilled', value: null });
                    }
                } catch (error) {
                    console.warn(`❌ ${ticker} 스캔 실패:`, error);
                    results.errors++;
                    batchResults.push({ status: 'rejected', reason: error });
                }
            }
            
            // 결과 처리
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled' && result.value) {
                    const analysis = result.value;
                    
                    if (analysis.breakoutSignal === 'breakout') {
                        results.breakoutStocks.push(analysis);
                    } else if (analysis.breakoutSignal === 'waiting') {
                        results.waitingStocks.push(analysis);
                    }
                }
                
                results.totalScanned++;
            });
            
            // 배치 간 대기 (Yahoo Finance는 제한이 적어 대기 시간 단축)
            if (batchIndex < totalBatches - 1) {
                console.log(`⏳ 다음 배치까지 5초 대기...`);
                await this.delay(5000);
            }
            
            // 진행률 업데이트
            const overallProgress = Math.round(((batchIndex + 1) / totalBatches) * 100);
            window.stockScanner.updateStatus(
                `배치 스캔 중... 배치 ${batchIndex + 1}/${totalBatches} (${overallProgress}%)`, 
                'scanning'
            );
        }
        
        return results;
    }

    /**
     * 혼합 접근법 - 우선순위 + 샘플링
     */
    async hybridScan(allTickers) {
        console.log('🔄 혼합 스캔 전략 시작...');
        
        // 1단계: 우선순위 종목 스캔
        const priorityResults = await this.scanPriorityStocks();
        
        // 2단계: 나머지 종목에서 랜덤 샘플링
        const remainingTickers = allTickers.filter(ticker => 
            !this.priorityTickers.includes(ticker)
        );
        
        const sampleSize = Math.min(150, remainingTickers.length);
        const sampledTickers = this.getRandomSample(remainingTickers, sampleSize);
        
        console.log(`🎲 랜덤 샘플링: ${sampleSize}개 종목 추가 스캔`);
        
        const sampleResults = await this.scanInBatches(sampledTickers, 50);
        
        // 결과 통합
        return {
            breakoutStocks: [...priorityResults.breakoutStocks, ...sampleResults.breakoutStocks],
            waitingStocks: [...priorityResults.waitingStocks, ...sampleResults.waitingStocks],
            totalScanned: priorityResults.totalScanned + sampleResults.totalScanned,
            errors: priorityResults.errors + sampleResults.errors,
            strategy: 'hybrid'
        };
    }

    /**
     * 적응형 스캔 - 실시간 상황에 따른 동적 조정
     */
    async adaptiveScan(allTickers) {
        const strategy = await this.determineOptimalStrategy();
        await this.scanInBatches(allTickers, strategy.batchSize);
        // console.log(`🧠 적응형 스캔: ${strategy.description}`);
        
        // switch (strategy.strategy) {
        //     case 'priority':
        //         return await this.scanPriorityStocks();
                
        //     case 'batch':
        //         return await this.scanInBatches(allTickers, strategy.batchSize);
                
        //     case 'hybrid':
        //         return await this.hybridScan(allTickers);
                
        //     case 'demo':
        //         console.log('🎭 데모 모드로 전환합니다.');
        //         window.stockScanner.demoMode = true;
        //         return await window.stockScanner.scanStocks();
                
        //     default:
        //         return await this.scanPriorityStocks();
        // }
    }

    /**
     * 헬퍼 메서드들
     */
    getRandomSample(array, size) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, size);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

// 전역 인스턴스
window.smartScanner = new SmartScanner();