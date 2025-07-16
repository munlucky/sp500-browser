/**
 * 통합 테스트 및 최종 검증
 * 전체 리팩토링된 시스템의 통합 테스트
 */

/**
 * 통합 테스트 실행
 */
async function runIntegrationTest() {
    // console.log('\n🧪 ========== 통합 테스트 시작 ==========');
    
    const testResults = {
        passed: 0,
        failed: 0,
        total: 0,
        details: []
    };
    
    try {
        // 1. 시스템 초기화 테스트
        await testSystemInitialization(testResults);
        
        // 2. 컴포넌트 통합 테스트
        await testComponentIntegration(testResults);
        
        // 3. 데이터 플로우 테스트
        await testDataFlow(testResults);
        
        // 4. 이벤트 시스템 테스트
        await testEventSystem(testResults);
        
        // 5. 오류 처리 테스트
        await testErrorHandling(testResults);
        
        // 6. 성능 테스트
        await testPerformance(testResults);
        
        // 7. 메모리 누수 테스트
        await testMemoryLeaks(testResults);
        
        // 최종 결과 출력
        printTestResults(testResults);
        
    } catch (error) {
        console.error('💥 통합 테스트 실행 중 치명적 오류:', error);
        testResults.details.push({
            category: 'Critical',
            test: 'Integration Test Execution',
            status: 'FAILED',
            error: error.message
        });
    }
    
    return testResults;
}

/**
 * 시스템 초기화 테스트
 */
async function testSystemInitialization(results) {
    console.log('\n1. 시스템 초기화 테스트');
    
    // 1.1 모든 필수 클래스 로드 확인
    const requiredClasses = [
        'Constants', 'EventBus', 'DIContainer', 'ErrorHandler',
        'StorageManager', 'APIManager', 'DataCollector', 'StockAnalyzer',
        'UIRenderer', 'AutoUpdater', 'Scanner',
        'DashboardComponent', 'SettingsComponent', 'NotificationComponent'
    ];
    
    for (const className of requiredClasses) {
        addTestResult(results, '시스템 초기화', `${className} 클래스 로드`, 
            typeof window[className] !== 'undefined', 
            `${className} 클래스가 로드되지 않음`);
    }
    
    // 1.2 전역 인스턴스 확인
    addTestResult(results, '시스템 초기화', 'initScanner 함수 존재', 
        typeof window.initScanner === 'function',
        'initScanner 함수가 정의되지 않음');
    
    // 1.3 Constants 불변성 확인
    const originalValue = Constants.API.RATE_LIMIT_MS;
    Constants.API.RATE_LIMIT_MS = 9999;
    addTestResult(results, '시스템 초기화', 'Constants 불변성', 
        Constants.API.RATE_LIMIT_MS === originalValue,
        'Constants 객체가 수정 가능함');
        
    // 1.4 StorageManager 기능 확인
    try {
        StorageManager.setItem('test_key', 'test_value');
        const retrieved = StorageManager.getItem('test_key');
        addTestResult(results, '시스템 초기화', 'StorageManager 기본 기능',
            retrieved === 'test_value',
            'StorageManager 저장/조회 실패');
        StorageManager.removeItem('test_key');
    } catch (error) {
        addTestResult(results, '시스템 초기화', 'StorageManager 기본 기능', false, error.message);
    }
}

/**
 * 컴포넌트 통합 테스트
 */
async function testComponentIntegration(results) {
    // console.log('\n2. 컴포넌트 통합 테스트');
    
    // 2.1 EventBus 인스턴스 생성 및 통신 테스트
    try {
        const eventBus = new EventBus();
        let eventReceived = false;
        
        eventBus.on('test-event', () => {
            eventReceived = true;
        });
        
        eventBus.emit('test-event');
        
        addTestResult(results, '컴포넌트 통합', 'EventBus 통신',
            eventReceived,
            'EventBus 이벤트 통신 실패');
            
    } catch (error) {
        addTestResult(results, '컴포넌트 통합', 'EventBus 통신', false, error.message);
    }
    
    // 2.2 DIContainer 의존성 주입 테스트
    try {
        const container = new DIContainer();
        container.register('testService', () => ({ name: 'test' }));
        const service = container.resolve('testService');
        
        addTestResult(results, '컴포넌트 통합', 'DIContainer 의존성 주입',
            service && service.name === 'test',
            'DIContainer 의존성 주입 실패');
            
    } catch (error) {
        addTestResult(results, '컴포넌트 통합', 'DIContainer 의존성 주입', false, error.message);
    }
    
    // 2.3 UI 컴포넌트 생성 테스트
    try {
        const eventBus = new EventBus();
        const dashboard = new DashboardComponent(eventBus);
        
        addTestResult(results, '컴포넌트 통합', 'DashboardComponent 생성',
            dashboard instanceof DashboardComponent,
            'DashboardComponent 생성 실패');
            
        dashboard.destroy();
    } catch (error) {
        addTestResult(results, '컴포넌트 통합', 'DashboardComponent 생성', false, error.message);
    }
}

/**
 * 데이터 플로우 테스트
 */
async function testDataFlow(results) {
    console.log('\n3. 데이터 플로우 테스트');
    
    try {
        // 3.1 기존 Scanner 클래스 테스트
        if (typeof window.stockScanner !== 'undefined') {
            addTestResult(results, '데이터 플로우', 'Scanner 인스턴스 확인',
                window.stockScanner !== null,
                'Scanner 인스턴스 없음');
                
            // S&P 500 티커 로드 테스트
            const hasTickers = Array.isArray(window.stockScanner.sp500Tickers) && 
                              window.stockScanner.sp500Tickers.length > 0;
            addTestResult(results, '데이터 플로우', 'S&P 500 티커 로드',
                hasTickers,
                'S&P 500 티커 로드 실패');
        }
        
        // 3.2 StorageManager 테스트
        if (typeof StorageManager !== 'undefined') {
            const testSettings = StorageManager.getSettings();
            addTestResult(results, '데이터 플로우', '설정 로드',
                testSettings && typeof testSettings === 'object',
                '설정 로드 실패');
        }
        
        // 3.3 VolatilityCalculator 테스트
        if (typeof VolatilityCalculator !== 'undefined') {
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
            
            addTestResult(results, '데이터 플로우', '변동성 계산',
                calculation && typeof calculation.entryPrice === 'number',
                '변동성 계산 실패');
        }
            
    } catch (error) {
        addTestResult(results, '데이터 플로우', '데이터 플로우 전체', false, error.message);
    }
}

/**
 * 이벤트 시스템 테스트
 */
async function testEventSystem(results) {
    console.log('\n4. 이벤트 시스템 테스트');
    
    try {
        const eventBus = new EventBus();
        const events = [];
        
        // 4.1 다중 리스너 테스트
        eventBus.on('multi-test', (data) => events.push(`listener1:${data}`));
        eventBus.on('multi-test', (data) => events.push(`listener2:${data}`));
        
        eventBus.emit('multi-test', 'test-data');
        
        addTestResult(results, '이벤트 시스템', '다중 리스너',
            events.length === 2 && events.includes('listener1:test-data') && events.includes('listener2:test-data'),
            '다중 리스너 처리 실패');
        
        // 4.2 이벤트 제거 테스트
        const listenerId = eventBus.on('remove-test', () => events.push('should-not-fire'));
        eventBus.off('remove-test', listenerId);
        eventBus.emit('remove-test');
        
        addTestResult(results, '이벤트 시스템', '이벤트 리스너 제거',
            !events.some(e => e === 'should-not-fire'),
            '이벤트 리스너 제거 실패');
        
        // 4.3 Once 이벤트 테스트
        let onceCount = 0;
        eventBus.once('once-test', () => onceCount++);
        eventBus.emit('once-test');
        eventBus.emit('once-test');
        
        addTestResult(results, '이벤트 시스템', 'Once 이벤트',
            onceCount === 1,
            'Once 이벤트가 여러 번 실행됨');
            
    } catch (error) {
        addTestResult(results, '이벤트 시스템', '이벤트 시스템 전체', false, error.message);
    }
}

/**
 * 오류 처리 테스트
 */
async function testErrorHandling(results) {
    console.log('\n5. 오류 처리 테스트');
    
    try {
        const eventBus = new EventBus();
        const errorHandler = new ErrorHandler(eventBus);
        
        // 5.1 AppError 생성 테스트
        const testError = AppError.networkError('테스트 네트워크 오류');
        
        addTestResult(results, '오류 처리', 'AppError 생성',
            testError instanceof AppError && testError.code === Constants.ERROR_CODES.NETWORK_ERROR,
            'AppError 생성 실패');
        
        // 5.2 오류 핸들러 처리 테스트
        let errorHandled = false;
        eventBus.on(Constants.EVENTS.APP_ERROR, () => {
            errorHandled = true;
        });
        
        errorHandler.handle(testError, { test: true }, false);
        
        // 약간의 지연 후 확인
        await new Promise(resolve => setTimeout(resolve, 100));
        
        addTestResult(results, '오류 처리', 'ErrorHandler 이벤트 발생',
            errorHandled,
            'ErrorHandler 이벤트 발생 실패');
            
    } catch (error) {
        addTestResult(results, '오류 처리', '오류 처리 전체', false, error.message);
    }
}

/**
 * 성능 테스트
 */
async function testPerformance(results) {
    console.log('\n6. 성능 테스트');
    
    try {
        // 6.1 EventBus 성능 테스트
        const eventBus = new EventBus();
        const startTime = performance.now();
        
        // 1000개 이벤트 리스너 등록 및 실행
        for (let i = 0; i < 1000; i++) {
            eventBus.on('perf-test', () => {});
        }
        
        for (let i = 0; i < 100; i++) {
            eventBus.emit('perf-test', i);
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        addTestResult(results, '성능', 'EventBus 대량 처리',
            duration < 1000, // 1초 이내
            `EventBus 성능 저하: ${duration.toFixed(2)}ms`);
        
        // 6.2 StorageManager 성능 테스트
        const storageStartTime = performance.now();
        
        for (let i = 0; i < 100; i++) {
            StorageManager.setItem(`perf_test_${i}`, { data: `test_${i}` });
        }
        
        for (let i = 0; i < 100; i++) {
            StorageManager.getItem(`perf_test_${i}`);
        }
        
        // 정리
        for (let i = 0; i < 100; i++) {
            StorageManager.removeItem(`perf_test_${i}`);
        }
        
        const storageEndTime = performance.now();
        const storageDuration = storageEndTime - storageStartTime;
        
        addTestResult(results, '성능', 'StorageManager 대량 처리',
            storageDuration < 500, // 0.5초 이내
            `StorageManager 성능 저하: ${storageDuration.toFixed(2)}ms`);
            
    } catch (error) {
        addTestResult(results, '성능', '성능 테스트 전체', false, error.message);
    }
}

/**
 * 메모리 누수 테스트
 */
async function testMemoryLeaks(results) {
    console.log('\n7. 메모리 누수 테스트');
    
    try {
        // 7.1 DOM 메모리 누수 테스트
        const initialElements = document.querySelectorAll('*').length;
        
        // 임시 DOM 요소 생성 및 제거
        const testDiv = document.createElement('div');
        testDiv.id = 'memory-test';
        document.body.appendChild(testDiv);
        
        // 요소 제거
        document.body.removeChild(testDiv);
        
        const finalElements = document.querySelectorAll('*').length;
        
        addTestResult(results, '메모리 누수', 'DOM 요소 정리',
            finalElements === initialElements,
            `DOM 요소 누수: ${finalElements - initialElements}개`);
        
        // 7.2 기존 Scanner 메모리 테스트
        if (typeof window.stockScanner !== 'undefined') {
            const hasProperCleanup = typeof window.stockScanner.stopAutoUpdate === 'function';
            
            addTestResult(results, '메모리 누수', 'Scanner 정리 함수 확인',
                hasProperCleanup,
                'Scanner 정리 함수 없음');
        }
        
        // 7.3 로컬 스토리지 메모리 테스트
        const initialStorageSize = JSON.stringify(localStorage).length;
        
        // 테스트 데이터 추가 및 제거
        localStorage.setItem('test_memory', 'test_value');
        localStorage.removeItem('test_memory');
        
        const finalStorageSize = JSON.stringify(localStorage).length;
        
        addTestResult(results, '메모리 누수', '로컬 스토리지 정리',
            finalStorageSize === initialStorageSize,
            `스토리지 메모리 누수: ${finalStorageSize - initialStorageSize}바이트`);
            
    } catch (error) {
        addTestResult(results, '메모리 누수', '메모리 누수 테스트 전체', false, error.message);
    }
}

/**
 * 테스트 결과 추가
 */
function addTestResult(results, category, test, passed, errorMessage = '') {
    results.total++;
    
    if (passed) {
        results.passed++;
        console.log(`  ✅ ${test}`);
    } else {
        results.failed++;
        console.log(`  ❌ ${test}: ${errorMessage}`);
    }
    
    results.details.push({
        category,
        test,
        status: passed ? 'PASSED' : 'FAILED',
        error: passed ? null : errorMessage
    });
}

/**
 * 테스트 결과 출력
 */
function printTestResults(results) {
    // console.log('\n📋 ========== 통합 테스트 결과 ==========');
    console.log(`총 테스트: ${results.total}`);
    console.log(`성공: ${results.passed}`);
    console.log(`실패: ${results.failed}`);
    console.log(`성공률: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    
    if (results.failed > 0) {
        // console.log('\n❌ 실패한 테스트:');
        results.details
            .filter(detail => detail.status === 'FAILED')
            .forEach(detail => {
                console.log(`  ${detail.category} > ${detail.test}: ${detail.error}`);
            });
    }
    
    // 리팩토링 요약 통계
    // console.log('\n📊 ========== 리팩토링 요약 ==========');
    // console.log('✅ 완료된 작업:');
    // console.log('  - Phase 1: 기반 인프라 구축 (DI Container, EventBus, Utils)');
    // console.log('  - Phase 2: Core 모듈 리팩토링 (Error Handler, APIManager, StorageManager)');
    // console.log('  - Phase 3: Scanner 모듈 분할 (DataCollector, StockAnalyzer, UIRenderer, AutoUpdater)');
    // console.log('  - Phase 4: UI 컴포넌트 모듈화 (DashboardComponent, SettingsComponent, NotificationComponent)');
    // console.log('  - Phase 5: 통합 테스트 및 최종 검증');
    
    // console.log('\n🎯 달성된 목표:');
    // console.log('  - 기능 분할 설계: 모놀리틱 구조 → 모듈형 아키텍처');
    // console.log('  - 클린 코드 적용: SOLID 원칙, 의존성 주입, 이벤트 기반 아키텍처');
    // console.log('  - 코드 재사용성 향상: 개별 컴포넌트로 분리');
    // console.log('  - 유지보수성 개선: 단일 책임 원칙 적용');
    // console.log('  - 테스트 가능성 향상: 의존성 주입으로 테스트 용이성 확보');
    
    const successRate = (results.passed / results.total) * 100;
    if (successRate >= 90) {
        // console.log('\n🎉 리팩토링 성공! 모든 주요 기능이 정상 동작합니다.');
    } else if (successRate >= 80) {
        // console.log('\n⚠️ 리팩토링 대부분 성공. 일부 개선이 필요합니다.');
    } else {
        // console.log('\n❌ 리팩토링에 문제가 있습니다. 추가 수정이 필요합니다.');
    }
}

// DOM 로드 후 자동 실행
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // console.log('🔬 통합 테스트 자동 실행 시작...');
        runIntegrationTest().then(results => {
            // 테스트 결과를 전역에 저장
            window.integrationTestResults = results;
            
            // 성공률에 따른 UI 업데이트
            const successRate = (results.passed / results.total) * 100;
            if (successRate >= 90) {
                document.body.classList.add('refactoring-success');
            } else if (successRate >= 80) {
                document.body.classList.add('refactoring-warning');
            } else {
                document.body.classList.add('refactoring-error');
            }
        });
    }, 3000); // 3초 후 실행 (다른 초기화 완료 대기)
});

// 전역으로 노출
window.runIntegrationTest = runIntegrationTest;