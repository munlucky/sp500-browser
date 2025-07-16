/**
 * 테스트 코드 정리 및 제거 스크립트
 * 실제 배포 시 개발용 테스트 코드들을 제거하거나 비활성화
 */

/**
 * 테스트 모드 설정
 */
const TEST_CONFIG = {
    // 프로덕션 모드에서는 false로 설정
    ENABLE_TESTS: false,
    
    // 개별 테스트 활성화/비활성화
    ENABLE_PHASE1_TEST: false,  // Phase 1 테스트 비활성화
    ENABLE_PHASE2_TEST: false,  // Phase 2 테스트 비활성화  
    ENABLE_PHASE3_TEST: false,  // Phase 3 테스트 비활성화
    ENABLE_INTEGRATION_TEST: false,  // 통합 테스트만 유지
    
    // 테스트 실행 지연 (ms)
    TEST_DELAY: 5000,  // 5초 후 실행 (실제 사용에는 더 길게)
    
    // 자동 실행 여부
    AUTO_RUN: false,  // 수동 실행으로 변경
    
    // 콘솔 로그 레벨
    LOG_LEVEL: 'ERROR' // 'DEBUG', 'INFO', 'WARN', 'ERROR'
};

/**
 * 테스트 관리자
 */
class TestManager {
    constructor() {
        this.isTestMode = TEST_CONFIG.ENABLE_TESTS;
        this.testResults = new Map();
        
        if (this.isTestMode) {
            this.initializeTestEnvironment();
        }
    }
    
    /**
     * 테스트 환경 초기화
     */
    initializeTestEnvironment() {
        // 테스트 모드 표시
        this.addTestModeIndicator();
        
        // 테스트 컨트롤 패널 추가
        this.addTestControlPanel();
        
        // 키보드 단축키 설정
        this.setupTestShortcuts();
    }
    
    /**
     * 테스트 모드 표시기 추가
     */
    addTestModeIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'test-mode-indicator';
        indicator.innerHTML = '🧪 TEST MODE';
        indicator.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10001;
            cursor: pointer;
        `;
        
        indicator.addEventListener('click', () => {
            this.toggleTestControlPanel();
        });
        
        document.body.appendChild(indicator);
    }
    
    /**
     * 테스트 컨트롤 패널 추가
     */
    addTestControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'test-control-panel';
        panel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 300px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            display: none;
            font-family: monospace;
            font-size: 12px;
        `;
        
        panel.innerHTML = `
            <h3>🧪 테스트 컨트롤</h3>
            
            <div style="margin: 10px 0;">
                <button id="run-integration-test">통합 테스트 실행</button>
                <button id="run-phase-tests">단계별 테스트 실행</button>
            </div>
            
            <div style="margin: 10px 0;">
                <label>
                    <input type="checkbox" id="auto-test-enabled" ${TEST_CONFIG.AUTO_RUN ? 'checked' : ''}>
                    자동 테스트 실행
                </label>
            </div>
            
            <div style="margin: 10px 0;">
                <label>로그 레벨:</label>
                <select id="log-level-select">
                    <option value="DEBUG" ${TEST_CONFIG.LOG_LEVEL === 'DEBUG' ? 'selected' : ''}>DEBUG</option>
                    <option value="INFO" ${TEST_CONFIG.LOG_LEVEL === 'INFO' ? 'selected' : ''}>INFO</option>
                    <option value="WARN" ${TEST_CONFIG.LOG_LEVEL === 'WARN' ? 'selected' : ''}>WARN</option>
                    <option value="ERROR" ${TEST_CONFIG.LOG_LEVEL === 'ERROR' ? 'selected' : ''}>ERROR</option>
                </select>
            </div>
            
            <div id="test-results" style="margin-top: 10px; max-height: 200px; overflow-y: auto;">
                <div style="color: #666;">테스트 결과가 여기에 표시됩니다.</div>
            </div>
            
            <div style="margin-top: 10px;">
                <button id="clear-test-results">결과 지우기</button>
                <button id="export-test-results">결과 내보내기</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        // this.setupControlPanelEvents();
    }
    
    /**
     * 컨트롤 패널 이벤트 설정
     */
    setupControlPanelEvents() {
        // 통합 테스트 실행
        document.getElementById('run-integration-test')?.addEventListener('click', () => {
            if (window.runIntegrationTest) {
                this.logTestResult('통합 테스트 시작...', 'INFO');
                window.runIntegrationTest().then(results => {
                    this.displayTestResults(results);
                });
            }
        });
        
        // 단계별 테스트 실행
        document.getElementById('run-phase-tests')?.addEventListener('click', () => {
            this.runPhaseTests();
        });
        
        // 자동 테스트 토글
        document.getElementById('auto-test-enabled')?.addEventListener('change', (e) => {
            TEST_CONFIG.AUTO_RUN = e.target.checked;
            this.logTestResult(`자동 테스트: ${e.target.checked ? 'ON' : 'OFF'}`, 'INFO');
        });
        
        // 로그 레벨 변경
        document.getElementById('log-level-select')?.addEventListener('change', (e) => {
            TEST_CONFIG.LOG_LEVEL = e.target.value;
            this.logTestResult(`로그 레벨: ${e.target.value}`, 'INFO');
        });
        
        // 결과 지우기
        document.getElementById('clear-test-results')?.addEventListener('click', () => {
            const resultsDiv = document.getElementById('test-results');
            if (resultsDiv) {
                resultsDiv.innerHTML = '<div style="color: #666;">테스트 결과가 지워졌습니다.</div>';
            }
        });
        
        // 결과 내보내기
        document.getElementById('export-test-results')?.addEventListener('click', () => {
            this.exportTestResults();
        });
    }
    
    /**
     * 테스트 컨트롤 패널 토글
     */
    toggleTestControlPanel() {
        const panel = document.getElementById('test-control-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    /**
     * 키보드 단축키 설정
     */
    setupTestShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+T: 테스트 패널 토글
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTestControlPanel();
            }
            
            // Ctrl+Shift+R: 통합 테스트 실행
            if (e.ctrlKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                if (window.runIntegrationTest) {
                    window.runIntegrationTest();
                }
            }
            
            // Ctrl+Shift+C: 테스트 결과 지우기
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.clearTestResults();
            }
        });
    }
    
    /**
     * 단계별 테스트 실행
     */
    async runPhaseTests() {
        this.logTestResult('단계별 테스트 시작...', 'INFO');
        
        // Phase 1 테스트
        if (TEST_CONFIG.ENABLE_PHASE1_TEST && window.testPhase1) {
            try {
                await window.testPhase1();
                this.logTestResult('Phase 1 테스트 완료', 'INFO');
            } catch (error) {
                this.logTestResult(`Phase 1 테스트 실패: ${error.message}`, 'ERROR');
            }
        }
        
        // Phase 2 테스트
        if (TEST_CONFIG.ENABLE_PHASE2_TEST && window.testPhase2) {
            try {
                await window.testPhase2();
                this.logTestResult('Phase 2 테스트 완료', 'INFO');
            } catch (error) {
                this.logTestResult(`Phase 2 테스트 실패: ${error.message}`, 'ERROR');
            }
        }
        
        // Phase 3 테스트
        if (TEST_CONFIG.ENABLE_PHASE3_TEST && window.testPhase3) {
            try {
                await window.testPhase3();
                this.logTestResult('Phase 3 테스트 완료', 'INFO');
            } catch (error) {
                this.logTestResult(`Phase 3 테스트 실패: ${error.message}`, 'ERROR');
            }
        }
        
        this.logTestResult('단계별 테스트 완료', 'INFO');
    }
    
    /**
     * 테스트 결과 로그
     */
    logTestResult(message, level = 'INFO') {
        const shouldLog = this.shouldLogLevel(level);
        if (!shouldLog) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const resultsDiv = document.getElementById('test-results');
        
        if (resultsDiv) {
            const logEntry = document.createElement('div');
            logEntry.style.cssText = `
                margin: 2px 0;
                padding: 4px;
                border-radius: 4px;
                font-size: 11px;
                ${this.getLogLevelStyle(level)}
            `;
            logEntry.innerHTML = `[${timestamp}] ${level}: ${message}`;
            resultsDiv.appendChild(logEntry);
            resultsDiv.scrollTop = resultsDiv.scrollHeight;
        }
        
        // 콘솔에도 출력
        console.log(`[TEST] ${level}: ${message}`);
    }
    
    /**
     * 로그 레벨 확인
     */
    shouldLogLevel(level) {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const currentLevelIndex = levels.indexOf(TEST_CONFIG.LOG_LEVEL);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }
    
    /**
     * 로그 레벨별 스타일
     */
    getLogLevelStyle(level) {
        const styles = {
            DEBUG: 'background: #f0f0f0; color: #666;',
            INFO: 'background: #e3f2fd; color: #1976d2;',
            WARN: 'background: #fff3e0; color: #f57c00;',
            ERROR: 'background: #ffebee; color: #d32f2f;'
        };
        return styles[level] || styles.INFO;
    }
    
    /**
     * 테스트 결과 표시
     */
    displayTestResults(results) {
        const successRate = (results.passed / results.total * 100).toFixed(1);
        this.logTestResult(`테스트 완료: ${results.passed}/${results.total} 성공 (${successRate}%)`, 'INFO');
        
        if (results.failed > 0) {
            results.details
                .filter(detail => detail.status === 'FAILED')
                .forEach(detail => {
                    this.logTestResult(`FAIL: ${detail.category} > ${detail.test}`, 'ERROR');
                });
        }
    }
    
    /**
     * 테스트 결과 내보내기
     */
    exportTestResults() {
        const results = {
            timestamp: new Date().toISOString(),
            config: TEST_CONFIG,
            testResults: Array.from(this.testResults.entries()),
            integrationResults: window.integrationTestResults || null
        };
        
        const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-results-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.logTestResult('테스트 결과를 파일로 내보냈습니다.', 'INFO');
    }
    
    /**
     * 테스트 결과 지우기
     */
    clearTestResults() {
        this.testResults.clear();
        const resultsDiv = document.getElementById('test-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = '<div style="color: #666;">테스트 결과가 지워졌습니다.</div>';
        }
    }
    
    /**
     * 프로덕션 모드 활성화
     */
    enableProductionMode() {
        // 테스트 UI 제거
        document.getElementById('test-mode-indicator')?.remove();
        document.getElementById('test-control-panel')?.remove();
        
        // 테스트 스크립트 비활성화
        TEST_CONFIG.ENABLE_TESTS = false;
        TEST_CONFIG.AUTO_RUN = false;
        
        // 테스트 관련 전역 변수 제거
        delete window.testPhase1;
        delete window.testPhase2;
        delete window.testPhase3;
        delete window.runIntegrationTest;
        delete window.integrationTestResults;
        
        // 콘솔 정리
        console.clear();
        console.log('🚀 프로덕션 모드 활성화됨');
        
        this.logTestResult('프로덕션 모드로 전환되었습니다.', 'INFO');
    }
}

/**
 * 테스트 비활성화 함수들
 */
function disableTestScripts() {
    // Phase 테스트 스크립트 비활성화
    const testScripts = [
        'js/core/phase1-test.js',
        'js/core/phase2-test.js', 
        'js/core/phase3-test.js',
        'js/core/integration-test.js'
    ];
    
    testScripts.forEach(src => {
        const scripts = document.querySelectorAll(`script[src="${src}"]`);
        scripts.forEach(script => {
            if (TEST_CONFIG.ENABLE_TESTS === false) {
                script.remove();
                console.log(`테스트 스크립트 제거됨: ${src}`);
            }
        });
    });
}

/**
 * 개발 모드 전용 기능들
 */
function addDevelopmentFeatures() {
    if (!TEST_CONFIG.ENABLE_TESTS) return;
    
    // 성능 모니터링
    if (performance.mark) {
        performance.mark('app-start');
        
        window.addEventListener('load', () => {
            performance.mark('app-loaded');
            performance.measure('app-load-time', 'app-start', 'app-loaded');
            
            const measure = performance.getEntriesByName('app-load-time')[0];
            console.log(`앱 로딩 시간: ${measure.duration.toFixed(2)}ms`);
        });
    }
    
    // 메모리 사용량 모니터링
    if (performance.memory) {
        setInterval(() => {
            const memory = performance.memory;
            const used = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            const total = Math.round(memory.totalJSHeapSize / 1024 / 1024);
            
            if (used > 50) { // 50MB 이상 사용 시 경고
                console.warn(`메모리 사용량 높음: ${used}MB / ${total}MB`);
            }
        }, 10000); // 10초마다 확인
    }
}

// 전역 테스트 매니저 인스턴스
let testManager = null;

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    if (TEST_CONFIG.ENABLE_TESTS === true) {
        testManager = new TestManager();
        addDevelopmentFeatures();
        
        // 자동 테스트 실행
        if (TEST_CONFIG.AUTO_RUN === true) {
            setTimeout(() => {
                if (window.runIntegrationTest) {
                    testManager.logTestResult('자동 통합 테스트 시작...', 'INFO');
                    window.runIntegrationTest();
                }
            }, TEST_CONFIG.TEST_DELAY);
        }
    } else {
        // 프로덕션 모드
        disableTestScripts();
        console.log('🚀 프로덕션 모드로 실행 중');
    }
});

// 전역으로 노출
window.TEST_CONFIG = TEST_CONFIG;
window.testManager = testManager;
window.disableTestScripts = disableTestScripts;