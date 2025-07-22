# Tests 폴더 룰

## 목적
개발 도구와 테스트 유틸리티를 관리하는 폴더입니다.

## 파일 구조
- `development-tools.js` - 개발 도구
- `test-cleanup.js` - 테스트 정리 도구

## 코딩 룰

### 개발 도구 패턴
```javascript
class DevelopmentTools {
    constructor() {
        this.isEnabled = this.isDevelopmentMode();
    }

    isDevelopmentMode() {
        return location.hostname === 'localhost' || 
               location.hostname === '127.0.0.1' ||
               location.search.includes('debug=true');
    }

    log(message, data = null) {
        if (this.isEnabled) {
            console.log(`[DEV] ${message}`, data);
        }
    }

    performance(label, fn) {
        if (!this.isEnabled) return fn();

        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`[PERF] ${label}: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    mock(className, methods = {}) {
        if (!this.isEnabled) return null;

        const mockClass = class {
            constructor() {
                Object.keys(methods).forEach(method => {
                    this[method] = methods[method];
                });
            }
        };

        return mockClass;
    }
}
```

### 테스트 정리 도구
```javascript
class TestCleanup {
    static clearAllCaches() {
        // LocalStorage 정리
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('sp500_test_') || key.startsWith('test_')) {
                localStorage.removeItem(key);
            }
        });

        // 테스트 DOM 요소 정리
        const testElements = document.querySelectorAll('[data-test]');
        testElements.forEach(element => element.remove());

        console.log('✅ Test data cleared');
    }

    static resetToDefaults() {
        // 기본 설정으로 복원
        const defaultSettings = {
            volatilityMax: 0.06,
            minVolume: 1000000,
            minPrice: 10,
            demoMode: true
        };

        localStorage.setItem('sp500_settings', JSON.stringify(defaultSettings));
        console.log('✅ Settings reset to defaults');
    }

    static generateTestData() {
        const testStocks = [
            {
                ticker: 'TEST1',
                currentPrice: 100,
                yesterdayClose: 95,
                yesterdayHigh: 102,
                yesterdayLow: 93,
                volume: 2000000,
                hasBreakout: true
            },
            {
                ticker: 'TEST2',
                currentPrice: 50,
                yesterdayClose: 48,
                yesterdayHigh: 52,
                yesterdayLow: 47,
                volume: 1500000,
                hasBreakout: false
            }
        ];

        localStorage.setItem('sp500_test_data', JSON.stringify(testStocks));
        console.log('✅ Test data generated');
        return testStocks;
    }
}
```

### 모킹 유틸리티
```javascript
class MockGenerator {
    static createStockData(overrides = {}) {
        return {
            ticker: 'MOCK',
            currentPrice: 100,
            yesterdayClose: 95,
            yesterdayHigh: 105,
            yesterdayLow: 90,
            volume: 1000000,
            timestamp: new Date().toISOString(),
            ...overrides
        };
    }

    static createAPIResponse(data, success = true) {
        return {
            success,
            data,
            timestamp: new Date().toISOString(),
            error: success ? null : 'Mock error'
        };
    }

    static mockAPIManager() {
        return {
            fetchStockData: async (ticker) => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return this.createStockData({ ticker });
            },
            
            fetchSP500List: async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
                return ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
            }
        };
    }
}
```

### 디버깅 도구
```javascript
class DebugTools {
    static inspectState() {
        const state = {
            localStorage: this.getLocalStorageData(),
            eventListeners: this.getEventListeners(),
            performance: this.getPerformanceMetrics()
        };

        console.table(state);
        return state;
    }

    static getLocalStorageData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('sp500_')) {
                data[key] = localStorage.getItem(key);
            }
        }
        return data;
    }

    static trace(object, methods = []) {
        methods.forEach(method => {
            const original = object[method];
            object[method] = function(...args) {
                console.log(`[TRACE] ${method} called with:`, args);
                const result = original.apply(this, args);
                console.log(`[TRACE] ${method} returned:`, result);
                return result;
            };
        });
    }

    static benchmark(name, iterations, fn) {
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fn();
            const end = performance.now();
            times.push(end - start);
        }

        const avg = times.reduce((a, b) => a + b) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        console.log(`[BENCHMARK] ${name}:`);
        console.log(`  Average: ${avg.toFixed(2)}ms`);
        console.log(`  Min: ${min.toFixed(2)}ms`);
        console.log(`  Max: ${max.toFixed(2)}ms`);

        return { avg, min, max, times };
    }
}
```

## 금지사항
- 프로덕션 환경에서 테스트 코드 실행 금지
- 테스트 데이터가 실제 데이터와 혼재되지 않도록 명확한 구분 필요
- 테스트 완료 후 정리 과정 생략 금지
- 사용자 데이터를 임의로 수정하는 테스트 금지
- 외부 API에 과도한 테스트 요청 발송 금지