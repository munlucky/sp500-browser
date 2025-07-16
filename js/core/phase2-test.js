/**
 * Phase 2 검증 스크립트
 * Core 모듈들(ErrorHandler, StorageManager, APIManager)이 정상 동작하는지 확인
 */
function testPhase2() {
    // console.log('🧪 Phase 2 검증 시작...');
    
    try {
        // 의존성 인스턴스 생성
        const eventBus = new EventBus();
        const errorHandler = new ErrorHandler(eventBus, null);
        const apiManager = new APIManager(eventBus, errorHandler);
        
        // 1. AppError 테스트
        console.log('1. AppError 테스트');
        
        const testError = AppError.networkError('테스트 네트워크 에러', { testData: true });
        if (testError instanceof Error && testError.code === Constants.ERROR_CODES.NETWORK_ERROR) {
            console.log('✅ AppError 생성 및 코드 설정 확인');
        } else {
            throw new Error('AppError 생성 실패');
        }
        
        const errorJson = testError.toJSON();
        if (errorJson.code && errorJson.timestamp && errorJson.details) {
            console.log('✅ AppError JSON 직렬화 확인');
        } else {
            throw new Error('AppError JSON 직렬화 실패');
        }
        
        // 2. ErrorHandler 테스트
        console.log('2. ErrorHandler 테스트');
        
        let errorEventReceived = false;
        eventBus.on(Constants.EVENTS.APP_ERROR, (errorInfo) => {
            if (errorInfo.code === Constants.ERROR_CODES.VALIDATION_ERROR) {
                errorEventReceived = true;
            }
        });
        
        const validationError = AppError.validationError('테스트 검증 에러 (의도된 테스트)');
        errorHandler.handle(validationError, { test: true }, false);
        
        setTimeout(() => {
            if (errorEventReceived) {
                console.log('✅ ErrorHandler 이벤트 발생 확인');
            } else {
                console.warn('⚠️ ErrorHandler 이벤트 발생 실패');
            }
        }, 100);
        
        // 에러 통계 확인
        const stats = errorHandler.getErrorStats();
        if (stats.total > 0 && stats.byCode[Constants.ERROR_CODES.VALIDATION_ERROR]) {
            console.log('✅ ErrorHandler 통계 수집 확인');
        } else {
            throw new Error('ErrorHandler 통계 수집 실패');
        }
        
        // 3. StorageManager 테스트
        console.log('3. StorageManager 테스트');
        
        // 저장 테스트
        const testData = { test: true, timestamp: Date.now() };
        StorageManager.setItem('test_key', testData, 1); // 1분 TTL
        
        const retrievedData = StorageManager.getItem('test_key');
        if (JSON.stringify(retrievedData) === JSON.stringify(testData)) {
            console.log('✅ StorageManager 저장/조회 확인');
        } else {
            throw new Error('StorageManager 저장/조회 실패');
        }
        
        // 저장소 정보 확인
        const storageInfo = StorageManager.getStorageInfo();
        if (typeof storageInfo.used === 'number' && typeof storageInfo.percentage === 'number') {
            console.log('✅ StorageManager 정보 조회 확인:', `${storageInfo.used}MB (${storageInfo.percentage}%)`);
        } else {
            throw new Error('StorageManager 정보 조회 실패');
        }
        
        // 4. APIManager 기본 테스트 (실제 API 호출 없이)
        console.log('4. APIManager 테스트');
        
        // 상태 확인
        const apiStatus = apiManager.getStatus();
        if (typeof apiStatus.isActive === 'boolean' && Array.isArray(apiStatus.failedTickers)) {
            console.log('✅ APIManager 상태 조회 확인');
        } else {
            throw new Error('APIManager 상태 조회 실패');
        }
        
        // 요청 취소 테스트
        apiManager.cancelAllRequests(); // 실제 요청이 없으므로 안전
        const statusAfterCancel = apiManager.getStatus();
        if (statusAfterCancel.queueCount === 0) {
            console.log('✅ APIManager 요청 취소 확인');
        } else {
            throw new Error('APIManager 요청 취소 실패');
        }
        
        // 5. 통합 테스트 - 에러 발생 시 시스템 동작
        // console.log('5. 통합 테스트');
        
        let storageEventReceived = false;
        eventBus.on('storage:item-saved', () => {
            storageEventReceived = true;
        });
        
        // 저장소에 데이터 저장 (이벤트 발생)
        StorageManager.setItem('integration_test', { integration: true });
        
        setTimeout(() => {
            if (storageEventReceived) {
                console.log('✅ 저장소-이벤트버스 통합 확인');
            } else {
                console.warn('⚠️ 저장소-이벤트버스 통합 실패');
            }
        }, 100);
        
        // 6. 정리 작업
        setTimeout(() => {
            StorageManager.removeItem('test_key');
            StorageManager.removeItem('integration_test');
            // console.log('🎉 Phase 2 검증 완료! Core 모듈들이 정상 동작합니다.');
        }, 200);
        
    } catch (error) {
        console.error('❌ Phase 2 검증 실패:', error.message);
        console.error(error.stack);
        throw error;
    }
}

/**
 * 실제 API 테스트 (개발 모드에서만 실행)
 * 실제 Yahoo Finance API를 호출하여 APIManager 동작 확인
 */
async function testAPIManagerLive() {
    console.log('🔗 APIManager 실제 API 테스트 시작...');
    
    try {
        const eventBus = new EventBus();
        const errorHandler = new ErrorHandler(eventBus, console);
        const apiManager = new APIManager(eventBus, errorHandler);
        
        // 진행률 추적
        let progressReceived = false;
        eventBus.on(Constants.EVENTS.DATA_COLLECTION_PROGRESS, (data) => {
            console.log(`📊 진행률: ${data.processed}/${data.total} - ${data.ticker}`);
            progressReceived = true;
        });
        
        // 간단한 테스트용 티커들
        const testTickers = ['AAPL', 'MSFT'];
        
        console.log('📡 실제 API 호출 테스트...');
        const results = await apiManager.fetchMultipleStocks(testTickers);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        console.log(`✅ API 테스트 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
        
        if (progressReceived) {
            console.log('✅ 진행률 이벤트 확인');
        }
        
        // 성공한 데이터 검증
        const successfulResults = results.filter(r => r.success);
        if (successfulResults.length > 0) {
            const sampleData = successfulResults[0].data;
            if (Utils.isValidStockData(sampleData)) {
                console.log('✅ API 데이터 유효성 확인:', sampleData.ticker);
            } else {
                console.warn('⚠️ API 데이터 유효성 검사 실패');
            }
        }
        
        console.log('🎉 실제 API 테스트 완료!');
        
    } catch (error) {
        console.error('❌ 실제 API 테스트 실패:', error.message);
        throw error;
    }
}

// 개발 모드에서 자동 실행
if (false && window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', () => {
        // Phase 1 테스트 완료 후 Phase 2 테스트 실행
        setTimeout(() => {
            // console.log('🚀 Phase 2 자동 테스트 실행');
            testPhase2();
            
            // 실제 API 테스트는 사용자 확인 후 실행
            setTimeout(() => {
                if (confirm('실제 API 테스트를 실행하시겠습니까? (인터넷 연결 필요)')) {
                    testAPIManagerLive();
                }
            }, 2000);
        }, 1000);
    });
}

// 전역으로 노출 (수동 테스트용)
window.testPhase2 = testPhase2;
window.testAPIManagerLive = testAPIManagerLive;