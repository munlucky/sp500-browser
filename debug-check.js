// 스캔 결과 표시 문제 디버깅 스크립트
// 브라우저 콘솔에서 실행하여 문제 진단

console.log('=== 스캔 결과 표시 문제 디버깅 시작 ===');

// 1. 로컬스토리지 확인
console.log('1. 로컬스토리지 확인');
const storedResults = localStorage.getItem('sp500_results');
console.log('저장된 결과:', storedResults);
if (storedResults) {
    try {
        const parsed = JSON.parse(storedResults);
        console.log('파싱된 결과:', parsed);
        console.log('돌파 종목 수:', parsed.breakoutStocks?.length || 0);
        console.log('대기 종목 수:', parsed.waitingStocks?.length || 0);
    } catch (e) {
        console.error('파싱 실패:', e);
    }
}

// 2. HTML 요소 확인
console.log('\n2. HTML 요소 확인');
const breakoutContainer = document.getElementById('breakoutStocks');
const waitingContainer = document.getElementById('waitingStocks');
console.log('breakoutStocks 컨테이너:', breakoutContainer);
console.log('waitingStocks 컨테이너:', waitingContainer);

if (breakoutContainer) {
    console.log('breakoutStocks 내용:', breakoutContainer.innerHTML);
    console.log('breakoutStocks 스타일:', getComputedStyle(breakoutContainer).display);
}

if (waitingContainer) {
    console.log('waitingStocks 내용:', waitingContainer.innerHTML);
    console.log('waitingStocks 스타일:', getComputedStyle(waitingContainer).display);
}

// 3. 스캐너 객체 확인
console.log('\n3. 스캐너 객체 확인');
console.log('stockScanner 객체:', window.stockScanner);
console.log('sp500App 객체:', window.sp500App);

if (window.stockScanner) {
    console.log('lastScanResults:', window.stockScanner.lastScanResults);
    console.log('isScanning:', window.stockScanner.isScanning);
}

// 4. StorageManager 확인
console.log('\n4. StorageManager 확인');
console.log('StorageManager:', window.StorageManager);
if (window.StorageManager) {
    const results = window.StorageManager.getResults();
    console.log('StorageManager.getResults():', results);
}

// 5. 수동 테스트 데이터 생성 및 표시
console.log('\n5. 수동 테스트 데이터 생성');
const testResults = {
    breakoutStocks: [
        {
            ticker: 'AAPL',
            currentPrice: 150.25,
            entryPrice: 148.50,
            stopLoss: 145.00,
            target1: 152.00,
            target2: 155.00,
            volatility: 3.2,
            volume: 50000000,
            score: 85,
            isBreakout: true,
            meetsConditions: true
        }
    ],
    waitingStocks: [
        {
            ticker: 'MSFT',
            currentPrice: 335.20,
            entryPrice: 337.80,
            stopLoss: 330.00,
            target1: 340.00,
            target2: 345.00,
            volatility: 2.8,
            volume: 25000000,
            score: 75,
            isBreakout: false,
            gapToEntry: 2.60,
            meetsConditions: true
        }
    ],
    totalScanned: 500,
    errors: 5,
    timestamp: new Date().toISOString()
};

console.log('테스트 데이터:', testResults);

// 6. 수동으로 결과 표시 시도
console.log('\n6. 수동으로 결과 표시 시도');
if (window.stockScanner && typeof window.stockScanner.displayResults === 'function') {
    console.log('displayResults 함수 호출 시도...');
    try {
        window.stockScanner.displayResults(testResults);
        console.log('displayResults 호출 성공');
    } catch (e) {
        console.error('displayResults 호출 실패:', e);
    }
} else {
    console.log('stockScanner 또는 displayResults 함수를 찾을 수 없음');
}

// 7. 수동으로 renderStockCards 호출
console.log('\n7. 수동으로 renderStockCards 호출');
if (window.stockScanner && typeof window.stockScanner.renderStockCards === 'function') {
    try {
        window.stockScanner.renderStockCards('breakoutStocks', testResults.breakoutStocks, 'breakout');
        window.stockScanner.renderStockCards('waitingStocks', testResults.waitingStocks, 'waiting');
        console.log('renderStockCards 호출 성공');
    } catch (e) {
        console.error('renderStockCards 호출 실패:', e);
    }
}

// 8. 최종 HTML 확인
console.log('\n8. 최종 HTML 확인');
setTimeout(() => {
    if (breakoutContainer) {
        console.log('최종 breakoutStocks 내용:', breakoutContainer.innerHTML);
    }
    if (waitingContainer) {
        console.log('최종 waitingStocks 내용:', waitingContainer.innerHTML);
    }
    console.log('=== 디버깅 완료 ===');
}, 1000);