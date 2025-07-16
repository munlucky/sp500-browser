/**
 * 개발 도구 및 디버깅 유틸리티
 * 개발 중에만 사용하는 편의 기능들
 */

/**
 * 개발 도구 설정
 */
const DEV_CONFIG = {
    // 개발 모드 활성화 여부
    ENABLED: false,
    
    // 자동 리로드 감지
    AUTO_RELOAD: false,
    
    // 성능 프로파일링
    PERFORMANCE_PROFILING: true,
    
    // 메모리 누수 감지
    MEMORY_LEAK_DETECTION: true,
    
    // API 호출 로깅
    API_CALL_LOGGING: true,
    
    // 상태 변화 추적
    STATE_TRACKING: true
};

/**
 * 개발 도구 클래스
 */
class DevelopmentTools {
    constructor() {
        this.isEnabled = DEV_CONFIG.ENABLED;
        this.performanceMarks = new Map();
        this.memoryBaseline = null;
        this.apiCallCount = 0;
        this.stateHistory = [];
        
        if (this.isEnabled) {
            this.initialize();
        }
    }
    
    /**
     * 개발 도구 초기화
     */
    initialize() {
        console.log('🛠️ 개발 도구 초기화됨');
        
        this.setupPerformanceMonitoring();
        this.setupMemoryMonitoring();
        this.setupAPILogging();
        this.setupStateTracking();
        this.setupDebugCommands();
        this.addDevToolsPanel();
    }
    
    /**
     * 성능 모니터링 설정
     */
    setupPerformanceMonitoring() {
        if (!DEV_CONFIG.PERFORMANCE_PROFILING) return;
        
        // 페이지 로드 성능 측정
        window.addEventListener('load', () => {
            if (performance.timing) {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                console.log(`📊 페이지 로드 시간: ${loadTime}ms`);
            }
        });
        
        // 함수 실행 시간 측정 헬퍼
        window.timeFunction = (func, name) => {
            return (...args) => {
                const start = performance.now();
                const result = func.apply(this, args);
                const end = performance.now();
                console.log(`⏱️ ${name}: ${(end - start).toFixed(2)}ms`);
                return result;
            };
        };
    }
    
    /**
     * 메모리 모니터링 설정
     */
    setupMemoryMonitoring() {
        if (!DEV_CONFIG.MEMORY_LEAK_DETECTION || !performance.memory) return;
        
        this.memoryBaseline = performance.memory.usedJSHeapSize;
        
        setInterval(() => {
            const current = performance.memory.usedJSHeapSize;
            const growth = current - this.memoryBaseline;
            const growthMB = (growth / 1024 / 1024).toFixed(2);
            
            if (growth > 10 * 1024 * 1024) { // 10MB 증가
                console.warn(`🚨 메모리 사용량 증가: +${growthMB}MB`);
            }
            
            // 메모리 사용량이 100MB 초과 시 경고
            const currentMB = (current / 1024 / 1024).toFixed(2);
            if (current > 100 * 1024 * 1024) {
                console.warn(`🚨 높은 메모리 사용량: ${currentMB}MB`);
            }
        }, 30000); // 30초마다 확인
    }
    
    /**
     * API 호출 로깅 설정
     */
    setupAPILogging() {
        if (!DEV_CONFIG.API_CALL_LOGGING) return;
        
        // fetch 함수 래핑
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            this.apiCallCount++;
            const url = args[0];
            console.log(`🌐 API 호출 #${this.apiCallCount}: ${url}`);
            
            const start = performance.now();
            return originalFetch.apply(this, args)
                .then(response => {
                    const end = performance.now();
                    console.log(`📡 API 응답 (${(end - start).toFixed(2)}ms): ${response.status} ${url}`);
                    return response;
                })
                .catch(error => {
                    const end = performance.now();
                    console.error(`❌ API 오류 (${(end - start).toFixed(2)}ms): ${url}`, error);
                    throw error;
                });
        };
    }
    
    /**
     * 상태 변화 추적 설정
     */
    setupStateTracking() {
        if (!DEV_CONFIG.STATE_TRACKING) return;
        
        // EventBus 이벤트 로깅
        const originalEmit = EventBus.prototype.emit;
        EventBus.prototype.emit = function(event, data) {
            this.stateHistory.push({
                timestamp: Date.now(),
                event,
                data: JSON.stringify(data).substring(0, 100) + '...'
            });
            
            // 최근 100개 이벤트만 유지
            if (this.stateHistory.length > 100) {
                this.stateHistory.shift();
            }
            
            console.log(`🔄 이벤트: ${event}`, data);
            return originalEmit.call(this, event, data);
        }.bind(this);
    }
    
    /**
     * 디버그 명령어 설정
     */
    setupDebugCommands() {
        // 전역 디버그 객체
        window.debug = {
            // 메모리 정보 출력
            memory: () => {
                if (performance.memory) {
                    const memory = performance.memory;
                    console.table({
                        'Used': `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                        'Total': `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
                        'Limit': `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
                    });
                }
            },
            
            // 이벤트 히스토리 출력
            events: () => {
                console.table(this.stateHistory.slice(-20)); // 최근 20개
            },
            
            // API 호출 통계
            api: () => {
                console.log(`총 API 호출 수: ${this.apiCallCount}`);
            },
            
            // 성능 마크 출력
            performance: () => {
                const measures = performance.getEntriesByType('measure');
                console.table(measures.map(m => ({
                    name: m.name,
                    duration: `${m.duration.toFixed(2)}ms`
                })));
            },
            
            // 로컬스토리지 정보
            storage: () => {
                const usage = StorageManager.getStorageInfo();
                console.table({
                    'Used': `${usage.used} MB`,
                    'Available': `${usage.available} MB`,
                    'Percentage': `${usage.percentage}%`,
                    'Items': usage.itemCount
                });
            },
            
            // 컴포넌트 상태 출력
            components: () => {
                const components = {
                    'Scanner': window.stockScanner ? 'Active' : 'Inactive',
                    'EventBus': window.getGlobalEventBus ? 'Active' : 'Inactive',
                    'Dashboard': document.querySelector('.live-dashboard') ? 'Present' : 'Missing',
                    'Logger': window.logger ? 'Active' : 'Inactive'
                };
                console.table(components);
            },
            
            // 전체 시스템 상태
            status: () => {
                this.memory();
                this.api();
                this.components();
                this.storage();
            }
        };
        
        console.log('💻 디버그 명령어 사용 가능:');
        console.log('  debug.memory() - 메모리 정보');
        console.log('  debug.events() - 이벤트 히스토리');
        console.log('  debug.api() - API 호출 통계');
        console.log('  debug.storage() - 스토리지 정보');
        console.log('  debug.components() - 컴포넌트 상태');
        console.log('  debug.status() - 전체 상태');
    }
    
    /**
     * 개발 도구 패널 추가
     */
    addDevToolsPanel() {
        const panel = document.createElement('div');
        panel.id = 'dev-tools-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #1a1a1a;
            color: #00ff00;
            padding: 10px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10002;
            min-width: 200px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 1px solid #333;
        `;
        
        panel.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold;">🛠️ DEV TOOLS</div>
            <div id="dev-memory">Memory: --</div>
            <div id="dev-api">API Calls: ${this.apiCallCount}</div>
            <div id="dev-events">Events: ${this.stateHistory.length}</div>
            <div style="margin-top: 8px;">
                <button onclick="debug.status()" style="background: #333; color: #00ff00; border: 1px solid #555; padding: 2px 6px; border-radius: 3px; font-size: 10px;">STATUS</button>
                <button onclick="console.clear()" style="background: #333; color: #00ff00; border: 1px solid #555; padding: 2px 6px; border-radius: 3px; font-size: 10px;">CLEAR</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 실시간 업데이트
        setInterval(() => {
            this.updateDevPanel();
        }, 2000);
    }
    
    /**
     * 개발 패널 업데이트
     */
    updateDevPanel() {
        const memoryEl = document.getElementById('dev-memory');
        const apiEl = document.getElementById('dev-api');
        const eventsEl = document.getElementById('dev-events');
        
        if (performance.memory && memoryEl) {
            const mb = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            memoryEl.textContent = `Memory: ${mb}MB`;
        }
        
        if (apiEl) {
            apiEl.textContent = `API Calls: ${this.apiCallCount}`;
        }
        
        if (eventsEl) {
            eventsEl.textContent = `Events: ${this.stateHistory.length}`;
        }
    }
    
    /**
     * 성능 마크 시작
     */
    startMark(name) {
        if (performance.mark) {
            performance.mark(`${name}-start`);
            this.performanceMarks.set(name, Date.now());
        }
    }
    
    /**
     * 성능 마크 종료
     */
    endMark(name) {
        if (performance.mark && performance.measure) {
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
            
            const startTime = this.performanceMarks.get(name);
            if (startTime) {
                const duration = Date.now() - startTime;
                console.log(`⏱️ ${name}: ${duration}ms`);
                this.performanceMarks.delete(name);
            }
        }
    }
    
    /**
     * 개발 도구 비활성화
     */
    disable() {
        this.isEnabled = false;
        
        // UI 제거
        document.getElementById('dev-tools-panel')?.remove();
        
        // 전역 객체 제거
        delete window.debug;
        delete window.timeFunction;
        
        console.log('🛠️ 개발 도구 비활성화됨');
    }
}

/**
 * 코드 품질 검사 도구
 */
class CodeQualityChecker {
    constructor() {
        this.issues = [];
    }
    
    /**
     * 전체 코드 품질 검사
     */
    checkCodeQuality() {
        console.log('🔍 코드 품질 검사 시작...');
        
        this.checkGlobalVariables();
        this.checkMemoryLeaks();
        this.checkPerformanceIssues();
        this.checkSecurityIssues();
        
        this.reportIssues();
    }
    
    /**
     * 전역 변수 검사
     */
    checkGlobalVariables() {
        const globalVars = Object.keys(window).filter(key => {
            return !['console', 'document', 'window', 'navigator', 'location', 'history', 'screen'].includes(key);
        });
        
        const suspiciousGlobals = globalVars.filter(key => {
            return key.toLowerCase().includes('temp') || 
                   key.toLowerCase().includes('test') ||
                   key.startsWith('_');
        });
        
        if (suspiciousGlobals.length > 0) {
            this.issues.push({
                type: 'Global Variables',
                severity: 'WARNING',
                message: `의심스러운 전역 변수: ${suspiciousGlobals.join(', ')}`
            });
        }
    }
    
    /**
     * 메모리 누수 검사
     */
    checkMemoryLeaks() {
        if (!performance.memory) return;
        
        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        
        if (usedMB > 100) {
            this.issues.push({
                type: 'Memory',
                severity: 'ERROR',
                message: `높은 메모리 사용량: ${usedMB.toFixed(2)}MB`
            });
        }
    }
    
    /**
     * 성능 문제 검사
     */
    checkPerformanceIssues() {
        // DOM 쿼리 횟수 검사 (단순화된 예시)
        const elements = document.querySelectorAll('*');
        if (elements.length > 1000) {
            this.issues.push({
                type: 'Performance',
                severity: 'WARNING',
                message: `DOM 요소가 많음: ${elements.length}개`
            });
        }
        
        // 이벤트 리스너 검사
        const eventListeners = Array.from(document.querySelectorAll('*'))
            .filter(el => el.onclick || el.onload || el.onchange);
        
        if (eventListeners.length > 50) {
            this.issues.push({
                type: 'Performance',
                severity: 'WARNING',
                message: `이벤트 리스너가 많음: ${eventListeners.length}개`
            });
        }
    }
    
    /**
     * 보안 문제 검사
     */
    checkSecurityIssues() {
        // innerHTML 사용 검사 (XSS 위험)
        const scripts = Array.from(document.scripts);
        const hasInnerHTML = scripts.some(script => script.textContent.includes('innerHTML'));
        
        if (hasInnerHTML) {
            this.issues.push({
                type: 'Security',
                severity: 'WARNING',
                message: 'innerHTML 사용 감지 (XSS 위험 가능)'
            });
        }
    }
    
    /**
     * 문제점 보고
     */
    reportIssues() {
        if (this.issues.length === 0) {
            console.log('✅ 코드 품질 검사: 문제 없음');
            return;
        }
        
        console.log(`🔍 코드 품질 검사 완료: ${this.issues.length}개 문제 발견`);
        
        this.issues.forEach(issue => {
            const emoji = issue.severity === 'ERROR' ? '❌' : '⚠️';
            console.log(`${emoji} [${issue.type}] ${issue.message}`);
        });
    }
}

// 개발 도구 인스턴스 생성
let devTools = null;
let qualityChecker = null;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (DEV_CONFIG.ENABLED) {
        devTools = new DevelopmentTools();
        qualityChecker = new CodeQualityChecker();
        
        // 5초 후 코드 품질 검사
        setTimeout(() => {
            qualityChecker.checkCodeQuality();
        }, 5000);
    }
});

// 전역으로 노출
window.devTools = devTools;
window.qualityChecker = qualityChecker;
window.DEV_CONFIG = DEV_CONFIG;