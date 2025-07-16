/**
 * 호환성 레이어
 * 기존 코드와 새로운 리팩토링된 코드 간의 호환성을 제공
 */

// 전역 인스턴스들
let globalEventBus = null;
let globalErrorHandler = null;
let globalContainer = null;
let globalScanner = null;

/**
 * 새로운 리팩토링된 시스템 초기화
 */
function initRefactoredSystem() {
    try {
        // console.log('🔧 리팩토링된 시스템 초기화 시작...');
        
        // 1. 기반 인프라 초기화
        console.log('1. EventBus 초기화...');
        globalEventBus = new EventBus();
        
        console.log('2. ErrorHandler 초기화...');
        globalErrorHandler = new ErrorHandler(globalEventBus, window.logger);
        
        console.log('3. DIContainer 초기화...');
        globalContainer = new DIContainer();
        
        // 2. Core 서비스 등록
        console.log('4. Core 서비스 등록...');
        globalContainer.register('eventBus', () => globalEventBus);
        globalContainer.register('errorHandler', () => globalErrorHandler);
        
        console.log('5. StorageManager 등록...');
        globalContainer.register('storageManager', (container) => 
            new StorageManager(container.resolve('eventBus'), container.resolve('errorHandler'))
        );
        
        console.log('6. APIManager 등록...');
        globalContainer.register('apiManager', (container) =>
            new APIManager(container.resolve('eventBus'), container.resolve('errorHandler'))
        );
        
        // 3. Scanner 모듈 등록
        console.log('7. DataCollector 등록...');
        globalContainer.register('dataCollector', (container) =>
            new DataCollector(
                container.resolve('apiManager'),
                container.resolve('storageManager'),
                container.resolve('eventBus'),
                container.resolve('errorHandler')
            )
        );
        
        console.log('8. StockAnalyzer 등록...');
        globalContainer.register('stockAnalyzer', (container) =>
            new StockAnalyzer(
                window.VolatilityCalculator ? new VolatilityCalculator() : {
                    calculate: (stockData) => ({
                        entryPrice: (stockData.yesterdayClose || 100) * 1.02,
                        volatility: 5.0,
                        hasBreakout: (stockData.currentPrice || 0) > (stockData.yesterdayClose || 100) * 1.02,
                        isNearBreakout: !((stockData.currentPrice || 0) > (stockData.yesterdayClose || 100) * 1.02),
                        riskRewardRatio: 2.0
                    })
                },
                container.resolve('eventBus'),
                container.resolve('errorHandler')
            )
        );
        
        console.log('9. UIRenderer 등록...');
        globalContainer.register('uiRenderer', (container) =>
            new UIRenderer(container.resolve('eventBus'))
        );
        
        console.log('10. AutoUpdater 등록...');
        globalContainer.register('autoUpdater', (container) =>
            new AutoUpdater(
                container.resolve('dataCollector'),
                container.resolve('stockAnalyzer'),
                container.resolve('uiRenderer'),
                container.resolve('eventBus'),
                container.resolve('errorHandler')
            )
        );
        
        console.log('11. Scanner 등록...');
        globalContainer.register('scanner', (container) =>
            new Scanner(
                container.resolve('dataCollector'),
                container.resolve('stockAnalyzer'),
                container.resolve('uiRenderer'),
                container.resolve('autoUpdater'),
                container.resolve('eventBus'),
                container.resolve('errorHandler')
            )
        );
        
        // 4. 인스턴스 생성
        console.log('12. Scanner 인스턴스 생성...');
        globalScanner = globalContainer.resolve('scanner');
        
        // console.log('✅ 리팩토링된 시스템 초기화 완료');
        
        return globalScanner;
        
    } catch (error) {
        console.error('❌ 리팩토링된 시스템 초기화 실패:', error);
        throw error;
    }
}

/**
 * 기존 initScanner 함수 호환성 제공
 */
window.initScanner = function() {
    try {
        return initRefactoredSystem();
    } catch (error) {
        console.error('❌ initScanner 호환성 레이어 실패:', error);
        
        // 폴백: 기존 스캐너 생성 시도
        if (typeof BrowserStockScanner !== 'undefined') {
            console.log('🔄 기존 BrowserStockScanner로 폴백');
            const fallbackScanner = new BrowserStockScanner();
            fallbackScanner.init();
            return fallbackScanner;
        }
        
        throw error;
    }
};

/**
 * 기존 initBreakoutTracker 함수 호환성 제공
 */
window.initBreakoutTracker = function() {
    try {
        if (typeof BreakoutTracker !== 'undefined') {
            const tracker = new BreakoutTracker();
            tracker.init();
            return tracker;
        }
        return null;
    } catch (error) {
        console.error('❌ initBreakoutTracker 실패:', error);
        return null;
    }
};

/**
 * 새로운 시스템 접근을 위한 전역 함수들
 */
window.getRefactoredScanner = () => globalScanner;
window.getGlobalEventBus = () => globalEventBus;
window.getGlobalContainer = () => globalContainer;

/**
 * 스캔 버튼 이벤트 핸들러 업데이트
 */
function updateScanButtonHandler() {
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn && globalScanner) {
        // 기존 이벤트 리스너 제거
        const newBtn = scanBtn.cloneNode(true);
        scanBtn.parentNode.replaceChild(newBtn, scanBtn);
        
        // 새로운 이벤트 리스너 추가
        newBtn.addEventListener('click', async () => {
            try {
                if (globalScanner.isScanning) {
                    console.log('⚠️ 이미 스캔이 진행 중입니다');
                    return;
                }
                
                await globalScanner.scan();
            } catch (error) {
                console.error('❌ 스캔 실행 오류:', error);
                globalErrorHandler?.handle(error, { context: 'scan-button-click' });
            }
        });
        
        console.log('✅ 스캔 버튼 이벤트 핸들러 업데이트됨');
    }
}

/**
 * 자동 업데이트 버튼 이벤트 핸들러 업데이트
 */
function updateAutoUpdateButtonHandler() {
    const autoUpdateBtn = document.getElementById('autoUpdateToggleBtn');
    if (autoUpdateBtn && globalContainer) {
        const autoUpdater = globalContainer.resolve('autoUpdater');
        
        // 기존 이벤트 리스너 제거
        const newBtn = autoUpdateBtn.cloneNode(true);
        autoUpdateBtn.parentNode.replaceChild(newBtn, autoUpdateBtn);
        
        // 새로운 이벤트 리스너 추가
        newBtn.addEventListener('click', () => {
            try {
                autoUpdater.toggle();
            } catch (error) {
                console.error('❌ 자동 업데이트 토글 오류:', error);
                globalErrorHandler?.handle(error, { context: 'auto-update-toggle' });
            }
        });
        
        console.log('✅ 자동 업데이트 버튼 이벤트 핸들러 업데이트됨');
    }
}

// DOM 로드 후 버튼 핸들러 업데이트
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (globalScanner) {
            updateScanButtonHandler();
            updateAutoUpdateButtonHandler();
        }
    }, 1000);
});

console.log('🔧 호환성 레이어 로드됨');