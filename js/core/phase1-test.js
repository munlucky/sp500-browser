/**
 * Phase 1 검증 스크립트
 * 기반 인프라(DI Container, EventBus, Utils)가 정상 동작하는지 확인
 */
function testPhase1() {
    // console.log('🧪 Phase 1 검증 시작...');
    
    try {
        // 1. DIContainer 테스트
        console.log('1. DIContainer 테스트');
        const container = new DIContainer();
        
        // 테스트 서비스 등록
        container.register('testService', () => ({
            name: 'Test Service',
            getValue: () => 42
        }));
        
        const service1 = container.resolve('testService');
        const service2 = container.resolve('testService');
        
        if (service1 === service2) {
            console.log('✅ DIContainer 싱글톤 동작 확인');
        } else {
            throw new Error('DIContainer 싱글톤 실패');
        }
        
        // 2. EventBus 테스트
        console.log('2. EventBus 테스트');
        const eventBus = new EventBus();
        let eventReceived = false;
        
        eventBus.on('test-event', (data) => {
            if (data.message === 'Hello World') {
                eventReceived = true;
            }
        });
        
        eventBus.emit('test-event', { message: 'Hello World' });
        
        if (eventReceived) {
            console.log('✅ EventBus 이벤트 발생/수신 확인');
        } else {
            throw new Error('EventBus 이벤트 실패');
        }
        
        // 3. Utils 테스트
        console.log('3. Utils 테스트');
        
        // 숫자 포맷팅 테스트
        const formatted = Utils.formatNumber(1234567.89);
        if (formatted.includes(',')) {
            console.log('✅ Utils.formatNumber 동작 확인:', formatted);
        } else {
            throw new Error('Utils.formatNumber 실패');
        }
        
        // 통화 포맷팅 테스트
        const currency = Utils.formatCurrency(123.45);
        if (currency.includes('$')) {
            console.log('✅ Utils.formatCurrency 동작 확인:', currency);
        } else {
            throw new Error('Utils.formatCurrency 실패');
        }
        
        // 퍼센트 계산 테스트
        const percentage = Utils.calculatePercentage(110, 100);
        if (percentage === 10) {
            console.log('✅ Utils.calculatePercentage 동작 확인:', percentage + '%');
        } else {
            throw new Error('Utils.calculatePercentage 실패');
        }
        
        // 4. Constants 테스트
        console.log('4. Constants 테스트');
        
        if (Constants.API.RATE_LIMIT_MS === 1000) {
            console.log('✅ Constants 접근 확인');
        } else {
            throw new Error('Constants 접근 실패');
        }
        
        // Constants 수정 시도 (실패해야 함)
        const originalValue = Constants.API.RATE_LIMIT_MS;
        try {
            Constants.API.RATE_LIMIT_MS = 2000;
            
            // 값이 실제로 변경되었는지 확인
            if (Constants.API.RATE_LIMIT_MS !== originalValue) {
                throw new Error('Constants가 수정 가능함 (보안 문제)');
            } else {
                console.log('✅ Constants 읽기 전용 확인 (값 변경 무시됨)');
            }
        } catch (e) {
            if (e.message.includes('Cannot assign') || e.message.includes('read only')) {
                console.log('✅ Constants 읽기 전용 확인 (수정 시 오류 발생)');
            } else {
                throw e;
            }
        }
        
        // 5. 통합 테스트
        // console.log('5. 통합 테스트');
        
        // EventBus를 이용한 서비스 간 통신 테스트
        container.register('eventBus', () => eventBus);
        container.register('serviceA', (container) => {
            const bus = container.resolve('eventBus');
            return {
                sendMessage: (msg) => bus.emit('serviceA:message', msg)
            };
        });
        
        container.register('serviceB', (container) => {
            const bus = container.resolve('eventBus');
            let lastMessage = null;
            
            bus.on('serviceA:message', (msg) => {
                lastMessage = msg;
            });
            
            return {
                getLastMessage: () => lastMessage
            };
        });
        
        const serviceA = container.resolve('serviceA');
        const serviceB = container.resolve('serviceB');
        
        serviceA.sendMessage('Integration Test');
        
        setTimeout(() => {
            if (serviceB.getLastMessage() === 'Integration Test') {
                console.log('✅ 서비스 간 EventBus 통신 확인');
                // console.log('🎉 Phase 1 검증 완료! 모든 기반 인프라가 정상 동작합니다.');
            } else {
                console.error('❌ 서비스 간 통신 실패');
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Phase 1 검증 실패:', error.message);
        throw error;
    }
}

// DOM 로드 후 테스트 실행 (개발 모드에서만)
if (false && window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', () => {
        // console.log('🚀 개발 모드 감지 - Phase 1 자동 테스트 실행');
        testPhase1();
    });
}

// 전역으로 노출 (수동 테스트용)
window.testPhase1 = testPhase1;