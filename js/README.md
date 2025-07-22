# JS 폴더 룰

## 목적
애플리케이션의 모든 JavaScript 로직을 관리하는 메인 폴더입니다.

## 파일 구조
- `app.js` - 앱 메인 초기화 및 이벤트 관리
- `scanner.js` - 메인 스캐너 로직 (레거시)
- `calculator.js` - 변동성 계산 로직
- `breakout-tracker.js` - 돌파 추적 시스템
- `logger.js` - 로깅 시스템
- `notifications.js` - 알림 시스템
- `sector-analyzer.js` - 섹터별 분석 도구

## 코딩 룰

### 클래스 정의
```javascript
class ServiceName {
    constructor(dependencies = {}) {
        this.dependency = dependencies.dependency;
        this.isInitialized = false;
    }

    async init() {
        // 초기화 로직
        this.isInitialized = true;
    }
}
```

### 에러 핸들링
```javascript
try {
    const result = await this.performOperation();
    return result;
} catch (error) {
    ErrorHandler.handle(error, 'ServiceName.methodName');
    throw error;
}
```

### 이벤트 시스템 활용
```javascript
// 이벤트 발생
this.eventBus.emit('operation-complete', { data });

// 이벤트 리스닝
this.eventBus.on('operation-complete', (data) => {
    // 처리 로직
});
```

### 비동기 처리
```javascript
// async/await 필수 사용
async performAsyncOperation() {
    const data = await this.fetchData();
    return this.processData(data);
}
```

## 금지사항
- jQuery 사용 금지 (Vanilla JS 사용)
- 전역 변수 사용 금지
- `var` 키워드 사용 금지 (const/let 사용)
- 콜백 헬 생성 금지 (Promise/async-await 사용)
- 직접적인 DOM 조작 최소화 (컴포넌트 시스템 활용)