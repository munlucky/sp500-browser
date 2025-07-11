class VolatilityCalculator {
    static calculate(stockData, settings = {}) {
        const {
            currentPrice,
            yesterdayClose,
            yesterdayHigh,
            yesterdayLow,
            volume
        } = stockData;
        
        // 기본 설정
        const config = {
            volatilityMin: 0.02,
            volatilityMax: settings.volatilityMax || 0.08,
            minVolume: settings.minVolume || 1000000,
            minPrice: 10,
            breakoutFactor: 0.6,
            ...settings
        };
        
        // 변동폭 및 변동률 계산
        const dailyRange = yesterdayHigh - yesterdayLow;
        const volatility = (dailyRange / yesterdayClose) * 100;
        
        // 진입가 계산 (래리 윌리엄스 공식)
        const entryPrice = yesterdayClose + (dailyRange * config.breakoutFactor);
        
        // 손절가 계산 (3단계)
        const stopLoss3 = entryPrice * 0.97;  // -3%
        const stopLoss5 = entryPrice * 0.95;  // -5%
        const stopLoss8 = entryPrice * 0.92;  // -8%
        
        // 목표가 계산 (리스크 리워드 기반)
        const riskAmount = entryPrice - stopLoss5;
        const target1 = entryPrice + (riskAmount * 1.5);  // 1.5:1
        const target2 = entryPrice + (riskAmount * 2.0);  // 2:1
        
        // 조건 확인
        const conditions = {
            volatilityOk: volatility >= config.volatilityMin * 100 && volatility <= config.volatilityMax * 100,
            volumeOk: volume >= config.minVolume,
            priceOk: yesterdayClose >= config.minPrice
        };
        
        const meetsConditions = Object.values(conditions).every(Boolean);
        
        // 돌파 여부 확인
        const isBreakout = currentPrice >= entryPrice;
        const gapToEntry = Math.max(0, entryPrice - currentPrice);
        
        // 점수 계산
        const score = this.calculateScore({
            volatility: volatility / 100,
            volume,
            price: yesterdayClose,
            gapToEntry
        });
        
        return {
            currentPrice,
            entryPrice,
            stopLoss: stopLoss5,
            stopLoss3,
            stopLoss5,
            stopLoss8,
            target1,
            target2,
            volatility,
            volume,
            dailyRange,
            gapToEntry,
            isBreakout,
            meetsConditions,
            conditions,
            score,
            riskRewardRatio: (target1 - entryPrice) / (entryPrice - stopLoss5)
        };
    }
    
    static calculateScore(data) {
        let score = 0;
        
        // 변동률 점수 (3-5%가 최적)
        const volatility = data.volatility;
        if (volatility >= 0.03 && volatility <= 0.05) {
            score += 30;
        } else if (volatility >= 0.02 && volatility <= 0.07) {
            score += 20;
        } else {
            score += 10;
        }
        
        // 거래량 점수
        if (data.volume >= 5000000) {
            score += 25;
        } else if (data.volume >= 2000000) {
            score += 20;
        } else if (data.volume >= 1000000) {
            score += 15;
        }
        
        // 가격 안정성 점수
        if (data.price >= 50 && data.price <= 300) {
            score += 20;
        } else if (data.price >= 20 && data.price <= 500) {
            score += 15;
        } else {
            score += 10;
        }
        
        // 진입 근접도 점수
        if (data.gapToEntry <= 1) {
            score += 15;
        } else if (data.gapToEntry <= 3) {
            score += 10;
        } else if (data.gapToEntry <= 5) {
            score += 5;
        }
        
        return Math.min(100, score);
    }
}