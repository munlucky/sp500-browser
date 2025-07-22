# Components 폴더 룰

## 목적
UI 컴포넌트와 사용자 인터페이스 로직을 관리하는 폴더입니다.

## 파일 구조
- `AutoUpdater.js` - 자동 업데이트 컴포넌트
- `DashboardComponent.js` - 대시보드 컴포넌트
- `NotificationComponent.js` - 알림 컴포넌트
- `SettingsComponent.js` - 설정 컴포넌트
- `UIRenderer.js` - UI 렌더링 컴포넌트

## 코딩 룰

### 컴포넌트 구조
```javascript
class ComponentName {
    constructor(eventBus, container) {
        this.eventBus = eventBus;
        this.container = container;
        this.isRendered = false;
        
        this.setupEventListeners();
    }

    render(data) {
        if (!this.container) {
            throw new Error('Container not found');
        }

        this.container.innerHTML = this.generateHTML(data);
        this.bindEvents();
        this.isRendered = true;
    }

    generateHTML(data) {
        return `
            <div class="component">
                ${this.renderContent(data)}
            </div>
        `;
    }

    bindEvents() {
        // 이벤트 바인딩 로직
    }

    setupEventListeners() {
        this.eventBus.on('data-updated', (data) => {
            if (this.isRendered) {
                this.update(data);
            }
        });
    }

    update(data) {
        // 부분 업데이트 로직
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.isRendered = false;
    }
}
```

### 이벤트 처리
```javascript
bindEvents() {
    const button = this.container.querySelector('.action-button');
    if (button) {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleAction();
        });
    }
}

handleAction() {
    // 비즈니스 로직은 이벤트 버스로 전달
    this.eventBus.emit('action-requested', {
        component: this.constructor.name,
        timestamp: Date.now()
    });
}
```

### HTML 템플릿 생성
```javascript
generateStockCard(stock) {
    return `
        <div class="stock-card" data-ticker="${stock.ticker}">
            <h3 class="stock-card__title">${stock.ticker}</h3>
            <div class="stock-card__price">$${stock.currentPrice.toFixed(2)}</div>
            <div class="stock-card__change ${stock.change >= 0 ? 'positive' : 'negative'}">
                ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%
            </div>
        </div>
    `;
}
```

### 상태 관리
```javascript
updateState(newData) {
    this.state = { ...this.state, ...newData };
    this.render(this.state);
}
```

## 금지사항
- 직접적인 비즈니스 로직 포함 금지 (서비스 계층 활용)
- 전역 상태 직접 조작 금지 (이벤트 버스 활용)
- innerHTML 사용 시 XSS 공격 취약점 주의
- 메모리 누수 방지를 위한 이벤트 정리 필수
- 하드코딩된 DOM 셀렉터 사용 최소화