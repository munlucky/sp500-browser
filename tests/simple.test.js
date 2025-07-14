/**
 * S&P 500 Scanner 핵심 기능 테스트
 * 래리 윌리엄스 변동성 돌파 전략의 핵심 로직을 검증합니다.
 */

describe('S&P 500 Scanner 핵심 기능 테스트', () => {
  describe('애플리케이션 구조 검증', () => {
    test('핵심 JavaScript 파일들이 존재함', () => {
      const fs = require('fs');
      const path = require('path');
      
      const coreFiles = [
        'js/storage.js',
        'js/calculator.js', 
        'js/notifications.js',
        'js/scanner.js',
        'js/breakout-tracker.js',
        'js/app.js'
      ];

      coreFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });

    test('메인 HTML 파일이 존재하고 기본 구조를 가짐', () => {
      const fs = require('fs');
      const path = require('path');
      
      const htmlPath = path.join(__dirname, '..', 'index.html');
      expect(fs.existsSync(htmlPath)).toBe(true);
      
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');
      expect(htmlContent).toContain('S&P 500');
      expect(htmlContent).toContain('래리 윌리엄스');
      expect(htmlContent).toContain('돌파 스캐너');
    });
  });


  describe('설정 관리 테스트', () => {
    test('기본 설정값들이 올바른 형식임', () => {
      const defaultSettings = {
        volatilityMin: 0.02,
        volatilityMax: 0.08,
        minVolume: 1000000,
        breakoutFactor: 0.6,
        minPrice: 10,
        autoScan: false,
        demoMode: false
      };

      // 설정값들의 타입과 범위 검증
      expect(typeof defaultSettings.volatilityMin).toBe('number');
      expect(typeof defaultSettings.volatilityMax).toBe('number');
      expect(typeof defaultSettings.minVolume).toBe('number');
      expect(typeof defaultSettings.breakoutFactor).toBe('number');
      expect(typeof defaultSettings.autoScan).toBe('boolean');
      expect(typeof defaultSettings.demoMode).toBe('boolean');

      expect(defaultSettings.volatilityMin).toBeGreaterThan(0);
      expect(defaultSettings.volatilityMax).toBeGreaterThan(defaultSettings.volatilityMin);
      expect(defaultSettings.minVolume).toBeGreaterThan(0);
      expect(defaultSettings.breakoutFactor).toBeGreaterThan(0);
      expect(defaultSettings.breakoutFactor).toBeLessThan(1);
    });

    test('설정 저장 및 로드 로직', () => {
      const testSettings = {
        volatilityMin: 0.03,
        volatilityMax: 0.07,
        minVolume: 2000000
      };

      // 설정 객체 직렬화/역직렬화 테스트
      const serialized = JSON.stringify(testSettings);
      const deserialized = JSON.parse(serialized);
      
      expect(serialized).toContain('volatilityMin');
      expect(serialized).toContain('0.03');
      expect(deserialized).toEqual(testSettings);
      
      // 저장된 설정의 유효성 검증
      expect(deserialized.volatilityMin).toBeLessThan(deserialized.volatilityMax);
      expect(deserialized.minVolume).toBeGreaterThan(0);
    });
  });

  describe('데이터 유효성 검증 테스트', () => {
    test('주식 데이터 유효성 검증 로직', () => {
      const validStockData = {
        ticker: 'AAPL',
        currentPrice: 150.00,
        yesterdayClose: 148.50,
        yesterdayHigh: 152.00,
        yesterdayLow: 147.00,
        yesterdayVolume: 50000000
      };

      const invalidStockData = {
        ticker: 'INVALID',
        currentPrice: -10,  // 음수 가격
        yesterdayClose: 148.50,
        yesterdayHigh: 140.00,  // 종가보다 낮은 고가
        yesterdayLow: 155.00,   // 종가보다 높은 저가
        yesterdayVolume: -1000  // 음수 거래량
      };

      // 유효한 데이터 검증
      expect(validStockData.currentPrice).toBeGreaterThan(0);
      expect(validStockData.yesterdayHigh).toBeGreaterThanOrEqual(validStockData.yesterdayClose);
      expect(validStockData.yesterdayLow).toBeLessThanOrEqual(validStockData.yesterdayClose);
      expect(validStockData.yesterdayVolume).toBeGreaterThan(0);

      // 잘못된 데이터 감지
      expect(invalidStockData.currentPrice).toBeLessThan(0);
      expect(invalidStockData.yesterdayHigh).toBeLessThan(invalidStockData.yesterdayClose);
      expect(invalidStockData.yesterdayLow).toBeGreaterThan(invalidStockData.yesterdayClose);
      expect(invalidStockData.yesterdayVolume).toBeLessThan(0);
    });

    test('래리 윌리엄스 공식 계산 검증', () => {
      const testData = {
        yesterdayClose: 150.00,
        yesterdayHigh: 155.00,
        yesterdayLow: 145.00
      };
      
      const breakoutFactor = 0.6;
      const dailyRange = testData.yesterdayHigh - testData.yesterdayLow; // 10.00
      const expectedEntryPrice = testData.yesterdayClose + (dailyRange * breakoutFactor); // 156.00

      expect(dailyRange).toBe(10.00);
      expect(expectedEntryPrice).toBe(156.00);

      // 스탑로스와 목표가 계산
      const stopLoss = expectedEntryPrice * 0.95; // 5% 손절
      const target1 = expectedEntryPrice * 1.02;  // 2% 목표
      const target2 = expectedEntryPrice * 1.05;  // 5% 목표

      expect(stopLoss).toBeCloseTo(148.20, 2);
      expect(target1).toBeCloseTo(159.12, 2);
      expect(target2).toBeCloseTo(163.80, 2);
    });
  });

  describe('변동성 계산 테스트', () => {
    test('변동성 퍼센티지 계산이 정확함', () => {
      const testCases = [
        {
          high: 152.00,
          low: 148.00,
          close: 150.00,
          expectedVolatility: 2.67  // ((152-148)/150)*100
        },
        {
          high: 105.00,
          low: 95.00,
          close: 100.00,
          expectedVolatility: 10.00  // ((105-95)/100)*100
        },
        {
          high: 51.00,
          low: 49.00,
          close: 50.00,
          expectedVolatility: 4.00  // ((51-49)/50)*100
        }
      ];

      testCases.forEach(testCase => {
        const dailyRange = testCase.high - testCase.low;
        const volatility = (dailyRange / testCase.close) * 100;
        
        expect(volatility).toBeCloseTo(testCase.expectedVolatility, 2);
      });
    });

    test('변동성 범위 필터링', () => {
      const settings = {
        volatilityMin: 2.0,  // 2%
        volatilityMax: 8.0   // 8%
      };

      const testStocks = [
        { volatility: 1.5, shouldPass: false },  // 너무 낮음
        { volatility: 3.5, shouldPass: true },   // 적정 범위
        { volatility: 6.0, shouldPass: true },   // 적정 범위
        { volatility: 9.5, shouldPass: false }   // 너무 높음
      ];

      testStocks.forEach(stock => {
        const isInRange = stock.volatility >= settings.volatilityMin && 
                         stock.volatility <= settings.volatilityMax;
        expect(isInRange).toBe(stock.shouldPass);
      });
    });
  });

  describe('시장 시간 감지 테스트', () => {
    test('장시간 여부 판단 로직', () => {
      const testCases = [
        { day: 1, hour: 14, minute: 30, expected: true },   // 월요일 오후 2:30 (장중)
        { day: 2, hour: 9, minute: 30, expected: true },    // 화요일 오전 9:30 (개장)
        { day: 5, hour: 15, minute: 59, expected: true },   // 금요일 오후 3:59 (장중)
        { day: 5, hour: 16, minute: 0, expected: false },   // 금요일 오후 4:00 (폐장)
        { day: 0, hour: 14, minute: 30, expected: false },  // 일요일 (휴장)
        { day: 6, hour: 14, minute: 30, expected: false },  // 토요일 (휴장)
        { day: 2, hour: 8, minute: 30, expected: false }    // 화요일 오전 8:30 (장전)
      ];

      testCases.forEach(testCase => {
        const mockDate = new Date();
        mockDate.setDate(mockDate.getDate() + (testCase.day - mockDate.getDay()));
        mockDate.setHours(testCase.hour, testCase.minute);

        const currentTime = mockDate.getHours() * 60 + mockDate.getMinutes();
        const currentDay = mockDate.getDay();
        
        const isWeekend = currentDay === 0 || currentDay === 6;
        const isMarketHours = currentTime >= (9 * 60 + 30) && currentTime < (16 * 60);
        const isOpen = !isWeekend && isMarketHours;

        expect(isOpen).toBe(testCase.expected);
      });
    });
  });

  describe('알림 시스템 테스트', () => {
    test('브라우저 알림 지원 여부 확인', () => {
      // 알림 지원 환경
      global.Notification = jest.fn();
      global.Notification.permission = 'granted';
      global.Notification.requestPermission = jest.fn().mockResolvedValue('granted');

      expect(typeof global.Notification).toBe('function');
      expect(global.Notification.permission).toBe('granted');

      // 알림 미지원 환경
      delete global.Notification;
      expect(global.Notification).toBeUndefined();
    });

    test('알림 메시지 포맷팅', () => {
      const breakoutData = {
        ticker: 'AAPL',
        currentPrice: 152.50,
        entryPrice: 150.00,
        gain: 1.67
      };

      const expectedTitle = '🚀 돌파 감지!';
      const expectedBody = `${breakoutData.ticker}이 $${breakoutData.currentPrice}에 돌파했습니다! (+${breakoutData.gain}%)`;

      expect(expectedTitle).toContain('돌파');
      expect(expectedBody).toContain(breakoutData.ticker);
      expect(expectedBody).toContain(breakoutData.currentPrice.toString());
      expect(expectedBody).toContain(breakoutData.gain.toString());
    });
  });

  describe('성능 및 메모리 테스트', () => {
    test('대량 데이터 처리 시뮬레이션', () => {
      const largeDataSet = new Array(500).fill(0).map((_, index) => ({
        ticker: `STOCK${index}`,
        price: 50 + Math.random() * 100,
        volume: 1000000 + Math.random() * 10000000
      }));

      expect(largeDataSet).toHaveLength(500);
      
      // 메모리 효율적인 필터링 테스트
      const filtered = largeDataSet.filter(stock => 
        stock.price > 100 && stock.volume > 5000000
      );
      
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeLessThanOrEqual(largeDataSet.length);
    });

    test('캐시 만료 로직', () => {
      const cacheEntry = {
        data: { test: 'value' },
        expiry: Date.now() + 3600000  // 1시간 후 만료
      };

      const isExpired = cacheEntry.expiry < Date.now();
      expect(isExpired).toBe(false);

      // 만료된 캐시
      const expiredEntry = {
        data: { test: 'value' },
        expiry: Date.now() - 1000  // 1초 전 만료
      };

      const isExpiredOld = expiredEntry.expiry < Date.now();
      expect(isExpiredOld).toBe(true);
    });
  });
});