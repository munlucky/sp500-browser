class VolatilityCalculator {
    static calculate(stockData, settings = {}) {
        try {
            // 입력 데이터 검증
            const validatedData = this.validateStockData(stockData);
            if (!validatedData) {
                throw new Error('Invalid stock data provided');
            }

            const {
                currentPrice,
                yesterdayClose,
                yesterdayHigh,
                yesterdayLow,
                yesterdayVolume: volume
            } = validatedData;
            
            // 기본 설정 with 안전한 기본값
            const config = {
                volatilityMin: 0.02,
                volatilityMax: settings.volatilityMax || 0.08,
                minVolume: settings.minVolume || 1000000,
                minPrice: settings.minPrice || 10,
                breakoutFactor: settings.breakoutFactor || 0.6,
                ...settings
            };
            
            // 설정값 검증
            const validatedConfig = this.validateSettings(config);
            
            // 변동폭 및 변동률 계산 (0으로 나누기 방지)
            const dailyRange = Math.abs(yesterdayHigh - yesterdayLow);
            const volatility = yesterdayClose > 0 ? (dailyRange / yesterdayClose) * 100 : 0;
            
            // 진입가 계산 (래리 윌리엄스 공식)
            const entryPrice = yesterdayClose + (dailyRange * validatedConfig.breakoutFactor);
            
            // 손절가 계산 (3단계) - 음수 방지
            const stopLoss3 = Math.max(0.01, entryPrice * 0.97);  // -3%
            const stopLoss5 = Math.max(0.01, entryPrice * 0.95);  // -5%
            const stopLoss8 = Math.max(0.01, entryPrice * 0.92);  // -8%
            
            // 목표가 계산 (리스크 리워드 기반) - 안전한 계산
            const riskAmount = Math.max(0.01, entryPrice - stopLoss5);
            const target1 = entryPrice + (riskAmount * 1.5);  // 1.5:1
            const target2 = entryPrice + (riskAmount * 2.0);  // 2:1
            const target3 = entryPrice + (riskAmount * 3.0);  // 3:1 (추가)
            
            // 조건 확인 - 더 안전한 검증
            const conditions = {
                volatilityOk: this.isInRange(volatility, validatedConfig.volatilityMin * 100, validatedConfig.volatilityMax * 100),
                volumeOk: volume >= validatedConfig.minVolume,
                priceOk: yesterdayClose >= validatedConfig.minPrice,
                rangeOk: dailyRange > 0, // 변동폭이 0보다 큰지 확인
                dataIntegrity: yesterdayHigh >= yesterdayLow && yesterdayHigh >= yesterdayClose && yesterdayLow <= yesterdayClose
            };
            
            const meetsConditions = Object.values(conditions).every(Boolean);
            
            // 돌파 여부 확인
            const isBreakout = currentPrice >= entryPrice;
            const gapToEntry = Math.max(0, entryPrice - currentPrice);
            const gapPercent = entryPrice > 0 ? (gapToEntry / entryPrice) * 100 : 0;
            
            // 점수 계산
            const score = this.calculateScore({
                volatility: volatility / 100,
                yesterdayVolume: volume,
                price: yesterdayClose,
                gapToEntry,
                dailyRange,
                conditions
            });
            
            // 리스크 분석
            const riskAnalysis = this.calculateRiskMetrics({
                entryPrice,
                stopLoss5,
                target1,
                target2,
                currentPrice,
                volatility
            });
            
            // 결과 반환
            const result = {
                // 기본 가격 정보
                currentPrice: this.roundPrice(currentPrice),
                entryPrice: this.roundPrice(entryPrice),
                stopLoss: this.roundPrice(stopLoss5),
                stopLoss3: this.roundPrice(stopLoss3),
                stopLoss5: this.roundPrice(stopLoss5),
                stopLoss8: this.roundPrice(stopLoss8),
                target1: this.roundPrice(target1),
                target2: this.roundPrice(target2),
                target3: this.roundPrice(target3),
                
                // 분석 데이터
                volatility: this.roundPercent(volatility),
                yesterdayVolume: volume,
                dailyRange: this.roundPrice(dailyRange),
                gapToEntry: this.roundPrice(gapToEntry),
                gapPercent: this.roundPercent(gapPercent),
                
                // 상태
                isBreakout,
                meetsConditions,
                conditions,
                score: Math.round(score),
                
                // 리스크 분석
                riskRewardRatio: this.roundRatio(riskAnalysis.riskReward),
                maxDrawdown: this.roundPercent(riskAnalysis.maxDrawdown),
                winProbability: this.roundPercent(riskAnalysis.winProbability),
                
                // 메타데이터
                calculatedAt: new Date().toISOString(),
                configUsed: validatedConfig
            };
            
            return result;
            
        } catch (error) {
            console.error('VolatilityCalculator.calculate 오류:', error);
            return null;
        }
    }
    
    static validateStockData(data) {
        if (!data || typeof data !== 'object') return null;
        
        // 데이터 정규화: volume 필드를 yesterdayVolume으로 변환 (하위 호환성)
        const normalizedData = { ...data };
        if (!normalizedData.yesterdayVolume && normalizedData.volume) {
            normalizedData.yesterdayVolume = normalizedData.volume;
        }
        
        const required = ['currentPrice', 'yesterdayClose', 'yesterdayHigh', 'yesterdayLow', 'yesterdayVolume'];
        
        for (const field of required) {
            if (!(field in normalizedData) || !this.isValidNumber(normalizedData[field])) {
                console.error(`잘못된 주식 데이터: ${field} 필드가 유효하지 않음`, { 
                    field, 
                    value: normalizedData[field],
                    originalData: data 
                });
                return null;
            }
        }
        
        // 논리적 검증
        const { yesterdayHigh, yesterdayLow, yesterdayClose, currentPrice, yesterdayVolume: volume } = normalizedData;
        
        if (yesterdayHigh < yesterdayLow) {
            console.error('논리 오류: 고가가 저가보다 낮음');
            return null;
        }
        
        if (yesterdayClose < 0 || currentPrice < 0) {
            console.error('논리 오류: 음수 가격');
            return null;
        }
        
        if (volume < 0) {
            console.error('논리 오류: 음수 거래량');
            return null;
        }
        
        return {
            currentPrice: Number(currentPrice),
            yesterdayClose: Number(yesterdayClose),
            yesterdayHigh: Number(yesterdayHigh),
            yesterdayLow: Number(yesterdayLow),
            yesterdayVolume: Number(volume)
        };
    }
    
    static validateSettings(config) {
        const validated = { ...config };
        
        // 변동성 범위 검증
        validated.volatilityMin = this.clamp(validated.volatilityMin, 0.001, 0.1);
        validated.volatilityMax = this.clamp(validated.volatilityMax, validated.volatilityMin, 0.2);
        
        // 최소 거래량 검증
        validated.minVolume = Math.max(1, validated.minVolume);
        
        // 최소 가격 검증
        validated.minPrice = Math.max(0.01, validated.minPrice);
        
        // 돌파 팩터 검증
        validated.breakoutFactor = this.clamp(validated.breakoutFactor, 0.1, 1.0);
        
        return validated;
    }
    
    static calculateScore(data) {
        try {
            let score = 0;
            
            // 변동률 점수 (3-5%가 최적) - 개선된 스코어링
            const volatility = data.volatility;
            if (volatility >= 0.03 && volatility <= 0.05) {
                score += 35; // 최적 구간
            } else if (volatility >= 0.025 && volatility <= 0.06) {
                score += 25; // 양호 구간
            } else if (volatility >= 0.02 && volatility <= 0.08) {
                score += 15; // 허용 구간
            } else {
                score += 5; // 위험 구간
            }
            
            // 거래량 점수 - 개선된 계층
            if (data.yesterdayVolume >= 10000000) {
                score += 30; // 초고거래량
            } else if (data.yesterdayVolume >= 5000000) {
                score += 25; // 고거래량
            } else if (data.yesterdayVolume >= 2000000) {
                score += 20; // 중거래량
            } else if (data.yesterdayVolume >= 1000000) {
                score += 15; // 기본거래량
            } else {
                score += 5; // 저거래량
            }
            
            // 가격 안정성 점수 - 더 세분화
            if (data.price >= 30 && data.price <= 200) {
                score += 25; // 안정적 가격대
            } else if (data.price >= 20 && data.price <= 300) {
                score += 20; // 양호한 가격대
            } else if (data.price >= 10 && data.price <= 500) {
                score += 15; // 허용 가격대
            } else {
                score += 5; // 위험 가격대
            }
            
            // 진입 근접도 점수 - 개선된 계산
            const gapPercent = (data.gapToEntry / (data.price + data.dailyRange)) * 100;
            if (gapPercent <= 1) {
                score += 20; // 매우 근접
            } else if (gapPercent <= 3) {
                score += 15; // 근접
            } else if (gapPercent <= 5) {
                score += 10; // 보통
            } else if (gapPercent <= 10) {
                score += 5; // 멀음
            }
            
            // 조건 충족도 보너스
            const conditionsMet = Object.values(data.conditions).filter(Boolean).length;
            const totalConditions = Object.keys(data.conditions).length;
            const conditionRatio = conditionsMet / totalConditions;
            
            if (conditionRatio === 1) {
                score += 10; // 모든 조건 충족
            } else if (conditionRatio >= 0.8) {
                score += 5; // 대부분 조건 충족
            }
            
            return Math.min(100, Math.max(0, score));
            
        } catch (error) {
            console.error('점수 계산 오류:', error);
            return 0;
        }
    }
    
    static calculateRiskMetrics({ entryPrice, stopLoss5, target1, target2, currentPrice, volatility }) {
        try {
            // 리스크 리워드 비율
            const risk = entryPrice - stopLoss5;
            const reward1 = target1 - entryPrice;
            const riskReward = risk > 0 ? reward1 / risk : 0;
            
            // 최대 손실률
            const maxDrawdown = risk > 0 ? (risk / entryPrice) * 100 : 0;
            
            // 승률 추정 (변동성 기반)
            let winProbability = 50; // 기본값
            if (volatility < 0.03) {
                winProbability = 65; // 낮은 변동성 = 높은 승률
            } else if (volatility > 0.06) {
                winProbability = 35; // 높은 변동성 = 낮은 승률
            }
            
            // 현재 위치 기반 조정
            if (currentPrice > entryPrice) {
                winProbability += 10; // 이미 돌파한 경우
            }
            
            return {
                riskReward: Math.max(0, riskReward),
                maxDrawdown: Math.max(0, maxDrawdown),
                winProbability: this.clamp(winProbability, 0, 100)
            };
            
        } catch (error) {
            console.error('리스크 메트릭 계산 오류:', error);
            return {
                riskReward: 0,
                maxDrawdown: 0,
                winProbability: 50
            };
        }
    }
    
    // 유틸리티 메서드들
    static isValidNumber(value) {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }
    
    static isInRange(value, min, max) {
        return this.isValidNumber(value) && value >= min && value <= max;
    }
    
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    static roundPrice(price) {
        return Math.round(price * 100) / 100; // 소수점 2자리
    }
    
    static roundPercent(percent) {
        return Math.round(percent * 10) / 10; // 소수점 1자리
    }
    
    static roundRatio(ratio) {
        return Math.round(ratio * 10) / 10; // 소수점 1자리
    }
    
    // 백테스팅 관련 메서드 (향후 확장용)
    static backtestStrategy(historicalData, settings) {
        // 향후 백테스팅 기능 구현
        console.log('백테스팅 기능은 향후 구현 예정입니다.');
        return null;
    }
    
    // 시장 조건 분석 (향후 확장용)
    static analyzeMarketCondition(marketData) {
        // 향후 시장 조건 분석 기능 구현
        console.log('시장 조건 분석 기능은 향후 구현 예정입니다.');
        return null;
    }
}