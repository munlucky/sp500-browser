/**
 * 애플리케이션 상수 정의
 * 프로젝트 전반에서 사용되는 상수들을 중앙 관리
 */
const Constants = {
    // API 설정
    API: {
        CORS_PROXY: 'https://api.allorigins.win/raw?url=',
        YAHOO_FINANCE_BASE: 'https://query1.finance.yahoo.com/v8/finance/chart/',
        RATE_LIMIT_MS: 10000, // 1초
        MAX_RETRIES: 3,
        TIMEOUT_MS: 10000 // 10초
    },
    
    // 스캔 설정
    SCAN: {
        DEFAULT_VOLATILITY_MIN: 2,
        DEFAULT_VOLATILITY_MAX: 8,
        DEFAULT_MIN_VOLUME: 1000000,
        BREAKOUT_MULTIPLIER: 0.6,
        MAX_CONCURRENT_REQUESTS: 5,
        BATCH_SIZE: 10
    },
    
    // 자동 업데이트 설정
    AUTO_UPDATE: {
        DEFAULT_INTERVAL_MS: 60000, // 1분
        MIN_INTERVAL_MS: 30000, // 30초
        MAX_INTERVAL_MS: 300000, // 5분
        PROGRESS_UPDATE_MS: 100 // 진행률 업데이트 간격
    },
    
    // 캐시 설정
    CACHE: {
        SP500_TICKERS_TTL_HOURS: 24 * 7, // 7일
        STOCK_DATA_TTL_MINUTES: 5,
        RESULTS_TTL_MINUTES: 30,
        MAX_CACHE_SIZE_MB: 3
    },
    
    // UI 설정
    UI: {
        ANIMATION_DURATION_MS: 300,
        SCROLL_COMPACT_THRESHOLD: 50,
        CARD_ANIMATION_DELAY_MS: 100,
        MAX_DISPLAYED_BREAKOUT: 10,
        MAX_DISPLAYED_WAITING: 15
    },
    
    // 알림 설정
    NOTIFICATIONS: {
        ICON_URL: '/icons/icon-192.png',
        DEFAULT_DURATION_MS: 5000,
        MAX_NOTIFICATIONS_PER_MINUTE: 10,
        SOUND_ENABLED: true
    },
    
    // 로깅 설정
    LOGGING: {
        MAX_LOGS: 1000,
        LOG_LEVELS: {
            ERROR: 'error',
            WARN: 'warn',
            INFO: 'info',
            DEBUG: 'debug'
        },
        CONSOLE_OVERRIDE: true
    },
    
    // 저장소 키
    STORAGE_KEYS: {
        SETTINGS: 'sp500_settings',
        RESULTS: 'sp500_results',
        TICKERS: 'sp500_tickers',
        LOGS: 'sp500_logs',
        API_COUNTS: 'api_request_counts',
        WATCHLIST: 'sp500_watchlist'
    },
    
    // 에러 코드
    ERROR_CODES: {
        NETWORK_ERROR: 'NETWORK_ERROR',
        API_LIMIT: 'API_LIMIT',
        INVALID_DATA: 'INVALID_DATA',
        STORAGE_FULL: 'STORAGE_FULL',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        TIMEOUT: 'TIMEOUT',
        UNAUTHORIZED: 'UNAUTHORIZED',
        NOT_FOUND: 'NOT_FOUND'
    },
    
    // 이벤트 이름
    EVENTS: {
        // 스캔 관련
        SCAN_STARTED: 'scan:started',
        SCAN_PROGRESS: 'scan:progress',
        SCAN_COMPLETED: 'scan:completed',
        SCAN_ERROR: 'scan:error',
        SCAN_CANCELLED: 'scan:cancelled',
        
        // 자동 업데이트 관련
        AUTO_UPDATE_STARTED: 'auto-update:started',
        AUTO_UPDATE_STOPPED: 'auto-update:stopped',
        AUTO_UPDATE_PROGRESS: 'auto-update:progress',
        AUTO_UPDATE_ERROR: 'auto-update:error',
        
        // 데이터 수집 관련
        DATA_COLLECTION_STARTED: 'data-collection:started',
        DATA_COLLECTION_PROGRESS: 'data-collection:progress',
        DATA_COLLECTION_COMPLETED: 'data-collection:completed',
        DATA_COLLECTION_ERROR: 'data-collection:error',
        
        // 분석 관련
        ANALYSIS_STARTED: 'analysis:started',
        ANALYSIS_PROGRESS: 'analysis:progress',
        ANALYSIS_COMPLETED: 'analysis:completed',
        ANALYSIS_ERROR: 'analysis:error',
        
        // UI 관련
        UI_UPDATE_DASHBOARD: 'ui:update-dashboard',
        UI_UPDATE_RESULTS: 'ui:update-results',
        UI_SHOW_ERROR: 'ui:show-error',
        UI_SHOW_SUCCESS: 'ui:show-success',
        
        // 시스템 관련
        APP_INITIALIZED: 'app:initialized',
        APP_ERROR: 'app:error',
        ONLINE: 'system:online',
        OFFLINE: 'system:offline'
    },
    
    // CSS 클래스
    CSS_CLASSES: {
        HIDDEN: 'hidden',
        ACTIVE: 'active',
        LOADING: 'loading',
        ERROR: 'error',
        SUCCESS: 'success',
        SCANNING: 'scanning',
        COMPACT: 'compact',
        UPDATED: 'updated'
    },
    
    // 날짜/시간 포맷
    DATE_FORMATS: {
        ISO: 'YYYY-MM-DD',
        US: 'MM/DD/YYYY',
        EU: 'DD/MM/YYYY',
        TIME_12H: 'hh:mm A',
        TIME_24H: 'HH:mm',
        DATETIME: 'YYYY-MM-DD HH:mm:ss'
    },
    
    // 수치 임계값
    THRESHOLDS: {
        HIGH_MEMORY_USAGE_MB: 100,
        HIGH_STORAGE_USAGE_PERCENT: 80,
        LOW_VOLUME: 500000,
        HIGH_VOLUME: 5000000,
        SIGNIFICANT_PRICE_CHANGE_PERCENT: 5
    }
};

// 읽기 전용으로 만들기 (깊은 고정)
function deepFreeze(obj) {
    // 먼저 중첩된 객체들을 freeze
    Object.getOwnPropertyNames(obj).forEach(function(prop) {
        if (obj[prop] !== null && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function')) {
            deepFreeze(obj[prop]);
        }
    });
    // 그 다음 자기 자신을 freeze
    return Object.freeze(obj);
}

// 전역으로 노출 (읽기 전용)
try {
    window.Constants = deepFreeze(Constants);
    
    // freeze 검증
    const originalValue = window.Constants.API.RATE_LIMIT_MS;
    try {
        window.Constants.API.RATE_LIMIT_MS = 9999;
        if (window.Constants.API.RATE_LIMIT_MS === 9999) {
            console.error('❌ Constants freeze 실패: 수정이 가능함');
        } else {
            console.log('✅ Constants 객체가 읽기 전용으로 설정됨');
        }
    } catch (freezeError) {
        console.log('✅ Constants 객체가 읽기 전용으로 설정됨 (수정 시 오류 발생)');
    }
    
} catch (error) {
    console.error('❌ Constants freeze 실패:', error);
    window.Constants = Constants;
}