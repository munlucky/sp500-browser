/**
 * 로그 관리 시스템 - 화면 표시 및 파일 저장
 */
class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // 최대 로그 보관 개수
        this.logContainer = null;
        this.logLevels = {
            ERROR: { color: '#ef4444', icon: '❌', priority: 4 },
            WARN: { color: '#f59e0b', icon: '⚠️', priority: 3 },
            INFO: { color: '#3b82f6', icon: 'ℹ️', priority: 2 },
            SUCCESS: { color: '#10b981', icon: '✅', priority: 1 },
            DEBUG: { color: '#6b7280', icon: '🔍', priority: 0 }
        };
        this.currentFilter = 'ALL';
        this.autoScroll = true;
        
        // DOM이 로드된 후에 UI 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeUI();
                this.initializeKeyboardShortcuts();
            });
        } else {
            this.initializeUI();
            this.initializeKeyboardShortcuts();
        }
    }

    /**
     * UI 초기화
     */
    initializeUI() {
        // 로그 패널이 이미 있는지 확인
        if (document.getElementById('logPanel')) return;
        
        // 로그 패널 생성
        const logPanel = document.createElement('div');
        logPanel.id = 'logPanel';
        logPanel.className = 'log-panel hidden';
        
        logPanel.innerHTML = `
            <div class="log-header">
                <h3>📋 시스템 로그</h3>
                <div class="log-controls">
                    <select id="logFilter" class="log-filter">
                        <option value="ALL">모든 로그</option>
                        <option value="ERROR">오류</option>
                        <option value="WARN">경고</option>
                        <option value="INFO">정보</option>
                        <option value="SUCCESS">성공</option>
                        <option value="DEBUG">디버그</option>
                    </select>
                    <button id="clearLogsBtn" class="log-btn">🗑️ 클리어</button>
                    <button id="downloadLogsBtn" class="log-btn">💾 다운로드</button>
                    <button id="autoScrollBtn" class="log-btn active">📜 자동스크롤</button>
                    <button id="closeLogBtn" class="log-btn">✖️ 닫기</button>
                </div>
            </div>
            <div class="log-container" id="logContainer">
                <div class="log-welcome">
                    🚀 S&P 500 스캐너 로그 시스템이 시작되었습니다.<br>
                    <small>Ctrl+L (또는 Cmd+L)로 로그 패널을 열고 닫을 수 있습니다.</small>
                </div>
            </div>
        `;
        
        document.body.appendChild(logPanel);
        this.logContainer = document.getElementById('logContainer');
        
        this.bindEvents();
        
        // 초기화 메시지는 직접 콘솔에만 출력 (무한 루프 방지)
        if (window.originalConsole) {
            window.originalConsole.log('%c📋 [INFO] 로그 시스템 초기화 완료', 'color: #3b82f6');
        }
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        // 필터 변경
        document.getElementById('logFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.renderLogs();
        });

        // 클리어 버튼
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            this.clearLogs();
        });

        // 다운로드 버튼
        document.getElementById('downloadLogsBtn').addEventListener('click', () => {
            this.downloadLogs();
        });

        // 자동스크롤 토글
        document.getElementById('autoScrollBtn').addEventListener('click', (e) => {
            this.autoScroll = !this.autoScroll;
            e.target.classList.toggle('active', this.autoScroll);
            e.target.textContent = this.autoScroll ? '📜 자동스크롤' : '📜 수동스크롤';
        });

        // 닫기 버튼
        document.getElementById('closeLogBtn').addEventListener('click', () => {
            this.hide();
        });
    }

    /**
     * 키보드 단축키 초기화
     */
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+L 또는 Cmd+L로 로그 패널 토글
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * 로그 추가
     */
    log(level, message, data = null) {
        const timestamp = new Date();
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp,
            level,
            message,
            data,
            formattedTime: this.formatTime(timestamp)
        };

        this.logs.push(logEntry);

        // 최대 로그 수 제한
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // 화면에 표시
        this.addLogToUI(logEntry);

        // 로컬 스토리지에 저장 (최근 100개만)
        this.saveToStorage();

        // 원래 console.log도 실행 (오버라이드된 것이 아닌 원본 사용)
        if (window.originalConsole && window.originalConsole.log) {
            const levelConfig = this.logLevels[level] || this.logLevels.INFO;
            window.originalConsole.log(`%c${levelConfig.icon} [${level}] ${message}`, `color: ${levelConfig.color}`, data || '');
        }
    }

    /**
     * UI에 로그 항목 추가
     */
    addLogToUI(logEntry) {
        if (!this.logContainer) return;

        // 현재 필터에 맞지 않으면 표시하지 않음
        if (this.currentFilter !== 'ALL' && this.currentFilter !== logEntry.level) {
            return;
        }

        const levelConfig = this.logLevels[logEntry.level] || this.logLevels.INFO;
        const logElement = document.createElement('div');
        logElement.className = `log-entry log-${logEntry.level.toLowerCase()}`;
        logElement.dataset.logId = logEntry.id;

        let dataHtml = '';
        if (logEntry.data && this.hasValidData(logEntry.data)) {
            dataHtml = `<div class="log-data">${this.formatData(logEntry.data)}</div>`;
        }

        logElement.innerHTML = `
            <div class="log-main">
                <span class="log-icon">${levelConfig.icon}</span>
                <span class="log-time">${logEntry.formattedTime}</span>
                <span class="log-level">[${logEntry.level}]</span>
                <span class="log-message">${this.escapeHtml(logEntry.message)}</span>
            </div>
            ${dataHtml}
        `;

        this.logContainer.appendChild(logElement);

        // 자동 스크롤
        if (this.autoScroll) {
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }

        // 로그 항목이 너무 많으면 오래된 것 제거
        const logEntries = this.logContainer.querySelectorAll('.log-entry');
        if (logEntries.length > 500) {
            for (let i = 0; i < 100; i++) {
                if (logEntries[i]) {
                    logEntries[i].remove();
                }
            }
        }
    }

    /**
     * 모든 로그 다시 렌더링
     */
    renderLogs() {
        if (!this.logContainer) return;

        // 기존 로그 항목들 제거 (welcome 메시지 제외)
        const logEntries = this.logContainer.querySelectorAll('.log-entry');
        logEntries.forEach(entry => entry.remove());

        // 필터링된 로그들 다시 추가
        const filteredLogs = this.currentFilter === 'ALL' 
            ? this.logs 
            : this.logs.filter(log => log.level === this.currentFilter);

        // 최근 500개만 표시
        const recentLogs = filteredLogs.slice(-500);
        recentLogs.forEach(log => this.addLogToUI(log));
    }

    /**
     * 로그 클리어
     */
    clearLogs() {
        this.logs = [];
        if (this.logContainer) {
            this.logContainer.innerHTML = `
                <div class="log-welcome">
                    🗑️ 로그가 클리어되었습니다.
                </div>
            `;
        }
        this.saveToStorage();
    }

    /**
     * 로그 다운로드
     */
    downloadLogs() {
        const logData = this.logs.map(log => ({
            timestamp: log.timestamp.toISOString(),
            level: log.level,
            message: log.message,
            data: log.data
        }));

        const content = JSON.stringify(logData, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sp500-scanner-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.log('SUCCESS', `로그 파일 다운로드: ${a.download}`);
    }

    /**
     * 로컬 스토리지에 저장
     */
    saveToStorage() {
        try {
            const recentLogs = this.logs.slice(-100); // 최근 100개만 저장
            localStorage.setItem('sp500_scanner_logs', JSON.stringify(recentLogs));
        } catch (error) {
            console.error('로그 저장 실패:', error);
        }
    }

    /**
     * 로컬 스토리지에서 로드
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('sp500_scanner_logs');
            if (saved) {
                const savedLogs = JSON.parse(saved);
                savedLogs.forEach(log => {
                    log.timestamp = new Date(log.timestamp);
                    log.formattedTime = this.formatTime(log.timestamp);
                });
                this.logs = savedLogs;
                this.renderLogs();
                this.log('INFO', `저장된 로그 ${savedLogs.length}개를 불러왔습니다`);
            }
        } catch (error) {
            console.error('로그 로드 실패:', error);
        }
    }

    /**
     * 패널 표시/숨김
     */
    show() {
        const panel = document.getElementById('logPanel');
        if (panel) {
            panel.classList.remove('hidden');
        }
    }

    hide() {
        const panel = document.getElementById('logPanel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    toggle() {
        const panel = document.getElementById('logPanel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }

    /**
     * 헬퍼 메서드들
     */
    formatTime(date) {
        return date.toLocaleTimeString('ko-KR', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }

    formatData(data) {
        if (typeof data === 'object') {
            return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
        return this.escapeHtml(String(data));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    hasValidData(data) {
        if (data === null || data === undefined) return false;
        
        // 빈 배열 체크
        if (Array.isArray(data)) {
            return data.length > 0;
        }
        
        // 객체 체크 (null 제외)
        if (typeof data === 'object' && data !== null) {
            return Object.keys(data).length > 0;
        }
        
        // 문자열 체크
        if (typeof data === 'string') {
            return data.trim() !== '';
        }
        
        // 숫자, 불린 등은 모두 유효한 데이터로 간주
        return true;
    }

    // 편의 메서드들
    error(message, data) { this.log('ERROR', message, data); }
    warn(message, data) { this.log('WARN', message, data); }
    info(message, data) { this.log('INFO', message, data); }
    success(message, data) { this.log('SUCCESS', message, data); }
    debug(message, data) { this.log('DEBUG', message, data); }
}

// 전역 인스턴스 생성
window.logger = new Logger();

// 원본 console 함수들을 전역에 저장
if (typeof window !== 'undefined') {
    window.originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    };

    // 무한 루프 방지를 위한 플래그
    let isLogging = false;

    // console.log 확장 (기존 기능 유지하면서 UI에도 표시)
    console.log = function(...args) {
        // 원본 console.log 먼저 실행
        window.originalConsole.log.apply(console, args);
        
        // 무한 루프 방지
        if (isLogging || !window.logger) return;
        
        try {
            isLogging = true;
            
            if (args[0] && typeof args[0] === 'string') {
                const message = args[0];
                // 로거 자체의 메시지는 제외
                if (message.includes('[SUCCESS]') || message.includes('[ERROR]') || 
                    message.includes('[WARN]') || message.includes('[INFO]') || 
                    message.includes('[DEBUG]')) {
                    return;
                }
                
                // 특정 패턴의 로그만 UI에 표시
                const additionalData = args.slice(1).length > 0 ? args.slice(1) : null;
                
                if (message.includes('✅') || message.includes('🚀') || message.includes('📊')) {
                    window.logger.success(message.replace(/[✅🚀📊]/g, '').trim(), additionalData);
                } else if (message.includes('❌') || message.includes('💥')) {
                    window.logger.error(message.replace(/[❌💥]/g, '').trim(), additionalData);
                } else if (message.includes('⚠️') || message.includes('🔄')) {
                    window.logger.warn(message.replace(/[⚠️🔄]/g, '').trim(), additionalData);
                } else if (message.includes('📡') || message.includes('🔍')) {
                    window.logger.info(message.replace(/[📡🔍]/g, '').trim(), additionalData);
                }
            }
        } finally {
            isLogging = false;
        }
    };

    console.error = function(...args) {
        window.originalConsole.error.apply(console, args);
        if (!isLogging && window.logger) {
            try {
                isLogging = true;
                const additionalData = args.slice(1).length > 0 ? args.slice(1) : null;
                window.logger.error(args.join(' '), additionalData);
            } finally {
                isLogging = false;
            }
        }
    };

    console.warn = function(...args) {
        window.originalConsole.warn.apply(console, args);
        if (!isLogging && window.logger) {
            try {
                isLogging = true;
                const additionalData = args.slice(1).length > 0 ? args.slice(1) : null;
                window.logger.warn(args.join(' '), additionalData);
            } finally {
                isLogging = false;
            }
        }
    };
}