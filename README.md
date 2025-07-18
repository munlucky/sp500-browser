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
- **스마트 캐싱**: 돌파/대기 종목 자동 캐시 처리
- **Yahoo Finance 연결**: 안정적인 데이터 소스 연결 보장

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

### 아키텍처
- **서비스 계층**: APIManager, DataCollector, Scanner, StockAnalyzer, StorageManager
- **컴포넌트 계층**: AutoUpdater, DashboardComponent, NotificationComponent, SettingsComponent, UIRenderer
- **핵심 계층**: DIContainer, EventBus, ErrorHandler, 호환성 레이어
- **테스트 인프라**: Jest 기반 유닛 테스트, 통합 테스트 자동화

### 데이터 소스
- **Yahoo Finance API**: 실시간 주식 데이터 (기본 소스)
- **CORS 프록시**: `api.allorigins.win`을 통한 CORS 우회
- **Wikipedia API**: S&P 500 종목 리스트
- **GitHub CSV**: 백업 데이터 소스

### 저장 시스템
- **Local Storage**: 설정, 스캔 결과, 로그 데이터 저장
- **캐시 시스템**: 7일 TTL로 S&P 500 종목 리스트 캐시, 돌파/대기 종목 캐시
- **설정 관리**: 사용자 설정 자동 저장/복원
- **자동 캐시 정리**: 어제 날짜 데이터 자동 삭제

## 📊 코드 구조

### 주요 파일 구조
```
sp500-browser/
├── index.html                 # 메인 HTML 파일
├── index-production.html      # 프로덕션 빌드용 HTML
├── package.json              # NPM 의존성 및 스크립트
├── jest.config.js            # Jest 테스트 설정
├── claude-code-review.yml    # 코드 리뷰 자동화 설정
├── css/
│   └── style.css              # 스타일시트
├── js/
│   ├── app.js                 # 앱 메인 초기화 및 이벤트 관리
│   ├── scanner.js             # 메인 스캐너 로직 (레거시)
│   ├── calculator.js          # 변동성 계산 로직
│   ├── breakout-tracker.js    # 돌파 추적 시스템
│   ├── logger.js              # 로깅 시스템
│   ├── notifications.js       # 알림 시스템
│   ├── sector-analyzer.js     # 섹터별 분석 도구
│   ├── services/              # 서비스 계층
│   │   ├── APIManager.js      # API 호출 관리
│   │   ├── DataCollector.js   # 데이터 수집 서비스
│   │   ├── Scanner.js         # 스캔 서비스
│   │   ├── StockAnalyzer.js   # 주식 분석 서비스
│   │   └── StorageManager.js  # 저장소 관리 서비스
│   ├── components/            # UI 컴포넌트
│   │   ├── AutoUpdater.js     # 자동 업데이트 컴포넌트
│   │   ├── DashboardComponent.js # 대시보드 컴포넌트
│   │   ├── NotificationComponent.js # 알림 컴포넌트
│   │   ├── SettingsComponent.js # 설정 컴포넌트
│   │   └── UIRenderer.js      # UI 렌더링 컴포넌트
│   ├── core/                  # 핵심 시스템
│   │   ├── DIContainer.js     # 의존성 주입 컨테이너
│   │   ├── EventBus.js        # 이벤트 버스 시스템
│   │   ├── compatibility-layer.js # 호환성 레이어
│   │   ├── integration-test.js # 통합 테스트
│   │   ├── phase1-test.js     # 1단계 테스트
│   │   ├── phase2-test.js     # 2단계 테스트
│   │   └── phase3-test.js     # 3단계 테스트
│   ├── errors/                # 에러 처리
│   │   ├── AppError.js        # 앱 에러 클래스
│   │   └── ErrorHandler.js    # 에러 핸들러
│   ├── tests/                 # 개발 도구
│   │   ├── development-tools.js # 개발 도구
│   │   └── test-cleanup.js    # 테스트 정리 도구
│   └── utils/                 # 유틸리티
│       ├── constants.js       # 상수 정의
│       └── index.js           # 유틸리티 인덱스
├── tests/                     # Jest 테스트 파일
│   ├── README.md              # 테스트 문서
│   ├── core-features.test.js  # 핵심 기능 테스트
│   └── simple.test.js         # 간단한 테스트
├── icons/                     # PWA 아이콘
├── sw.js                      # Service Worker (PWA)
├── manifest.json              # Web App Manifest
└── README.md                  # 프로젝트 문서
```

### 핵심 아키텍처

#### 1. App (`app.js`)
앱의 메인 초기화 및 이벤트 관리를 담당합니다.

```javascript
class App {
    constructor() {
        this.scanner = null;
        this.breakoutTracker = null;
        this.isInitialized = false;
    }

    async init() {
        // 브라우저 호환성 확인
        this.checkBrowserCompatibility();
        
        // 필수 클래스 로드 확인
        this.checkRequiredClasses();
        
        // 캐시된 결과 로드
        this.loadCachedResults();
        
        // 캐시 정리 (어제 날짜 데이터 삭제)
        StorageManager.initializeCacheCleanup();
        
        // 스캐너 초기화
        this.scanner = await initScanner();
        
        // 돌파 추적 시스템 초기화
        this.breakoutTracker = new BreakoutTracker();
        
        // 자동 업데이트 복원
        this.restoreAutoUpdateState();
        
        this.isInitialized = true;
    }
}
```

#### 2. 서비스 계층 (`services/`)
비즈니스 로직을 담당하는 서비스들입니다.

```javascript
// APIManager.js - API 호출 관리
class APIManager {
    constructor() {
        this.cacheManager = new CacheManager();
        this.rateLimiter = new RateLimiter();
    }

    async fetchStockData(ticker) {
        // 캐시 확인 → API 호출 → 결과 캐싱
        const cachedData = await this.cacheManager.get(ticker);
        if (cachedData) return cachedData;
        
        const data = await this.rateLimiter.execute(() => 
            this.fetchFromYahooFinance(ticker)
        );
        
        await this.cacheManager.set(ticker, data);
        return data;
    }
}

// Scanner.js - 스캔 서비스
class Scanner {
    constructor(apiManager, stockAnalyzer) {
        this.apiManager = apiManager;
        this.stockAnalyzer = stockAnalyzer;
    }

    async scanStocks(tickers, settings) {
        const results = { breakoutStocks: [], waitingStocks: [] };
        
        for (const ticker of tickers) {
            const stockData = await this.apiManager.fetchStockData(ticker);
            const analysis = await this.stockAnalyzer.analyze(stockData, settings);
            
            if (analysis.hasBreakout) {
                results.breakoutStocks.push(analysis);
            } else if (analysis.isNearBreakout) {
                results.waitingStocks.push(analysis);
            }
        }
        
        return results;
    }
}
```

#### 3. 컴포넌트 계층 (`components/`)
UI 컴포넌트들을 관리합니다.

```javascript
// DashboardComponent.js - 대시보드 UI
class DashboardComponent {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.setupEventListeners();
    }

    render(data) {
        this.renderBreakoutStocks(data.breakoutStocks);
        this.renderWaitingStocks(data.waitingStocks);
        this.updateStats(data);
    }

    setupEventListeners() {
        this.eventBus.on('scan-complete', (data) => this.render(data));
        this.eventBus.on('breakout-detected', (stock) => this.highlightBreakout(stock));
    }
}

// AutoUpdater.js - 자동 업데이트 컴포넌트
class AutoUpdater {
    constructor(scanner, eventBus) {
        this.scanner = scanner;
        this.eventBus = eventBus;
        this.isRunning = false;
        this.interval = null;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.interval = setInterval(() => {
            this.performUpdate();
        }, 60000); // 1분마다
    }

    async performUpdate() {
        const trackedStocks = StorageManager.getTrackedStocks();
        const updates = await this.scanner.quickScan(trackedStocks);
        
        this.eventBus.emit('auto-update-complete', updates);
    }
}
```

#### 4. 핵심 시스템 (`core/`)
앱의 핵심 인프라를 제공합니다.

```javascript
// DIContainer.js - 의존성 주입
class DIContainer {
    constructor() {
        this.dependencies = new Map();
    }

    register(name, factory) {
        this.dependencies.set(name, { factory, instance: null });
    }

    resolve(name) {
        const dep = this.dependencies.get(name);
        if (!dep) throw new Error(`Dependency ${name} not found`);
        
        if (!dep.instance) {
            dep.instance = dep.factory();
        }
        
        return dep.instance;
    }
}

// EventBus.js - 이벤트 시스템
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
    }
}

// ErrorHandler.js - 에러 처리
class ErrorHandler {
    static handle(error, context = '') {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        };
        
        console.error('🚨 Error:', errorInfo);
        
        // 에러 로깅 및 리포팅
        Logger.error('Application Error', errorInfo);
        
        // 사용자 친화적 에러 메시지 표시
        this.showUserFriendlyError(error);
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
            autoUpdateEnabled: false   // 자동 업데이트 기본값
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

### Jest 기반 테스트 환경
프로젝트는 Jest를 사용한 자동화된 테스트 환경을 구축했습니다.

```bash
# 테스트 실행
npm test

# 테스트 감시 모드 (개발 중)
npm run test:watch

# 코드 커버리지 확인
npm run test:coverage
```

### 테스트 구조
```
tests/
├── core-features.test.js    # 핵심 기능 테스트
├── simple.test.js           # 간단한 유닛 테스트
└── README.md                # 테스트 문서

js/core/
├── integration-test.js      # 통합 테스트
├── phase1-test.js           # 1단계 테스트 (초기화)
├── phase2-test.js           # 2단계 테스트 (스캔)
└── phase3-test.js           # 3단계 테스트 (자동 업데이트)
```

### 통합 테스트
앱 실행 시 단계별로 기능을 테스트합니다.

```javascript
// Phase 1: 초기화 테스트
async function testInitialization() {
    // 필수 클래스 로드 확인
    const requiredClasses = ['App', 'Scanner', 'APIManager', 'StorageManager'];
    
    for (const className of requiredClasses) {
        if (typeof window[className] === 'undefined') {
            throw new Error(`${className} 클래스가 로드되지 않았습니다.`);
        }
    }
    
    // 의존성 주입 컨테이너 테스트
    const container = new DIContainer();
    container.register('apiManager', () => new APIManager());
    
    const apiManager = container.resolve('apiManager');
    return apiManager instanceof APIManager;
}

// Phase 2: 스캔 기능 테스트
async function testScanningFeatures() {
    const scanner = new Scanner();
    
    // 테스트 데이터로 스캔 실행
    const testTickers = ['AAPL', 'GOOGL', 'MSFT'];
    const results = await scanner.scanStocks(testTickers, {
        volatilityMax: 0.08,
        minVolume: 1000000
    });
    
    return results && 
           Array.isArray(results.breakoutStocks) && 
           Array.isArray(results.waitingStocks);
}

// Phase 3: 자동 업데이트 테스트
async function testAutoUpdateSystem() {
    const eventBus = new EventBus();
    const autoUpdater = new AutoUpdater(scanner, eventBus);
    
    // 이벤트 리스너 테스트
    let eventReceived = false;
    eventBus.on('auto-update-complete', () => {
        eventReceived = true;
    });
    
    // 자동 업데이트 실행
    await autoUpdater.performUpdate();
    
    return eventReceived;
}
```

### 에러 처리 테스트
```javascript
// 에러 시나리오 테스트
describe('Error Handling', () => {
    test('API 호출 실패 시 적절한 에러 처리', async () => {
        const apiManager = new APIManager();
        
        // 잘못된 티커로 API 호출
        try {
            await apiManager.fetchStockData('INVALID_TICKER');
        } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            expect(error.code).toBe('API_ERROR');
        }
    });
    
    test('네트워크 오류 시 캐시 데이터 사용', async () => {
        const apiManager = new APIManager();
        
        // 캐시된 데이터 먼저 저장
        await apiManager.cacheManager.set('AAPL', mockStockData);
        
        // 네트워크 오류 시뮬레이션
        jest.spyOn(apiManager, 'fetchFromYahooFinance')
            .mockRejectedValue(new Error('Network Error'));
        
        const result = await apiManager.fetchStockData('AAPL');
        expect(result).toEqual(mockStockData);
    });
});
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

### API 설정
현재 Yahoo Finance API를 사용하여 주식 데이터를 제공합니다. 별도의 API 키 설정 없이 사용할 수 있습니다.

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

# 의존성 설치
npm install

# 테스트 실행
npm test

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