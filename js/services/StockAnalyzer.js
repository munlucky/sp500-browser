/**
 * 주식 분석 서비스
 * 래리 윌리엄스 변동성 돌파 전략 분석을 담당
 */
class StockAnalyzer {
    constructor(calculator, eventBus, errorHandler) {
        this.calculator = calculator;
        this.eventBus = eventBus;
        this.errorHandler = errorHandler;
        
        this.isAnalyzing = false;
        this.analysisStartTime = null;
        this.defaultSettings = {
            volatilityMin: Constants.SCAN.DEFAULT_VOLATILITY_MIN,
            volatilityMax: Constants.SCAN.DEFAULT_VOLATILITY_MAX,
            minVolume: Constants.SCAN.DEFAULT_MIN_VOLUME
        };
    }
    
    /**
     * 주식 데이터 배열 분석
     * @param {Object[]} stocksData - 분석할 주식 데이터 배열
     * @param {Object} settings - 분석 설정
     * @returns {Promise<Object>} 분석 결과
     */
    async analyzeStocks(stocksData, settings = {}) {
        if (this.isAnalyzing) {
            throw AppError.validationError('이미 분석이 진행 중입니다.');
        }
        
        try {
            this.isAnalyzing = true;
            this.analysisStartTime = Date.now();
            
            const analysisSettings = { ...this.defaultSettings, ...settings };
            
            console.log(`🔍 ${stocksData.length}개 종목 분석 시작...`);
            
            this.eventBus?.emit(Constants.EVENTS.ANALYSIS_STARTED, {
                total: stocksData.length,
                settings: analysisSettings
            });
            
            // 분석 결과 저장소
            const results = {
                breakoutStocks: [],
                waitingStocks: [],
                totalScanned: stocksData.length,
                validCount: 0,
                invalidCount: 0,
                errorCount: 0,
                settings: analysisSettings,
                timestamp: new Date().toISOString()
            };
            
            // 배치 단위로 분석 (메모리 효율성)
            const batchSize = 50; // 분석은 빠르므로 더 큰 배치
            const batches = Utils.chunk(stocksData, batchSize);
            
            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                const batchResults = await this.analyzeBatch(batch, analysisSettings, {
                    batchIndex,
                    totalBatches: batches.length,
                    processedSoFar: batchIndex * batchSize
                });
                
                // 배치 결과 병합
                results.breakoutStocks.push(...batchResults.breakoutStocks);
                results.waitingStocks.push(...batchResults.waitingStocks);
                results.validCount += batchResults.validCount;
                results.invalidCount += batchResults.invalidCount;
                results.errorCount += batchResults.errorCount;
            }
            
            // 결과 정렬 (점수 높은 순)
            results.breakoutStocks.sort((a, b) => (b.score || 0) - (a.score || 0));
            results.waitingStocks.sort((a, b) => (b.score || 0) - (a.score || 0));
            
            const analysisTime = Date.now() - this.analysisStartTime;
            
            console.log(`✅ 분석 완료: 돌파 ${results.breakoutStocks.length}개, 대기 ${results.waitingStocks.length}개 (${(analysisTime / 1000).toFixed(1)}초)`);
            
            this.eventBus?.emit(Constants.EVENTS.ANALYSIS_COMPLETED, {
                ...results,
                duration: analysisTime
            });
            
            return results;
            
        } catch (error) {
            const appError = error instanceof AppError ? error : 
                AppError.validationError('주식 분석 실패', {
                    originalError: error.message,
                    stockCount: stocksData?.length || 0
                });
            
            this.errorHandler?.handle(appError, { context: 'analyzeStocks' });
            this.eventBus?.emit(Constants.EVENTS.ANALYSIS_ERROR, {
                error: appError.message
            });
            
            throw appError;
            
        } finally {
            this.isAnalyzing = false;
            this.analysisStartTime = null;
        }
    }
    
    /**
     * 배치 단위 주식 분석
     * @param {Object[]} batch - 분석할 주식 배치
     * @param {Object} settings - 분석 설정
     * @param {Object} batchInfo - 배치 정보
     * @returns {Promise<Object>} 배치 분석 결과
     */
    async analyzeBatch(batch, settings, batchInfo) {
        const batchResults = {
            breakoutStocks: [],
            waitingStocks: [],
            validCount: 0,
            invalidCount: 0,
            errorCount: 0
        };
        
        for (let i = 0; i < batch.length; i++) {
            const stockData = batch[i];
            const globalIndex = batchInfo.processedSoFar + i;
            
            try {
                // 기본 유효성 검사
                if (!this.isValidStockData(stockData)) {
                    batchResults.invalidCount++;
                    continue;
                }
                
                // 볼륨 필터링
                if (stockData.yesterdayVolume < settings.minVolume) {
                    batchResults.invalidCount++;
                    continue;
                }
                
                // 래리 윌리엄스 공식 계산
                const analysis = this.calculator.calculate(stockData);
                
                // 변동성 필터링
                if (analysis.volatility < settings.volatilityMin || 
                    analysis.volatility > settings.volatilityMax) {
                    batchResults.invalidCount++;
                    continue;
                }
                
                // 종합 점수 계산
                const enhancedAnalysis = this.calculateEnhancedScore(stockData, analysis, settings);
                
                // 결과 분류
                if (enhancedAnalysis.hasBreakout) {
                    batchResults.breakoutStocks.push({
                        ...stockData,
                        ...enhancedAnalysis,
                        analysisTimestamp: new Date().toISOString()
                    });
                } else if (enhancedAnalysis.isNearBreakout) {
                    batchResults.waitingStocks.push({
                        ...stockData,
                        ...enhancedAnalysis,
                        analysisTimestamp: new Date().toISOString()
                    });
                }
                
                batchResults.validCount++;
                
            } catch (error) {
                batchResults.errorCount++;
                console.warn(`분석 오류 (${stockData.ticker || 'unknown'}):`, error.message);
            }
            
            // 진행률 이벤트 (주기적으로만)
            if (globalIndex % 10 === 0 || i === batch.length - 1) {
                this.eventBus?.emit(Constants.EVENTS.ANALYSIS_PROGRESS, {
                    processed: globalIndex + 1,
                    total: batchInfo.processedSoFar + batch.length,
                    batchIndex: batchInfo.batchIndex,
                    totalBatches: batchInfo.totalBatches,
                    currentTicker: stockData.ticker
                });
            }
        }
        
        return batchResults;
    }
    
    /**
     * 개별 주식 분석
     * @param {Object} stockData - 주식 데이터
     * @param {Object} settings - 분석 설정
     * @returns {Object} 분석 결과
     */
    analyzeSingleStock(stockData, settings = {}) {
        try {
            const analysisSettings = { ...this.defaultSettings, ...settings };
            
            // 유효성 검사
            if (!this.isValidStockData(stockData)) {
                throw AppError.validationError('유효하지 않은 주식 데이터', { ticker: stockData.ticker });
            }
            
            // 기본 계산
            const analysis = this.calculator.calculate(stockData);
            
            // 향상된 분석
            const enhancedAnalysis = this.calculateEnhancedScore(stockData, analysis, analysisSettings);
            
            return {
                ...stockData,
                ...enhancedAnalysis,
                analysisTimestamp: new Date().toISOString()
            };
            
        } catch (error) {
            const appError = error instanceof AppError ? error : 
                AppError.validationError('개별 주식 분석 실패', {
                    ticker: stockData.ticker,
                    originalError: error.message
                });
            
            this.errorHandler?.handle(appError, { context: 'analyzeSingleStock' }, false);
            throw appError;
        }
    }
    
    /**
     * 향상된 점수 계산
     * @param {Object} stockData - 주식 데이터
     * @param {Object} basicAnalysis - 기본 분석 결과
     * @param {Object} settings - 설정
     * @returns {Object} 향상된 분석 결과
     */
    calculateEnhancedScore(stockData, basicAnalysis, settings) {
        const result = { ...basicAnalysis };
        
        // 1. 기본 점수 (0-100)
        let score = 50;
        
        // 2. 변동성 점수 (적정 범위일수록 높은 점수)
        const optimalVolatility = (settings.volatilityMin + settings.volatilityMax) / 2;
        const volatilityDistance = Math.abs(basicAnalysis.volatility - optimalVolatility);
        const volatilityScore = Math.max(0, 30 - volatilityDistance * 3);
        score += volatilityScore;
        
        // 3. 거래량 점수
        const volumeRatio = stockData.yesterdayVolume / settings.minVolume;
        const volumeScore = Math.min(20, Math.log10(volumeRatio) * 10);
        score += volumeScore;
        
        // 4. 진입가까지의 거리 점수
        const distanceToEntry = Math.abs(stockData.currentPrice - basicAnalysis.entryPrice) / stockData.currentPrice;
        const distanceScore = Math.max(0, 15 - distanceToEntry * 100);
        score += distanceScore;
        
        // 5. 가격 모멘텀 점수
        const priceChange = Utils.calculatePercentage(stockData.currentPrice, stockData.yesterdayClose);
        const momentumScore = Math.min(10, Math.abs(priceChange));
        score += momentumScore;
        
        // 6. 리스크/리워드 비율 점수
        if (basicAnalysis.riskRewardRatio && basicAnalysis.riskRewardRatio > 0) {
            const rrScore = Math.min(15, basicAnalysis.riskRewardRatio * 3);
            score += rrScore;
        }
        
        // 7. 시장 시간 보너스 (장중에 더 높은 점수)
        if (this.isMarketHours()) {
            score += 5;
        }
        
        // 점수 정규화 (0-100)
        result.score = Math.min(100, Math.max(0, Math.round(score)));
        
        // 8. 상태 재분류 (점수 기반)
        if (result.hasBreakout && result.score < 60) {
            result.hasBreakout = false;
            result.isNearBreakout = true;
            result.status = 'waiting-low-confidence';
        } else if (result.isNearBreakout && result.score > 80) {
            result.status = 'waiting-high-confidence';
        }
        
        // 9. 신뢰도 등급
        if (result.score >= 80) {
            result.confidence = 'high';
        } else if (result.score >= 60) {
            result.confidence = 'medium';
        } else {
            result.confidence = 'low';
        }
        
        // 10. 추천 액션
        result.recommendedAction = this.getRecommendedAction(result);
        
        return result;
    }
    
    /**
     * 주식 데이터 유효성 검사
     * @param {Object} stockData - 검사할 주식 데이터
     * @returns {boolean}
     */
    isValidStockData(stockData) {
        return Utils.isValidStockData(stockData) &&
               typeof stockData.yesterdayHigh === 'number' &&
               typeof stockData.yesterdayLow === 'number' &&
               typeof stockData.yesterdayVolume === 'number' &&
               stockData.yesterdayHigh > 0 &&
               stockData.yesterdayLow > 0 &&
               stockData.yesterdayVolume > 0;
    }
    
    /**
     * 시장 시간 확인
     * @returns {boolean}
     */
    isMarketHours() {
        const now = new Date();
        const day = now.getDay(); // 0: 일요일, 6: 토요일
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTime = hours * 60 + minutes;
        
        // 주말 제외
        if (day === 0 || day === 6) return false;
        
        // 미국 동부 시간 9:30 AM - 4:00 PM (UTC 기준으로 조정 필요)
        const marketOpen = 9 * 60 + 30; // 9:30 AM
        const marketClose = 16 * 60; // 4:00 PM
        
        return currentTime >= marketOpen && currentTime < marketClose;
    }
    
    /**
     * 추천 액션 결정
     * @param {Object} analysis - 분석 결과
     * @returns {string}
     */
    getRecommendedAction(analysis) {
        if (analysis.hasBreakout) {
            if (analysis.score >= 80) return 'strong-buy';
            if (analysis.score >= 70) return 'buy';
            return 'weak-buy';
        }
        
        if (analysis.isNearBreakout) {
            if (analysis.score >= 80) return 'watch-closely';
            if (analysis.score >= 60) return 'watch';
            return 'consider';
        }
        
        return 'pass';
    }
    
    /**
     * 분석 진행 상태 조회
     * @returns {Object|null}
     */
    getAnalysisStatus() {
        if (!this.isAnalyzing) {
            return null;
        }
        
        return {
            isAnalyzing: this.isAnalyzing,
            startTime: this.analysisStartTime,
            duration: Date.now() - this.analysisStartTime
        };
    }
    
    /**
     * 분석 취소
     */
    cancelAnalysis() {
        if (!this.isAnalyzing) {
            return;
        }
        
        console.log('🛑 주식 분석 취소 요청됨');
        
        this.isAnalyzing = false;
        this.analysisStartTime = null;
        
        this.eventBus?.emit(Constants.EVENTS.ANALYSIS_ERROR, {
            error: '사용자에 의해 취소됨'
        });
    }
    
    /**
     * 분석 통계 조회
     * @param {Object} results - 분석 결과
     * @returns {Object} 통계 정보
     */
    getAnalysisStatistics(results) {
        if (!results) return null;
        
        const total = results.totalScanned;
        const breakoutCount = results.breakoutStocks.length;
        const waitingCount = results.waitingStocks.length;
        const validCount = results.validCount;
        const invalidCount = results.invalidCount;
        const errorCount = results.errorCount;
        
        return {
            total,
            breakoutCount,
            waitingCount,
            validCount,
            invalidCount,
            errorCount,
            breakoutRate: total > 0 ? (breakoutCount / total * 100).toFixed(2) + '%' : '0%',
            waitingRate: total > 0 ? (waitingCount / total * 100).toFixed(2) + '%' : '0%',
            validRate: total > 0 ? (validCount / total * 100).toFixed(2) + '%' : '0%',
            averageScore: this.calculateAverageScore(results),
            topScores: this.getTopScores(results, 5)
        };
    }
    
    /**
     * 평균 점수 계산
     * @param {Object} results - 분석 결과
     * @returns {number}
     */
    calculateAverageScore(results) {
        const allStocks = [...results.breakoutStocks, ...results.waitingStocks];
        if (allStocks.length === 0) return 0;
        
        const totalScore = allStocks.reduce((sum, stock) => sum + (stock.score || 0), 0);
        return Math.round(totalScore / allStocks.length);
    }
    
    /**
     * 상위 점수 종목들 조회
     * @param {Object} results - 분석 결과
     * @param {number} count - 조회할 개수
     * @returns {Object[]}
     */
    getTopScores(results, count = 5) {
        const allStocks = [...results.breakoutStocks, ...results.waitingStocks];
        return allStocks
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, count)
            .map(stock => ({
                ticker: stock.ticker,
                score: stock.score,
                status: stock.hasBreakout ? 'breakout' : 'waiting',
                confidence: stock.confidence
            }));
    }
}

// 전역으로 노출
window.StockAnalyzer = StockAnalyzer;