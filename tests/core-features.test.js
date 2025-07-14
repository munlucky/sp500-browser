/**
 * 핵심 비즈니스 로직 테스트
 * 래리 윌리엄스 변동성 돌파 전략의 핵심 계산과 로직을 검증합니다.
 */

describe('래리 윌리엄스 돌파 전략 핵심 로직', () => {
  
  describe('돌파 진입가 계산', () => {
    test('래리 윌리엄스 공식이 정확하게 계산됨', () => {
      const testCases = [
        {
          yesterdayClose: 100.00,
          yesterdayHigh: 105.00,
          yesterdayLow: 95.00,
          breakoutFactor: 0.6,
          expectedEntryPrice: 106.00  // 100 + (10 * 0.6)
        },
        {
          yesterdayClose: 150.00,
          yesterdayHigh: 155.00,
          yesterdayLow: 145.00,
          breakoutFactor: 0.6,
          expectedEntryPrice: 156.00  // 150 + (10 * 0.6)
        },
        {
          yesterdayClose: 50.00,
          yesterdayHigh: 52.50,
          yesterdayLow: 48.00,
          breakoutFactor: 0.6,
          expectedEntryPrice: 52.70   // 50 + (4.5 * 0.6)
        }
      ];

      testCases.forEach(testCase => {
        const dailyRange = testCase.yesterdayHigh - testCase.yesterdayLow;
        const entryPrice = testCase.yesterdayClose + (dailyRange * testCase.breakoutFactor);
        
        expect(entryPrice).toBeCloseTo(testCase.expectedEntryPrice, 2);
      });
    });

    test('다양한 돌파 팩터에 대한 진입가 계산', () => {
      const baseData = {
        yesterdayClose: 100.00,
        yesterdayHigh: 110.00,
        yesterdayLow: 90.00  // 일일 범위: 20
      };

      const factors = [0.3, 0.5, 0.6, 0.8, 1.0];
      const expectedPrices = [106.00, 110.00, 112.00, 116.00, 120.00];

      factors.forEach((factor, index) => {
        const dailyRange = baseData.yesterdayHigh - baseData.yesterdayLow;
        const entryPrice = baseData.yesterdayClose + (dailyRange * factor);
        
        expect(entryPrice).toBeCloseTo(expectedPrices[index], 2);
      });
    });
  });

  describe('리스크 관리 계산', () => {
    test('스탑로스 레벨 계산', () => {
      const entryPrice = 150.00;
      const stopLossLevels = [
        { percentage: 0.03, expected: 145.50 },  // 3% 손절
        { percentage: 0.05, expected: 142.50 },  // 5% 손절
        { percentage: 0.08, expected: 138.00 }   // 8% 손절
      ];

      stopLossLevels.forEach(level => {
        const stopLoss = entryPrice * (1 - level.percentage);
        expect(stopLoss).toBeCloseTo(level.expected, 2);
      });
    });

    test('목표가 계산', () => {
      const entryPrice = 150.00;
      const targets = [
        { ratio: 1.02, expected: 153.00 },  // 2% 목표
        { ratio: 1.03, expected: 154.50 },  // 3% 목표
        { ratio: 1.05, expected: 157.50 }   // 5% 목표
      ];

      targets.forEach(target => {
        const targetPrice = entryPrice * target.ratio;
        expect(targetPrice).toBeCloseTo(target.expected, 2);
      });
    });

    test('리스크-보상 비율 계산', () => {
      const entryPrice = 150.00;
      const stopLoss = 142.50;  // 5% 손절
      const target = 157.50;    // 5% 목표

      const risk = entryPrice - stopLoss;  // 7.50
      const reward = target - entryPrice;  // 7.50
      const riskRewardRatio = reward / risk;

      expect(risk).toBeCloseTo(7.50, 2);
      expect(reward).toBeCloseTo(7.50, 2);
      expect(riskRewardRatio).toBeCloseTo(1.0, 2);
    });
  });

  describe('변동성 분석', () => {
    test('일일 변동성 퍼센티지 계산', () => {
      const testCases = [
        {
          high: 105.00,
          low: 95.00,
          close: 100.00,
          expectedVolatility: 10.00  // ((105-95)/100)*100
        },
        {
          high: 152.00,
          low: 148.00,
          close: 150.00,
          expectedVolatility: 2.67   // ((152-148)/150)*100
        },
        {
          high: 51.00,
          low: 49.00,
          close: 50.00,
          expectedVolatility: 4.00   // ((51-49)/50)*100
        }
      ];

      testCases.forEach(testCase => {
        const dailyRange = testCase.high - testCase.low;
        const volatility = (dailyRange / testCase.close) * 100;
        
        expect(volatility).toBeCloseTo(testCase.expectedVolatility, 2);
      });
    });

    test('변동성 필터링 조건', () => {
      const settings = {
        volatilityMin: 2.0,  // 2%
        volatilityMax: 8.0   // 8%
      };

      const stocks = [
        { volatility: 1.5, shouldPass: false, reason: '너무 낮은 변동성' },
        { volatility: 2.5, shouldPass: true,  reason: '적정 변동성' },
        { volatility: 5.0, shouldPass: true,  reason: '이상적 변동성' },
        { volatility: 7.5, shouldPass: true,  reason: '높지만 허용 가능한 변동성' },
        { volatility: 9.0, shouldPass: false, reason: '너무 높은 변동성' }
      ];

      stocks.forEach(stock => {
        const isInRange = stock.volatility >= settings.volatilityMin && 
                         stock.volatility <= settings.volatilityMax;
        expect(isInRange).toBe(stock.shouldPass);
      });
    });
  });

  describe('거래량 분석', () => {
    test('거래량 필터링', () => {
      const minVolume = 1000000;  // 100만주
      
      const stocks = [
        { volume: 500000,   shouldPass: false },
        { volume: 1000000,  shouldPass: true },
        { volume: 2500000,  shouldPass: true },
        { volume: 10000000, shouldPass: true }
      ];

      stocks.forEach(stock => {
        const passesVolumeFilter = stock.volume >= minVolume;
        expect(passesVolumeFilter).toBe(stock.shouldPass);
      });
    });

    test('거래량 증가 감지', () => {
      const volumeHistory = [800000, 900000, 750000, 850000, 900000];
      const currentVolume = 1200000;
      
      const avgVolume = volumeHistory.reduce((sum, vol) => sum + vol, 0) / volumeHistory.length;
      const volumeIncrease = currentVolume / avgVolume;
      
      expect(avgVolume).toBeCloseTo(840000, 0);
      expect(volumeIncrease).toBeCloseTo(1.43, 2);
      expect(volumeIncrease > 1.2).toBe(true); // 20% 이상 증가
    });
  });

  describe('돌파 감지 로직', () => {
    test('실시간 돌파 감지', () => {
      const watchListItem = {
        ticker: 'AAPL',
        entryPrice: 151.50,
        yesterdayClose: 150.00,
        hasBreakout: false
      };

      const testPrices = [
        { currentPrice: 150.50, shouldBreakout: false, reason: '진입가 미달' },
        { currentPrice: 151.50, shouldBreakout: true,  reason: '진입가 도달' },
        { currentPrice: 152.00, shouldBreakout: true,  reason: '진입가 초과' }
      ];

      testPrices.forEach(test => {
        const isBreakout = test.currentPrice >= watchListItem.entryPrice && 
                          !watchListItem.hasBreakout;
        expect(isBreakout).toBe(test.shouldBreakout);
      });
    });

    test('돌파 이후 수익률 계산', () => {
      const entryPrice = 150.00;
      const currentPrices = [151.50, 153.00, 157.50];
      const expectedGains = [1.00, 2.00, 5.00];

      currentPrices.forEach((price, index) => {
        const gain = ((price - entryPrice) / entryPrice) * 100;
        expect(gain).toBeCloseTo(expectedGains[index], 2);
      });
    });
  });

  describe('시장 시간 감지', () => {
    test('미국 주식 시장 시간 판단', () => {
      const marketHours = {
        openHour: 9,
        openMinute: 30,
        closeHour: 16,
        closeMinute: 0
      };

      const testTimes = [
        { hour: 9,  minute: 29, expected: false, description: '개장 전' },
        { hour: 9,  minute: 30, expected: true,  description: '개장 시간' },
        { hour: 12, minute: 0,  expected: true,  description: '장중' },
        { hour: 15, minute: 59, expected: true,  description: '폐장 직전' },
        { hour: 16, minute: 0,  expected: false, description: '폐장 시간' },
        { hour: 20, minute: 0,  expected: false, description: '애프터마켓' }
      ];

      testTimes.forEach(test => {
        const timeInMinutes = test.hour * 60 + test.minute;
        const openTime = marketHours.openHour * 60 + marketHours.openMinute;
        const closeTime = marketHours.closeHour * 60 + marketHours.closeMinute;
        
        const isMarketOpen = timeInMinutes >= openTime && timeInMinutes < closeTime;
        expect(isMarketOpen).toBe(test.expected);
      });
    });

    test('주말 휴장 감지', () => {
      const weekdays = [1, 2, 3, 4, 5]; // 월-금
      const weekends = [0, 6];           // 일, 토

      weekdays.forEach(day => {
        const isWeekend = day === 0 || day === 6;
        expect(isWeekend).toBe(false);
      });

      weekends.forEach(day => {
        const isWeekend = day === 0 || day === 6;
        expect(isWeekend).toBe(true);
      });
    });
  });

  describe('포지션 사이징', () => {
    test('리스크 기반 포지션 크기 계산', () => {
      const riskAmount = 1000;  // $1000 리스크
      const entryPrice = 150.00;
      const stopLoss = 142.50;
      const riskPerShare = entryPrice - stopLoss;  // $7.50

      const position = Math.floor(riskAmount / riskPerShare);
      
      expect(riskPerShare).toBeCloseTo(7.50, 2);
      expect(position).toBe(133); // 133주
      
      // 실제 리스크 확인
      const actualRisk = position * riskPerShare;
      expect(actualRisk).toBeLessThanOrEqual(riskAmount);
    });

    test('최소 주문 수량 보장', () => {
      const riskAmount = 10;    // 매우 적은 리스크 금액
      const entryPrice = 150.00;
      const stopLoss = 100.00;  // $50 리스크 per share
      const riskPerShare = entryPrice - stopLoss;

      const calculatedPosition = Math.floor(riskAmount / riskPerShare);
      const finalPosition = Math.max(1, calculatedPosition);

      expect(riskPerShare).toBe(50);
      expect(calculatedPosition).toBe(0); // 10/50 = 0.2 -> floor = 0
      expect(finalPosition).toBe(1); // 최소 1주 보장
    });
  });

  describe('데이터 유효성 검증', () => {
    test('주식 데이터 논리적 일관성 검증', () => {
      const validData = {
        ticker: 'AAPL',
        currentPrice: 150.00,
        yesterdayClose: 148.50,
        yesterdayHigh: 152.00,
        yesterdayLow: 147.00,
        volume: 50000000
      };

      // 가격 논리 검증
      expect(validData.yesterdayHigh).toBeGreaterThanOrEqual(validData.yesterdayClose);
      expect(validData.yesterdayLow).toBeLessThanOrEqual(validData.yesterdayClose);
      expect(validData.yesterdayHigh).toBeGreaterThan(validData.yesterdayLow);
      
      // 양수 값 검증
      expect(validData.currentPrice).toBeGreaterThan(0);
      expect(validData.volume).toBeGreaterThan(0);
      
      // 티커 형식 검증
      expect(validData.ticker).toMatch(/^[A-Z]{1,5}$/);
    });

    test('잘못된 데이터 감지', () => {
      const invalidCases = [
        {
          data: { currentPrice: -10 },
          error: '음수 가격'
        },
        {
          data: { yesterdayHigh: 100, yesterdayClose: 110 },
          error: '고가가 종가보다 낮음'
        },
        {
          data: { yesterdayLow: 120, yesterdayClose: 110 },
          error: '저가가 종가보다 높음'
        },
        {
          data: { volume: -1000 },
          error: '음수 거래량'
        }
      ];

      invalidCases.forEach(testCase => {
        // 각 케이스별로 적절한 검증 로직 실행
        if (testCase.data.currentPrice < 0) {
          expect(testCase.data.currentPrice).toBeLessThan(0);
        }
        if (testCase.data.yesterdayHigh && testCase.data.yesterdayClose) {
          const isValidHighLow = testCase.data.yesterdayHigh >= testCase.data.yesterdayClose;
          expect(isValidHighLow).toBe(false);
        }
      });
    });
  });

  describe('성능 최적화', () => {
    test('대량 종목 필터링 성능', () => {
      const largeDataSet = new Array(500).fill(0).map((_, index) => ({
        ticker: `STOCK${index.toString().padStart(3, '0')}`,
        volatility: 1 + Math.random() * 10,
        volume: 500000 + Math.random() * 5000000,
        price: 10 + Math.random() * 190
      }));

      const startTime = Date.now();
      
      const filtered = largeDataSet.filter(stock => 
        stock.volatility >= 2 && 
        stock.volatility <= 8 && 
        stock.volume >= 1000000 &&
        stock.price >= 20
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(largeDataSet).toHaveLength(500);
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeLessThanOrEqual(largeDataSet.length);
      expect(executionTime).toBeLessThan(100); // 100ms 이하
    });

    test('메모리 효율적인 데이터 처리', () => {
      const testData = {
        before: process.memoryUsage?.()?.heapUsed || 0,
        processLargeArray: () => {
          const largeArray = new Array(1000).fill(0).map((_, i) => ({
            id: i,
            data: `data_${i}`,
            timestamp: Date.now()
          }));
          
          // 메모리 효율적인 처리
          return largeArray
            .filter(item => item.id % 2 === 0)
            .slice(0, 100)
            .map(item => ({ id: item.id, processed: true }));
        }
      };

      const result = testData.processLargeArray();
      const after = process.memoryUsage?.()?.heapUsed || 0;

      expect(result).toHaveLength(100);
      expect(result[0]).toHaveProperty('processed', true);
      
      // 메모리 사용량이 합리적인 범위 내인지 확인
      const memoryIncrease = after - testData.before;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB 이하
    });
  });
});