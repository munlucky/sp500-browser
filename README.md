# 📈 S&P 500 스마트 스캐너

래리 윌리엄스(Larry Williams) 변동성 돌파 전략을 구현한 **실시간 S&P 500 주식 스캐너**입니다.

![S&P 500 Scanner](https://img.shields.io/badge/S%26P%20500-Scanner-blue?style=for-the-badge&logo=chart.js)
![Larry Williams Strategy](https://img.shields.io/badge/Larry%20Williams-Strategy-green?style=for-the-badge)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge&logo=pwa)

## 🎯 주요 기능

### 📊 래리 윌리엄스 돌파 전략
- **진입가 공식**: `전일 종가 + (전일 고가 - 전일 저가) × 0.6`
- **변동성 필터링**: 2-8% 일일 변동성 범위 내 종목 선별
- **거래량 조건**: 100만주 이상 거래량 필터링
- **리스크 관리**: 자동 손절가(-5%) 및 목표가(+2%, +5%) 계산

### 🔍 스마트 스캔 시스템
- **순차 API 호출**: 429 에러 방지를 위한 1초 간격 순차 처리
- **데이터 중복 제거**: 한 번 가져온 데이터 재사용으로 성능 최적화
- **실시간 진행률**: 스캔 진행 상황 실시간 표시
- **배치 처리**: 50개씩 배치로 나누어 안정적 처리

### 🔄 자동 업데이트 시스템
- **발견된 종목 추적**: 돌파/대기 종목만 선별적 실시간 추적
- **1분 간격 업데이트**: 전체 스캔 없이 필요한 종목만 업데이트
- **동적 상태 변경**: 대기 종목이 돌파 시 자동 상태 변경
- **API 절약**: 500번 → 10-50번으로 대폭 감소

### 📱 Progressive Web App (PWA)
- **오프라인 지원**: 캐시된 데이터로 오프라인에서도 분석 가능
- **모바일 최적화**: 반응형 디자인으로 모든 기기에서 사용
- **앱 설치**: 홈 화면에 설치하여 네이티브 앱처럼 사용
- **푸시 알림**: 중요한 돌파 이벤트 즉시 알림

## 🚀 빠른 시작

### 1. 프로젝트 클론
```bash
git clone https://github.com/munlucky/sp500-browser.git
cd sp500-browser
```

### 2. 웹 서버 실행
```bash
# Python 3 사용
python -m http.server 8000

# 또는 Node.js 사용
npx http-server

# 또는 Live Server 확장 프로그램 사용 (VS Code)
```

### 3. 브라우저에서 접속
```
http://localhost:8000
```

## 📋 사용법

### 기본 워크플로우
1. **스마트 스캔 실행**: S&P 500 전체 종목을 순차적으로 스캔
2. **돌파/대기 종목 확인**: 조건에 맞는 종목들이 자동 분류
3. **자동 업데이트**: 발견된 종목들만 1분마다 실시간 추적
4. **브라우저 알림**: 돌파 발생 시 즉시 알림 수신

### 주요 버튼 설명
- **🚀 스마트 스캔 시작**: 래리 윌리엄스 전략으로 S&P 500 전체 스캔
- **🔍 재확인**: 저장된 종목들만 다시 확인 (빠른 업데이트)
- **⏸️ 자동 업데이트**: 발견된 종목들의 실시간 추적 ON/OFF
- **📋 로그**: 실시간 로그 패널 열기/닫기

### 설정 옵션
- **변동성 범위**: 2-10% (기본값: 2-6%)
- **최소 거래량**: 50만주-500만주 (기본값: 100만주)
- **최소 가격**: $1-$100 (기본값: $10)
- **데모 모드**: 실제 API 없이 테스트 데이터 사용

## 🔧 기술 스택

### Frontend
- **Vanilla JavaScript**: 모던 ES6+ 문법, 클래스 기반 구조
- **CSS3**: Flexbox, Grid, 반응형 디자인
- **HTML5**: 시맨틱 마크업, PWA 지원

### 데이터 소스
- **Yahoo Finance API**: 실시간 주식 데이터 (기본 소스)
- **CORS 프록시**: `api.allorigins.win`을 통한 CORS 우회
- **Wikipedia API**: S&P 500 종목 리스트
- **GitHub CSV**: 백업 데이터 소스

### 저장 시스템
- **Local Storage**: 설정, 스캔 결과, 로그 데이터 저장
- **캐시 시스템**: 7일 TTL로 S&P 500 종목 리스트 캐시
- **설정 관리**: 사용자 설정 자동 저장/복원

## 📊 코드 구조

### 주요 파일 구조
```
sp500-browser/
├── index.html                 # 메인 HTML 파일
├── css/
│   └── style.css              # 스타일시트
├── js/
│   ├── scanner.js             # 메인 스캐너 로직
│   ├── calculator.js          # 변동성 계산 로직
│   ├── storage.js             # 로컬 스토리지 관리
│   ├── api-manager.js         # API 호출 관리
│   ├── logger.js              # 로깅 시스템
│   ├── smart-scanner.js       # 스마트 스캔 전략
│   ├── breakout-tracker.js    # 돌파 추적 시스템
│   └── notifications.js       # 알림 시스템
├── sw.js                      # Service Worker (PWA)
├── manifest.json              # Web App Manifest
└── README.md                  # 프로젝트 문서
```

### 핵심 클래스

#### 1. StockScanner (`scanner.js`)
메인 스캐너 클래스로 전체 시스템을 관리합니다.

```javascript
class StockScanner {
    constructor() {
        this.sp500Tickers = [];        // S&P 500 종목 리스트
        this.demoMode = true;          // 데모 모드 플래그
        this.isScanning = false;       // 스캔 중 상태
        this.autoUpdateEnabled = false; // 자동 업데이트 상태
        this.lastScanResults = null;   // 마지막 스캔 결과
    }

    // 스마트 스캔 실행
    async smartScanStocks() {
        const results = await window.smartScanner.adaptiveScan(this.sp500Tickers);
        this.displayResults(results);
        this.lastScanResults = results;
        StorageManager.saveResults(results);
    }

    // 주식 데이터 가져오기
    async fetchStockData(ticker) {
        if (this.demoMode) {
            return this.generateDemoData(ticker);
        }
        // Yahoo Finance API 호출
        const apiManager = new window.APIManager();
        return await apiManager.fetchStockData(ticker);
    }

    // 주식 분석 실행
    async analyzeStock(ticker, settings, preLoadedData = null) {
        // 데이터 가져오기 (중복 호출 방지)
        const stockData = preLoadedData || await this.fetchStockData(ticker);
        
        // 변동성 계산
        const calculation = VolatilityCalculator.calculate(stockData, settings);
        
        // 결과 반환
        return {
            ticker,
            currentPrice: stockData.currentPrice,
            entryPrice: calculation.entryPrice,
            breakoutSignal: calculation.hasBreakout ? 'breakout' : 'waiting'
        };
    }
}
```

#### 2. SmartScanner (`smart-scanner.js`)
효율적인 스캔 전략을 관리합니다.

```javascript
class SmartScanner {
    constructor() {
        this.batchSizes = {
            premium: 500,  // 배치 크기
            standard: 100,
            basic: 50
        };
    }

    // 적응형 스캔 실행
    async adaptiveScan(allTickers) {
        const strategy = this.determineOptimalStrategy();
        const results = await this.scanInBatches(allTickers, strategy.batchSize);
        return results;
    }

    // 배치 스캔 실행
    async scanInBatches(tickers, batchSize = 50) {
        const results = { breakoutStocks: [], waitingStocks: [], errors: 0 };
        
        for (let batchIndex = 0; batchIndex < Math.ceil(tickers.length / batchSize); batchIndex++) {
            const batchTickers = tickers.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
            
            // 순차 처리 (429 에러 방지)
            for (let i = 0; i < batchTickers.length; i++) {
                const ticker = batchTickers[i];
                
                if (i > 0) await this.delay(1000); // 1초 딜레이
                
                const stockData = await window.stockScanner.fetchStockData(ticker);
                if (stockData) {
                    const result = await window.stockScanner.analyzeStock(ticker, settings, stockData);
                    if (result?.breakoutSignal === 'breakout') {
                        results.breakoutStocks.push(result);
                    } else if (result?.breakoutSignal === 'waiting') {
                        results.waitingStocks.push(result);
                    }
                }
            }
        }
        
        return results;
    }
}
```

#### 3. VolatilityCalculator (`calculator.js`)
래리 윌리엄스 변동성 돌파 공식을 구현합니다.

```javascript
class VolatilityCalculator {
    static calculate(stockData, settings) {
        const { currentPrice, yesterdayClose, yesterdayHigh, yesterdayLow, volume } = stockData;
        
        // 일일 변동성 계산
        const dailyRange = yesterdayHigh - yesterdayLow;
        const volatility = (dailyRange / yesterdayClose) * 100;
        
        // 래리 윌리엄스 진입가 공식
        const entryPrice = yesterdayClose + (dailyRange * 0.6);
        
        // 리스크 관리
        const stopLoss = entryPrice * 0.95;    // 5% 손절
        const target1 = entryPrice * 1.02;     // 2% 목표
        const target2 = entryPrice * 1.05;     // 5% 목표
        
        // 조건 확인
        const conditions = {
            volatilityOk: volatility >= 2 && volatility <= settings.volatilityMax * 100,
            volumeOk: volume >= settings.minVolume,
            priceOk: currentPrice >= settings.minPrice,
            hasBreakout: currentPrice >= entryPrice
        };
        
        return {
            entryPrice,
            stopLoss,
            target1,
            target2,
            volatility,
            hasBreakout: conditions.hasBreakout,
            isNearBreakout: !conditions.hasBreakout && (currentPrice / entryPrice) > 0.98,
            conditions
        };
    }
}
```

#### 4. StorageManager (`storage.js`)
로컬 스토리지 관리를 담당합니다.

```javascript
class StorageManager {
    static KEYS = {
        RESULTS: 'sp500_results',
        SETTINGS: 'sp500_settings',
        CACHE: 'sp500_cache'
    };

    static saveResults(results) {
        const data = {
            ...results,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(this.KEYS.RESULTS, JSON.stringify(data));
    }

    static getResults() {
        const data = localStorage.getItem(this.KEYS.RESULTS);
        return data ? JSON.parse(data) : null;
    }

    static getSettings() {
        const data = localStorage.getItem(this.KEYS.SETTINGS);
        return data ? JSON.parse(data) : {
            volatilityMax: 0.06,      // 6% 최대 변동성
            minVolume: 1000000,       // 100만주 최소 거래량
            minPrice: 10,             // $10 최소 가격
            demoMode: true,           // 데모 모드 기본값
            autoUpdateEnabled: true   // 자동 업데이트 기본값
        };
    }

    static updateSettings(updates) {
        const current = this.getSettings();
        this.saveSettings({ ...current, ...updates });
    }
}
```

## 📊 래리 윌리엄스 전략 상세

### 핵심 원리
래리 윌리엄스의 변동성 돌파 전략은 **횡보 후 변동성 돌파**를 이용한 단기 매매 기법입니다.

### 진입 조건
```javascript
// 돌파 진입가 계산
const dailyRange = yesterdayHigh - yesterdayLow;
const entryPrice = yesterdayClose + (dailyRange * 0.6);

// 변동성 조건 (2-8%)
const volatility = (dailyRange / yesterdayClose) * 100;
const isValidVolatility = volatility >= 2 && volatility <= 8;

// 거래량 조건 (100만주 이상)
const isValidVolume = volume >= 1000000;

// 돌파 확인
const hasBreakout = currentPrice >= entryPrice;
```

### 리스크 관리
```javascript
// 손절 라인 (5% 손실)
const stopLoss = entryPrice * 0.95;

// 목표가 설정
const target1 = entryPrice * 1.02; // 2% 수익
const target2 = entryPrice * 1.05; // 5% 수익

// 위험 보상 비율
const riskReward = (target1 - entryPrice) / (entryPrice - stopLoss);
```

## 🔄 자동 업데이트 시스템

### 효율적인 API 사용
```javascript
// 전체 스캔: 500번 API 호출 (하루 1회)
async smartScanStocks() {
    const results = await smartScanner.adaptiveScan(this.sp500Tickers); // 500개 종목
    this.lastScanResults = results;
}

// 자동 업데이트: 10-50번 API 호출 (1분마다)
async performAutoUpdate() {
    const trackedStocks = [
        ...this.lastScanResults.breakoutStocks,
        ...this.lastScanResults.waitingStocks
    ]; // 보통 10-50개 종목만
    
    for (const stock of trackedStocks) {
        const newPrice = await this.getCurrentPriceOnly(stock.ticker);
        if (newPrice) {
            stock.currentPrice = newPrice;
            // 대기 종목이 돌파 시 자동으로 돌파 목록으로 이동
            this.checkBreakoutTransition(stock);
        }
    }
}
```

### 상태 전환 로직
```javascript
// 대기 종목 → 돌파 종목 자동 전환
checkBreakoutTransition(stock) {
    if (stock.currentPrice >= stock.entryPrice) {
        // 대기 목록에서 제거
        this.lastScanResults.waitingStocks = this.lastScanResults.waitingStocks.filter(
            s => s.ticker !== stock.ticker
        );
        
        // 돌파 목록에 추가
        this.lastScanResults.breakoutStocks.push({
            ...stock,
            breakoutSignal: 'breakout',
            breakoutTime: new Date()
        });
        
        // 알림 발송
        NotificationManager.sendBreakoutAlert([stock]);
    }
}
```

## 🧪 테스트 시스템

### 통합 테스트
앱 실행 시 자동으로 주요 기능들을 테스트합니다.

```javascript
// 데이터 플로우 테스트
async function testDataFlow() {
    // Scanner 인스턴스 확인
    const hasScanner = typeof window.stockScanner !== 'undefined';
    
    // S&P 500 종목 로드 확인
    const hasTickers = Array.isArray(window.stockScanner.sp500Tickers) && 
                      window.stockScanner.sp500Tickers.length > 0;
    
    // 변동성 계산 테스트
    const testData = {
        currentPrice: 150,
        yesterdayClose: 148,
        yesterdayHigh: 152,
        yesterdayLow: 145,
        volume: 1000000
    };
    
    const calculation = VolatilityCalculator.calculate(testData, {
        volatilityMax: 0.08,
        minVolume: 500000
    });
    
    return calculation && typeof calculation.entryPrice === 'number';
}
```

## 📱 PWA 기능

### Service Worker 캐싱
```javascript
// 캐시 전략: 네트워크 우선, 캐시 폴백
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 응답을 캐시에 저장
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => cache.put(event.request, responseClone));
                return response;
            })
            .catch(() => {
                // 네트워크 실패 시 캐시에서 반환
                return caches.match(event.request);
            })
    );
});
```

### 오프라인 지원
- **캐시된 데이터**: 최근 스캔 결과 24시간 보관
- **설정 보존**: 모든 사용자 설정 로컬 저장
- **데모 모드**: 인터넷 없이도 전체 기능 테스트

## 🔔 알림 시스템

### 브라우저 알림
```javascript
// 돌파 알림 발송
function sendBreakoutAlert(stocks) {
    if (Notification.permission === 'granted') {
        stocks.forEach(stock => {
            new Notification(`🚀 ${stock.ticker} 돌파!`, {
                body: `현재가: $${stock.currentPrice.toFixed(2)}\n진입가: $${stock.entryPrice.toFixed(2)}`,
                icon: '/icon-192x192.png',
                tag: stock.ticker,
                requireInteraction: true
            });
        });
    }
}

// 알림 권한 요청
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return false;
}
```

## ⚙️ 설정 가이드

### API 키 설정 (선택사항)
Yahoo Finance API는 무료로 사용할 수 있지만, 백업을 위해 Alpha Vantage API 키를 설정할 수 있습니다.

1. [Alpha Vantage](https://www.alphavantage.co/support/#api-key)에서 무료 API 키 발급
2. `js/scanner.js` 파일의 `apiKey` 변수 수정
3. 하루 500회 요청 제한 (무료 플랜)

### 브라우저 호환성
- **Chrome 80+**: 모든 기능 완벽 지원
- **Firefox 75+**: PWA 기능 제한적 지원
- **Safari 13+**: iOS에서 PWA 설치 가능
- **Edge 80+**: Chrome과 동일한 지원

## 🤝 기여하기

### 개발 환경 설정
```bash
# 저장소 포크 후 클론
git clone https://github.com/YOUR_USERNAME/sp500-browser.git
cd sp500-browser

# 개발 서버 실행
python -m http.server 8000

# 브라우저에서 http://localhost:8000 접속
```

### 기여 가이드라인
1. **이슈 생성**: 버그 리포트나 기능 제안
2. **브랜치 생성**: `feature/your-feature-name`
3. **테스트**: 변경사항이 기존 기능에 영향 없는지 확인
4. **Pull Request**: 상세한 설명과 함께 제출

### 코딩 스타일
- **JavaScript**: ES6+ 모던 문법 사용
- **들여쓰기**: 2 스페이스
- **네이밍**: camelCase 사용
- **주석**: 복잡한 로직에 대한 설명 추가

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 🔗 관련 링크

- **GitHub Repository**: [https://github.com/munlucky/sp500-browser](https://github.com/munlucky/sp500-browser)
- **Alpha Vantage API**: [https://www.alphavantage.co](https://www.alphavantage.co)
- **Yahoo Finance**: [https://finance.yahoo.com](https://finance.yahoo.com)

## ⚠️ 면책 조항

이 애플리케이션은 **교육 및 연구 목적**으로 제작되었습니다.

- **투자 조언 아님**: 실제 투자 결정에 사용하지 마세요
- **데이터 정확성**: 실시간 데이터의 정확성을 보장하지 않습니다
- **투자 위험**: 모든 투자에는 손실 위험이 있습니다
- **개인 책임**: 투자 결정은 본인의 책임하에 하시기 바랍니다

---

<div align="center">

**📈 효율적인 스캔과 스마트한 추적으로 더 나은 투자 결정을! 📈**

Made with ❤️ by [munlucky](https://github.com/munlucky)

</div>