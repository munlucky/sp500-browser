# Core 폴더 룰

## 목적
앱의 핵심 인프라와 시스템을 제공하는 폴더입니다.

## 파일 구조
- `DIContainer.js` - 의존성 주입 컨테이너
- `EventBus.js` - 이벤트 버스 시스템
- `compatibility-layer.js` - 호환성 레이어
- `integration-test.js` - 통합 테스트
- `phase1-test.js` - 1단계 테스트
- `phase2-test.js` - 2단계 테스트
- `phase3-test.js` - 3단계 테스트

## 코딩 룰

### 의존성 주입 패턴
```javascript
class DIContainer {
    constructor() {
        this.dependencies = new Map();
        this.singletons = new Map();
    }

    register(name, factory, options = { singleton: false }) {
        this.dependencies.set(name, { factory, options });
    }

    resolve(name) {
        const dep = this.dependencies.get(name);
        if (!dep) {
            throw new Error(`Dependency ${name} not found`);
        }

        if (dep.options.singleton) {
            if (!this.singletons.has(name)) {
                this.singletons.set(name, dep.factory());
            }
            return this.singletons.get(name);
        }

        return dep.factory();
    }
}
```

### 이벤트 버스 패턴
```javascript
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
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    off(event, callback) {
        const callbacks = this.listeners.get(event) || [];
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
}
```

### 테스트 구조
```javascript
// 통합 테스트 패턴
class IntegrationTest {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    addTest(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    async runAll() {
        for (const test of this.tests) {
            try {
                const result = await test.testFunction();
                this.results.push({
                    name: test.name,
                    status: 'passed',
                    result
                });
            } catch (error) {
                this.results.push({
                    name: test.name,
                    status: 'failed',
                    error: error.message
                });
            }
        }
        return this.results;
    }
}
```

### 호환성 체크
```javascript
function checkBrowserCompatibility() {
    const required = {
        'Promise': typeof Promise !== 'undefined',
        'fetch': typeof fetch !== 'undefined',
        'localStorage': typeof localStorage !== 'undefined',
        'Notification': typeof Notification !== 'undefined'
    };

    const missing = Object.entries(required)
        .filter(([name, available]) => !available)
        .map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(`Missing browser features: ${missing.join(', ')}`);
    }

    return true;
}
```

## 금지사항
- 비즈니스 로직 포함 금지 (순수 인프라 코드만)
- 특정 서비스나 컴포넌트에 종속적인 코드 작성 금지
- 하드코딩된 설정값 사용 금지
- 테스트 코드에서 실제 API 호출 금지 (mock 사용)
- 전역 네임스페이스 오염 금지