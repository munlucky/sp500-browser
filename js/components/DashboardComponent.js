/**
 * 대시보드 컴포넌트
 * 메인 헤더의 실시간 통계 카드들을 관리
 */
class DashboardComponent {
    constructor(eventBus, elements = null) {
        this.eventBus = eventBus;
        this.elements = elements || this.findElements();
        this.animationQueue = [];
        this.isAnimating = false;
        
        this.setupEventListeners();
        console.log('✅ DashboardComponent 초기화 완료');
    }
    
    /**
     * DOM 요소들 찾기
     */
    findElements() {
        return {
            breakoutCount: document.getElementById('breakoutCount'),
            waitingCount: document.getElementById('waitingCount'),
            totalScanned: document.getElementById('totalScanned'),
            errorCount: document.getElementById('errorCount'),
            liveDashboard: document.querySelector('.live-dashboard')
        };
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on(Constants.EVENTS.SCAN_COMPLETED, (results) => {
                this.updateDashboard(results);
            });
            
            this.eventBus.on(Constants.EVENTS.SCAN_PROGRESS, (progress) => {
                this.updateScanProgress(progress);
            });
            
            this.eventBus.on(Constants.EVENTS.SCAN_ERROR, (error) => {
                this.incrementErrorCount();
            });
        }
    }
    
    /**
     * 대시보드 전체 업데이트
     * @param {Object} results - 스캔 결과
     */
    updateDashboard(results) {
        if (!results) return;
        
        const stats = {
            breakout: results.breakoutStocks?.length || 0,
            waiting: results.waitingStocks?.length || 0,
            total: results.totalScanned || 0,
            errors: results.errorCount || 0
        };
        
        // 애니메이션과 함께 업데이트
        this.updateStatWithAnimation(this.elements.breakoutCount, stats.breakout);
        this.updateStatWithAnimation(this.elements.waitingCount, stats.waiting);
        this.updateStatWithAnimation(this.elements.totalScanned, stats.total);
        this.updateStatWithAnimation(this.elements.errorCount, stats.errors);
        
        // 대시보드 상태 업데이트
        this.updateDashboardState(stats);
        
        console.log(`📊 대시보드 업데이트: 돌파 ${stats.breakout}, 대기 ${stats.waiting}, 총 ${stats.total}개`);
    }
    
    /**
     * 개별 통계 값을 애니메이션과 함께 업데이트
     * @param {HTMLElement} element - 업데이트할 요소
     * @param {number} newValue - 새로운 값
     */
    updateStatWithAnimation(element, newValue) {
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        if (currentValue === newValue) return;
        
        // 애니메이션 큐에 추가
        this.animationQueue.push({
            element,
            currentValue,
            newValue,
            timestamp: Date.now()
        });
        
        this.processAnimationQueue();
    }
    
    /**
     * 애니메이션 큐 처리
     */
    async processAnimationQueue() {
        if (this.isAnimating || this.animationQueue.length === 0) return;
        
        this.isAnimating = true;
        
        while (this.animationQueue.length > 0) {
            const animation = this.animationQueue.shift();
            await this.animateValue(animation);
        }
        
        this.isAnimating = false;
    }
    
    /**
     * 값 변경 애니메이션
     * @param {Object} animation - 애니메이션 정보
     */
    async animateValue(animation) {
        const { element, currentValue, newValue } = animation;
        const duration = 500; // 0.5초
        const steps = 20;
        const stepDuration = duration / steps;
        const valueStep = (newValue - currentValue) / steps;
        
        // 요소에 애니메이션 클래스 추가
        element.parentElement?.classList.add('updating');
        
        for (let i = 0; i <= steps; i++) {
            const value = Math.round(currentValue + (valueStep * i));
            element.textContent = value;
            
            if (i < steps) {
                await new Promise(resolve => setTimeout(resolve, stepDuration));
            }
        }
        
        // 최종 값 설정
        element.textContent = newValue;
        
        // 애니메이션 완료 효과
        element.parentElement?.classList.remove('updating');
        element.parentElement?.classList.add('updated');
        
        setTimeout(() => {
            element.parentElement?.classList.remove('updated');
        }, 1000);
    }
    
    /**
     * 대시보드 상태 업데이트 (색상, 아이콘 등)
     * @param {Object} stats - 통계 정보
     */
    updateDashboardState(stats) {
        // 돌파 카드 상태
        const breakoutCard = this.elements.breakoutCount?.closest('.dashboard-card');
        if (breakoutCard) {
            if (stats.breakout > 0) {
                breakoutCard.classList.add('has-data');
                breakoutCard.classList.remove('no-data');
            } else {
                breakoutCard.classList.remove('has-data');
                breakoutCard.classList.add('no-data');
            }
        }
        
        // 대기 카드 상태
        const waitingCard = this.elements.waitingCount?.closest('.dashboard-card');
        if (waitingCard) {
            if (stats.waiting > 0) {
                waitingCard.classList.add('has-data');
                waitingCard.classList.remove('no-data');
            } else {
                waitingCard.classList.remove('has-data');
                waitingCard.classList.add('no-data');
            }
        }
        
        // 오류 카드 상태
        const errorCard = this.elements.errorCount?.closest('.dashboard-card');
        if (errorCard) {
            if (stats.errors > 0) {
                errorCard.classList.add('has-errors');
            } else {
                errorCard.classList.remove('has-errors');
            }
        }
        
        // 전체 대시보드 상태
        if (this.elements.liveDashboard) {
            if (stats.total > 0) {
                this.elements.liveDashboard.classList.add('has-scan-data');
            } else {
                this.elements.liveDashboard.classList.remove('has-scan-data');
            }
        }
    }
    
    /**
     * 스캔 진행률 업데이트
     * @param {Object} progress - 진행률 정보
     */
    updateScanProgress(progress) {
        if (!progress?.processed || !progress?.total) return;
        
        const percentage = Math.round((progress.processed / progress.total) * 100);
        
        // 총 스캔 수를 진행률로 업데이트
        this.updateStatWithAnimation(this.elements.totalScanned, progress.processed);
        
        // 진행률 표시 (필요시)
        this.showProgressIndicator(percentage);
    }
    
    /**
     * 진행률 표시기 표시
     * @param {number} percentage - 진행률 (0-100)
     */
    showProgressIndicator(percentage) {
        // 대시보드에 진행률 표시
        if (this.elements.liveDashboard) {
            this.elements.liveDashboard.style.setProperty('--scan-progress', `${percentage}%`);
            
            if (percentage < 100) {
                this.elements.liveDashboard.classList.add('scanning');
            } else {
                this.elements.liveDashboard.classList.remove('scanning');
            }
        }
    }
    
    /**
     * 오류 카운트 증가
     */
    incrementErrorCount() {
        const currentCount = parseInt(this.elements.errorCount?.textContent) || 0;
        this.updateStatWithAnimation(this.elements.errorCount, currentCount + 1);
    }
    
    /**
     * 대시보드 초기화
     */
    reset() {
        this.updateStatWithAnimation(this.elements.breakoutCount, 0);
        this.updateStatWithAnimation(this.elements.waitingCount, 0);
        this.updateStatWithAnimation(this.elements.totalScanned, 0);
        this.updateStatWithAnimation(this.elements.errorCount, 0);
        
        // 상태 클래스 제거
        const cards = document.querySelectorAll('.dashboard-card');
        cards.forEach(card => {
            card.classList.remove('has-data', 'no-data', 'has-errors', 'updating', 'updated');
        });
        
        if (this.elements.liveDashboard) {
            this.elements.liveDashboard.classList.remove('has-scan-data', 'scanning');
            this.elements.liveDashboard.style.removeProperty('--scan-progress');
        }
    }
    
    /**
     * 대시보드 하이라이트 효과
     * @param {string} type - 하이라이트 타입 ('breakout', 'waiting', 'error')
     */
    highlight(type) {
        let targetElement;
        
        switch (type) {
            case 'breakout':
                targetElement = this.elements.breakoutCount?.closest('.dashboard-card');
                break;
            case 'waiting':
                targetElement = this.elements.waitingCount?.closest('.dashboard-card');
                break;
            case 'error':
                targetElement = this.elements.errorCount?.closest('.dashboard-card');
                break;
        }
        
        if (targetElement) {
            targetElement.classList.add('highlight');
            setTimeout(() => {
                targetElement.classList.remove('highlight');
            }, 2000);
        }
    }
    
    /**
     * 컴포넌트 파괴
     */
    destroy() {
        // 이벤트 리스너 제거
        if (this.eventBus) {
            this.eventBus.off(Constants.EVENTS.SCAN_COMPLETED);
            this.eventBus.off(Constants.EVENTS.SCAN_PROGRESS);
            this.eventBus.off(Constants.EVENTS.SCAN_ERROR);
        }
        
        // 애니메이션 큐 클리어
        this.animationQueue = [];
        this.isAnimating = false;
        
        console.log('🗑️ DashboardComponent 파괴됨');
    }
}

// 전역으로 노출
window.DashboardComponent = DashboardComponent;