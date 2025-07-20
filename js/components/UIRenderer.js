/**
 * UI 렌더링 컴포넌트
 * 모든 UI 업데이트와 표시를 담당
 */
class UIRenderer {
    constructor(eventBus) {
        this.eventBus = eventBus;
        
        // DOM 요소 캐싱
        this.elements = {
            // 대시보드 카드
            breakoutCount: document.getElementById('breakoutCount'),
            waitingCount: document.getElementById('waitingCount'),
            totalScanned: document.getElementById('totalScanned'),
            errorCount: document.getElementById('errorCount'),
            
            // 결과 컨테이너
            breakoutStocks: document.getElementById('breakoutStocks'),
            waitingStocks: document.getElementById('waitingStocks'),
            
            // 상태 표시
            status: document.getElementById('status'),
            scanBtn: document.getElementById('scanBtn'),
            
            // 자동 업데이트 관련
            autoUpdateStatus: document.getElementById('autoUpdateStatus'),
            autoUpdateTimer: document.getElementById('autoUpdateTimer'),
            autoUpdateProgress: document.getElementById('autoUpdateProgress')
        };
        
        this.setupEventListeners();
        this.initializeAnimations();
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 스캔 관련 이벤트
        this.eventBus.on(Constants.EVENTS.SCAN_STARTED, () => {
            this.updateScanStatus('스캔 시작됨', 'scanning');
            this.setScanButtonState('scanning');
        });
        
        this.eventBus.on(Constants.EVENTS.SCAN_PROGRESS, (data) => {
            this.updateScanProgress(data);
        });
        
        this.eventBus.on(Constants.EVENTS.SCAN_COMPLETED, (results) => {
            this.renderResults(results);
            this.updateScanStatus('스캔 완료', 'completed');
            this.setScanButtonState('ready');
        });
        
        this.eventBus.on(Constants.EVENTS.SCAN_ERROR, (error) => {
            this.updateScanStatus('스캔 오류: ' + error.error, 'error');
            this.setScanButtonState('ready');
        });
        
        // 데이터 수집 이벤트
        this.eventBus.on(Constants.EVENTS.DATA_COLLECTION_PROGRESS, (data) => {
            this.updateDataCollectionProgress(data);
        });
        
        // 분석 진행 이벤트
        this.eventBus.on(Constants.EVENTS.ANALYSIS_PROGRESS, (data) => {
            this.updateAnalysisProgress(data);
        });
        
        // 자동 업데이트 이벤트
        this.eventBus.on(Constants.EVENTS.AUTO_UPDATE_STARTED, () => {
            this.updateAutoUpdateStatus('실행 중', true);
        });
        
        this.eventBus.on(Constants.EVENTS.AUTO_UPDATE_STOPPED, () => {
            this.updateAutoUpdateStatus('중지됨', false);
        });
        
        this.eventBus.on(Constants.EVENTS.AUTO_UPDATE_PROGRESS, (data) => {
            this.updateAutoUpdateProgress(data);
        });
        
        // UI 이벤트
        this.eventBus.on(Constants.EVENTS.UI_SHOW_ERROR, (data) => {
            this.showError(data.message);
        });
        
        this.eventBus.on(Constants.EVENTS.UI_SHOW_SUCCESS, (data) => {
            this.showSuccess(data.message);
        });
    }
    
    /**
     * 애니메이션 초기화
     */
    initializeAnimations() {
        // CSS 애니메이션을 위한 클래스 준비
        this.animationClasses = {
            pulse: 'pulse',
            slideIn: 'slide-in',
            fadeIn: 'fade-in',
            updated: 'updated'
        };
    }
    
    /**
     * 스캔 결과 렌더링
     * @param {Object} results - 스캔 결과
     */
    renderResults(results) {
        console.log('🎨 UI 결과 렌더링 시작:', results);
        
        // 돌파 종목 데이터 상세 로그
        if (results.breakoutStocks && results.breakoutStocks.length > 0) {
            console.log('🚀 돌파 종목 데이터:', results.breakoutStocks);
            results.breakoutStocks.forEach((stock, index) => {
                console.log(`  ${index + 1}. ${stock.ticker}: $${stock.currentPrice} (진입가: $${stock.entryPrice})`);
            });
        }
        
        // 대시보드 업데이트
        this.updateDashboard(results);
        
        // 결과 카드 렌더링
        this.renderStockCards('breakoutStocks', results.breakoutStocks, 'breakout');
        this.renderStockCards('waitingStocks', results.waitingStocks, 'waiting');
        
        // 결과 요약 로그
        const breakoutCount = results.breakoutStocks?.length || 0;
        const waitingCount = results.waitingStocks?.length || 0;
        console.log(`📊 렌더링 완료: 돌파 ${breakoutCount}개, 대기 ${waitingCount}개`);
        
        // DOM 업데이트 확인
        const breakoutContainer = document.getElementById('breakoutStocks');
        if (breakoutContainer) {
            console.log(`🔍 돌파 컨테이너 상태: ${breakoutContainer.children.length}개 자식 요소`);
        }
    }
    
    /**
     * 대시보드 카드 업데이트
     * @param {Object} results - 스캔 결과
     */
    updateDashboard(results) {
        // 안전한 데이터 접근
        const breakoutCount = results.breakoutStocks?.length || 0;
        const waitingCount = results.waitingStocks?.length || 0;
        const totalScanned = results.totalScanned || 0;
        const errorCount = results.errorCount || 0;
        
        this.updateStatWithAnimation(this.elements.breakoutCount, breakoutCount);
        this.updateStatWithAnimation(this.elements.waitingCount, waitingCount);
        this.updateStatWithAnimation(this.elements.totalScanned, totalScanned);
        this.updateStatWithAnimation(this.elements.errorCount, errorCount);
    }
    
    /**
     * 통계 값을 애니메이션과 함께 업데이트
     * @param {HTMLElement} element - 업데이트할 요소
     * @param {number} newValue - 새로운 값
     */
    updateStatWithAnimation(element, newValue) {
        if (!element) return;
        
        const currentValue = element.textContent;
        if (currentValue !== newValue.toString()) {
            element.textContent = newValue;
            element.classList.add(Constants.CSS_CLASSES.UPDATED);
            
            // 애니메이션 완료 후 클래스 제거
            setTimeout(() => {
                element.classList.remove(Constants.CSS_CLASSES.UPDATED);
            }, 600);
        }
    }
    
    /**
     * 주식 카드들 렌더링
     * @param {string} containerId - 컨테이너 ID
     * @param {Object[]} stocks - 주식 데이터 배열
     * @param {string} type - 카드 타입 ('breakout' 또는 'waiting')
     */
    renderStockCards(containerId, stocks, type) {
        const container = this.elements[containerId];
        if (!container) {
            console.warn(`❌ 컨테이너를 찾을 수 없습니다: ${containerId}`);
            // 동적으로 요소 찾기 시도
            const fallbackContainer = document.getElementById(containerId);
            if (fallbackContainer) {
                console.log(`✅ 동적으로 ${containerId} 컨테이너 발견`);
                this.elements[containerId] = fallbackContainer;
                return this.renderStockCards(containerId, stocks, type);
            }
            return;
        }
        
        console.log(`🎨 ${containerId} 렌더링 시작:`, stocks?.length || 0, '개 종목');
        
        container.innerHTML = '';
        
        // 안전한 배열 확인
        if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
            container.innerHTML = this.createNoResultsHTML(type);
            console.log(`📭 ${containerId}: 결과 없음`);
            return;
        }
        
        // 최대 표시 개수 제한
        const maxDisplay = type === 'breakout' ? 
            Constants.UI.MAX_DISPLAYED_BREAKOUT : 
            Constants.UI.MAX_DISPLAYED_WAITING;
        
        const displayStocks = stocks.slice(0, maxDisplay);
        
        displayStocks.forEach((stock, index) => {
            const cardElement = this.createStockCard(stock, type, index);
            container.appendChild(cardElement);
            console.log(`🎨 ${type} 카드 추가됨: ${stock.ticker} (${index + 1}/${displayStocks.length})`);
        });
        
        console.log(`✅ ${containerId} 렌더링 완료: ${displayStocks.length}개 카드 추가됨`);
        
        // 더 많은 결과가 있는 경우 표시
        if (stocks.length > maxDisplay) {
            const moreInfo = this.createMoreResultsInfo(stocks.length - maxDisplay, type);
            container.appendChild(moreInfo);
        }
    }
    
    /**
     * 개별 주식 카드 생성
     * @param {Object} stock - 주식 데이터
     * @param {string} type - 카드 타입
     * @param {number} index - 인덱스
     * @returns {HTMLElement}
     */
    createStockCard(stock, type, index) {
        const card = document.createElement('div');
        card.className = `stock-card ${type}-card`;
        card.style.animationDelay = `${index * Constants.UI.CARD_ANIMATION_DELAY_MS}ms`;
        
        const priceChange = Utils.calculatePercentage(stock.currentPrice, stock.yesterdayClose);
        const priceChangeClass = priceChange >= 0 ? 'positive' : 'negative';
        
        card.innerHTML = `
            <div class="stock-header">
                <div class="stock-ticker">${stock.ticker}</div>
                <div class="stock-score ${this.getScoreClass(stock.score)}">${stock.score || 0}</div>
            </div>
            
            <div class="stock-prices">
                <div class="current-price">
                    ${Utils.formatCurrency(stock.currentPrice)}
                    <span class="price-change ${priceChangeClass}">
                        ${priceChange >= 0 ? '+' : ''}${Utils.formatPercentage(priceChange, 1)}
                    </span>
                </div>
                <div class="entry-price">
                    진입가: ${Utils.formatCurrency(stock.entryPrice || 0)}
                </div>
            </div>
            
            <div class="stock-details">
                <div class="detail-item">
                    <span class="label">변동성:</span>
                    <span class="value">${Utils.formatPercentage(stock.volatility || 0, 1)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">거래량:</span>
                    <span class="value">${Utils.formatNumber(stock.yesterdayVolume || 0)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">리스크/리워드:</span>
                    <span class="value">${(stock.riskRewardRatio || 0).toFixed(2)}</span>
                </div>
            </div>
            
            <div class="stock-status ${type}">
                ${this.getStatusText(stock, type)}
            </div>
            
            ${stock.confidence ? `<div class="confidence-badge ${stock.confidence}">${this.getConfidenceText(stock.confidence)}</div>` : ''}
        `;
        
        // 클릭 이벤트 추가
        card.addEventListener('click', () => {
            this.showStockDetails(stock);
        });
        
        return card;
    }
    
    /**
     * 점수에 따른 CSS 클래스 반환
     * @param {number} score - 점수
     * @returns {string}
     */
    getScoreClass(score) {
        if (score >= 80) return 'score-high';
        if (score >= 60) return 'score-medium';
        return 'score-low';
    }
    
    /**
     * 상태 텍스트 반환
     * @param {Object} stock - 주식 데이터
     * @param {string} type - 타입
     * @returns {string}
     */
    getStatusText(stock, type) {
        if (type === 'breakout') {
            return '🚀 돌파 완료';
        } else {
            const distance = (stock.entryPrice && stock.currentPrice) ? 
                ((stock.entryPrice - stock.currentPrice) / stock.currentPrice * 100).toFixed(1) : '0';
            return `⏰ 진입가까지 ${distance}%`;
        }
    }
    
    /**
     * 신뢰도 텍스트 반환
     * @param {string} confidence - 신뢰도
     * @returns {string}
     */
    getConfidenceText(confidence) {
        const texts = {
            'high': '높음',
            'medium': '보통',
            'low': '낮음'
        };
        return texts[confidence] || '';
    }
    
    /**
     * 결과 없음 HTML 생성
     * @param {string} type - 타입
     * @returns {string}
     */
    createNoResultsHTML(type) {
        const messages = {
            'breakout': '현재 돌파 조건을 만족하는 종목이 없습니다.',
            'waiting': '현재 돌파 대기 중인 종목이 없습니다.'
        };
        
        return `<div class="no-results">${messages[type] || '결과가 없습니다.'}</div>`;
    }
    
    /**
     * 더 많은 결과 정보 생성
     * @param {number} count - 추가 결과 수
     * @param {string} type - 타입
     * @returns {HTMLElement}
     */
    createMoreResultsInfo(count, type) {
        const moreInfo = document.createElement('div');
        moreInfo.className = 'more-results-info';
        moreInfo.innerHTML = `
            <div class="more-text">
                ${count}개의 추가 ${type === 'breakout' ? '돌파' : '대기'} 종목이 있습니다.
            </div>
            <button class="show-more-btn" onclick="window.uiRenderer.showAllResults('${type}')">
                모두 보기
            </button>
        `;
        return moreInfo;
    }
    
    /**
     * 스캔 상태 업데이트
     * @param {string} message - 상태 메시지
     * @param {string} type - 상태 타입
     */
    updateScanStatus(message, type = 'default') {
        if (this.elements.status) {
            this.elements.status.textContent = message;
            this.elements.status.className = `scan-status status-${type}`;
        }
    }
    
    /**
     * 스캔 버튼 상태 설정
     * @param {string} state - 버튼 상태 ('ready', 'scanning', 'disabled')
     */
    setScanButtonState(state) {
        if (!this.elements.scanBtn) return;
        
        const btn = this.elements.scanBtn;
        const scanIcon = btn.querySelector('.scan-icon');
        const scanTitle = btn.querySelector('.scan-title');
        
        // 기존 상태 클래스 제거
        btn.classList.remove('scanning', 'disabled');
        
        switch (state) {
            case 'scanning':
                btn.classList.add(Constants.CSS_CLASSES.SCANNING);
                btn.disabled = true;
                if (scanTitle) scanTitle.textContent = '스캔 중...';
                break;
                
            case 'disabled':
                btn.classList.add('disabled');
                btn.disabled = true;
                if (scanTitle) scanTitle.textContent = '스캔 불가';
                break;
                
            case 'ready':
            default:
                btn.disabled = false;
                if (scanTitle) scanTitle.textContent = '스마트 스캔 시작';
                break;
        }
    }
    
    /**
     * 스캔 진행률 업데이트
     * @param {Object} progress - 진행률 데이터
     */
    updateScanProgress(progress) {
        if (progress?.processed && progress?.total) {
            const percentage = ((progress.processed / progress.total) * 100).toFixed(1);
            this.updateScanStatus(`스캔 진행 중... ${progress.processed}/${progress.total} (${percentage}%)`, 'scanning');
        }
    }
    
    /**
     * 데이터 수집 진행률 업데이트
     * @param {Object} progress - 진행률 데이터
     */
    updateDataCollectionProgress(progress) {
        if (progress?.processed && progress?.total) {
            const percentage = ((progress.processed / progress.total) * 100).toFixed(1);
            this.updateScanStatus(`데이터 수집 중... ${progress.processed}/${progress.total} (${percentage}%)`, 'scanning');
        }
    }
    
    /**
     * 분석 진행률 업데이트
     * @param {Object} progress - 진행률 데이터
     */
    updateAnalysisProgress(progress) {
        if (progress?.processed && progress?.total) {
            const percentage = ((progress.processed / progress.total) * 100).toFixed(1);
            this.updateScanStatus(`분석 중... ${progress.processed}/${progress.total} (${percentage}%)`, 'scanning');
        }
    }
    
    /**
     * 자동 업데이트 상태 업데이트
     * @param {string} status - 상태 텍스트
     * @param {boolean} isActive - 활성 상태
     */
    updateAutoUpdateStatus(status, isActive) {
        if (this.elements.autoUpdateStatus) {
            this.elements.autoUpdateStatus.textContent = status;
        }
        
        const autoUpdateBtn = document.getElementById('autoUpdateToggleBtn');
        if (autoUpdateBtn) {
            if (isActive) {
                autoUpdateBtn.classList.add(Constants.CSS_CLASSES.ACTIVE);
            } else {
                autoUpdateBtn.classList.remove(Constants.CSS_CLASSES.ACTIVE);
            }
        }
    }
    
    /**
     * 자동 업데이트 진행률 업데이트
     * @param {Object} progress - 진행률 데이터
     */
    updateAutoUpdateProgress(progress) {
        if (this.elements.autoUpdateTimer && progress.timeRemaining) {
            this.elements.autoUpdateTimer.textContent = `${Math.ceil(progress.timeRemaining / 1000)}초 후`;
        }
        
        if (this.elements.autoUpdateProgress && progress.percentage !== undefined) {
            this.elements.autoUpdateProgress.style.width = `${progress.percentage}%`;
            this.elements.autoUpdateProgress.style.opacity = progress.percentage > 0 ? '1' : '0';
        }
        
        // 자동 업데이트 완료 처리
        if (progress.completed === true) {
            this.updateAutoUpdateStatus('업데이트 완료', true);
            console.log('✅ 자동 업데이트 완료 - UI 상태 업데이트됨');
        }
    }
    
    /**
     * 에러 메시지 표시
     * @param {string} message - 에러 메시지
     */
    showError(message) {
        this.updateScanStatus(message, 'error');
        
        // 3초 후 기본 상태로 복귀
        setTimeout(() => {
            this.updateScanStatus('준비됨', 'default');
        }, 3000);
    }
    
    /**
     * 성공 메시지 표시
     * @param {string} message - 성공 메시지
     */
    showSuccess(message) {
        this.updateScanStatus(message, 'success');
        
        // 3초 후 기본 상태로 복귀
        setTimeout(() => {
            this.updateScanStatus('준비됨', 'default');
        }, 3000);
    }
    
    /**
     * 주식 상세 정보 표시
     * @param {Object} stock - 주식 데이터
     */
    showStockDetails(stock) {
        // 간단한 알림으로 상세 정보 표시 (향후 모달로 확장 가능)
        const details = `
종목: ${stock.ticker}
현재가: ${Utils.formatCurrency(stock.currentPrice)}
진입가: ${Utils.formatCurrency(stock.entryPrice || 0)}
변동성: ${Utils.formatPercentage(stock.volatility || 0, 1)}
점수: ${stock.score || 0}
신뢰도: ${this.getConfidenceText(stock.confidence)}
        `.trim();
        
        alert(details);
    }
    
    /**
     * 모든 결과 표시 (향후 확장용)
     * @param {string} type - 결과 타입
     */
    showAllResults(type) {
        console.log(`모든 ${type} 결과 표시 요청됨`);
        // 향후 모달이나 별도 페이지로 확장 가능
    }
    
    /**
     * UI 초기화
     */
    reset() {
        // 대시보드 초기화
        this.updateStatWithAnimation(this.elements.breakoutCount, 0);
        this.updateStatWithAnimation(this.elements.waitingCount, 0);
        this.updateStatWithAnimation(this.elements.totalScanned, 0);
        this.updateStatWithAnimation(this.elements.errorCount, 0);
        
        // 결과 컨테이너 초기화
        if (this.elements.breakoutStocks) {
            this.elements.breakoutStocks.innerHTML = '<div class="no-results">스마트 스캔을 시작하여 돌파 종목을 찾아보세요!</div>';
        }
        
        if (this.elements.waitingStocks) {
            this.elements.waitingStocks.innerHTML = '<div class="no-results">스마트 스캔을 시작하여 대기 종목을 찾아보세요!</div>';
        }
        
        // 상태 초기화
        this.updateScanStatus('준비됨', 'default');
        this.setScanButtonState('ready');
    }
}

// 전역으로 노출
window.UIRenderer = UIRenderer;