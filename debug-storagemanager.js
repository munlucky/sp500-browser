// StorageManager 디버깅 스크립트
// 브라우저 콘솔에서 실행하여 문제 진단

console.log('=== StorageManager 디버깅 시작 ===');

// 1. StorageManager 존재 확인
console.log('1. StorageManager 존재 확인:');
console.log('typeof StorageManager:', typeof StorageManager);
console.log('StorageManager:', StorageManager);

// 2. updateSettings 함수 존재 확인
console.log('\n2. updateSettings 함수 존재 확인:');
if (typeof StorageManager !== 'undefined') {
    console.log('typeof StorageManager.updateSettings:', typeof StorageManager.updateSettings);
    console.log('StorageManager.updateSettings:', StorageManager.updateSettings);
} else {
    console.log('❌ StorageManager가 정의되지 않았습니다');
}

// 3. 모든 스크립트 로딩 상태 확인
console.log('\n3. 스크립트 로딩 상태:');
console.log('storage.js 관련 객체들:');
console.log('- window.StorageManager:', window.StorageManager);
console.log('- global StorageManager:', typeof window.StorageManager !== 'undefined' ? window.StorageManager : 'undefined');

// 4. 로딩된 스크립트 파일 확인
console.log('\n4. 로딩된 스크립트 파일:');
const scripts = document.querySelectorAll('script[src]');
scripts.forEach((script, index) => {
    console.log(`${index + 1}. ${script.src}`);
});

// 5. 실제 updateSettings 호출 테스트
console.log('\n5. updateSettings 호출 테스트:');
try {
    if (typeof StorageManager !== 'undefined' && StorageManager.updateSettings) {
        console.log('✅ updateSettings 호출 가능');
        // 실제 호출 테스트 (안전한 설정으로)
        StorageManager.updateSettings({ testKey: 'testValue' });
        console.log('✅ updateSettings 호출 성공');
    } else {
        console.log('❌ updateSettings 호출 불가능');
    }
} catch (error) {
    console.log('❌ updateSettings 호출 중 오류:', error);
}

// 6. 네임스페이스 충돌 확인
console.log('\n6. 네임스페이스 충돌 확인:');
console.log('window에서 StorageManager 관련 속성들:');
for (const key in window) {
    if (key.toLowerCase().includes('storage')) {
        console.log(`- ${key}:`, typeof window[key]);
    }
}

// 7. 저장된 설정 확인
console.log('\n7. 저장된 설정 확인:');
try {
    if (typeof StorageManager !== 'undefined' && StorageManager.getSettings) {
        const settings = StorageManager.getSettings();
        console.log('현재 설정:', settings);
    } else {
        console.log('❌ getSettings 함수 없음');
    }
} catch (error) {
    console.log('❌ getSettings 호출 중 오류:', error);
}

// 8. localStorage 직접 확인
console.log('\n8. localStorage 직접 확인:');
try {
    const storedSettings = localStorage.getItem('sp500_settings');
    console.log('sp500_settings:', storedSettings);
    if (storedSettings) {
        console.log('파싱된 설정:', JSON.parse(storedSettings));
    }
} catch (error) {
    console.log('❌ localStorage 읽기 오류:', error);
}

console.log('\n=== 디버깅 완료 ===');

// 해결 방법 제안
console.log('\n=== 해결 방법 제안 ===');
console.log('1. 스크립트 로딩 순서 확인: storage.js나 services/StorageManager.js가 먼저 로드되어야 함');
console.log('2. 네임스페이스 충돌 확인: 여러 파일에서 StorageManager 정의 시 덮어쓰기 가능');
console.log('3. 타이밍 문제 확인: updateSettings 호출 전에 StorageManager 로드 완료되어야 함');
console.log('4. 오류 발생 시 개발자 도구 Network 탭에서 스크립트 로드 실패 여부 확인');