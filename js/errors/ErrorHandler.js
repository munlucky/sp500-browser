/**
 * 통합 에러 처리 시스템
 * 애플리케이션의 모든 에러를 중앙에서 처리
 */
class ErrorHandler {
    constructor(eventBus, logger) {
        this.eventBus = eventBus;
        this.logger = logger;
        this.errorCounts = new Map();
        this.lastErrors = [];
        this.maxLastErrors = 50;
        
        // 사용자 친화적 메시지 매핑
        this.friendlyMessages = {
            [Constants.ERROR_CODES.NETWORK_ERROR]: '네트워크 연결을 확인해주세요.',
            [Constants.ERROR_CODES.API_LIMIT]: 'API 사용량 한계에 도달했습니다. 잠시 후 다시 시도해주세요.',
            [Constants.ERROR_CODES.INVALID_DATA]: '데이터 형식이 올바르지 않습니다.',
            [Constants.ERROR_CODES.STORAGE_FULL]: '저장 공간이 부족합니다. 캐시를 정리합니다.',
            [Constants.ERROR_CODES.VALIDATION_ERROR]: '입력된 정보를 확인해주세요.',
            [Constants.ERROR_CODES.TIMEOUT]: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
            [Constants.ERROR_CODES.UNAUTHORIZED]: '인증이 필요합니다.',
            [Constants.ERROR_CODES.NOT_FOUND]: '요청한 데이터를 찾을 수 없습니다.'
        };
        
        this.setupGlobalErrorHandlers();
    }
    
    /**
     * 에러 처리 메인 메서드
     * @param {Error|AppError} error - 처리할 에러
     * @param {Object} context - 에러 발생 컨텍스트
     * @param {boolean} showToUser - 사용자에게 에러 표시 여부
     */
    handle(error, context = {}, showToUser = true) {
        const errorInfo = this.createErrorInfo(error, context);
        
        // 에러 카운팅
        this.incrementErrorCount(errorInfo.code);
        
        // 에러 히스토리에 추가
        this.addToHistory(errorInfo);
        
        // 로깅
        this.logError(errorInfo);
        
        // 이벤트 발생
        this.eventBus.emit(Constants.EVENTS.APP_ERROR, errorInfo);
        
        // 사용자에게 표시할지 결정
        if (showToUser) {
            const userMessage = this.getUserFriendlyMessage(error);
            this.eventBus.emit(Constants.EVENTS.UI_SHOW_ERROR, { 
                message: userMessage,
                errorCode: errorInfo.code 
            });
        }
        
        // 특별한 처리가 필요한 에러들
        this.handleSpecialErrors(errorInfo);
        
        return errorInfo;
    }
    
    /**
     * 에러 정보 객체 생성
     * @param {Error|AppError} error - 에러 객체
     * @param {Object} context - 컨텍스트
     * @returns {Object}
     */
    createErrorInfo(error, context) {
        return {
            message: error.message,
            code: error.code || Constants.ERROR_CODES.UNKNOWN,
            name: error.name || 'Error',
            stack: error.stack,
            details: error.details || {},
            context: context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
    }
    
    /**
     * 사용자 친화적 메시지 반환
     * @param {Error|AppError} error - 에러 객체
     * @returns {string}
     */
    getUserFriendlyMessage(error) {
        const code = error.code || Constants.ERROR_CODES.UNKNOWN;
        return this.friendlyMessages[code] || '예상치 못한 오류가 발생했습니다.';
    }
    
    /**
     * 에러 로깅
     * @param {Object} errorInfo - 에러 정보
     */
    logError(errorInfo) {
        if (this.logger) {
            this.logger.error(`[${errorInfo.code}] ${errorInfo.message}`, {
                context: errorInfo.context,
                details: errorInfo.details,
                stack: errorInfo.stack
            });
        } else {
            console.error('ErrorHandler:', errorInfo);
        }
    }
    
    /**
     * 에러 카운트 증가
     * @param {string} errorCode - 에러 코드
     */
    incrementErrorCount(errorCode) {
        const count = this.errorCounts.get(errorCode) || 0;
        this.errorCounts.set(errorCode, count + 1);
    }
    
    /**
     * 에러 히스토리에 추가
     * @param {Object} errorInfo - 에러 정보
     */
    addToHistory(errorInfo) {
        this.lastErrors.unshift(errorInfo);
        
        // 최대 크기 제한
        if (this.lastErrors.length > this.maxLastErrors) {
            this.lastErrors = this.lastErrors.slice(0, this.maxLastErrors);
        }
    }
    
    /**
     * 특별한 처리가 필요한 에러들
     * @param {Object} errorInfo - 에러 정보
     */
    handleSpecialErrors(errorInfo) {
        switch (errorInfo.code) {
            case Constants.ERROR_CODES.STORAGE_FULL:
                // 캐시 정리 시도
                this.eventBus.emit('storage:cleanup-requested');
                break;
                
            case Constants.ERROR_CODES.API_LIMIT:
                // API 사용량 제한 시 자동 업데이트 중지
                this.eventBus.emit('auto-update:stop-requested');
                break;
                
            case Constants.ERROR_CODES.NETWORK_ERROR:
                // 네트워크 에러 시 오프라인 모드 확인
                this.checkNetworkStatus();
                break;
        }
    }
    
    /**
     * 네트워크 상태 확인
     */
    checkNetworkStatus() {
        if (!navigator.onLine) {
            this.eventBus.emit(Constants.EVENTS.OFFLINE);
        }
    }
    
    /**
     * 전역 에러 핸들러 설정
     */
    setupGlobalErrorHandlers() {
        // JavaScript 에러
        window.addEventListener('error', (event) => {
            const error = new AppError(
                event.message || 'JavaScript Error',
                Constants.ERROR_CODES.UNKNOWN,
                {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            );
            
            this.handle(error, { type: 'global-js-error' }, false);
        });
        
        // Promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            const error = new AppError(
                event.reason?.message || 'Unhandled Promise Rejection',
                Constants.ERROR_CODES.UNKNOWN,
                { reason: event.reason }
            );
            
            this.handle(error, { type: 'unhandled-promise' }, false);
            event.preventDefault();
        });
    }
    
    /**
     * 에러 통계 반환
     * @returns {Object}
     */
    getErrorStats() {
        const total = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
        const byCode = Object.fromEntries(this.errorCounts);
        
        return {
            total,
            byCode,
            recentErrors: this.lastErrors.slice(0, 10)
        };
    }
    
    /**
     * 최근 에러 목록 반환
     * @param {number} limit - 반환할 에러 수
     * @returns {Array}
     */
    getRecentErrors(limit = 10) {
        return this.lastErrors.slice(0, limit);
    }
    
    /**
     * 특정 에러 코드의 발생 횟수 반환
     * @param {string} errorCode - 에러 코드
     * @returns {number}
     */
    getErrorCount(errorCode) {
        return this.errorCounts.get(errorCode) || 0;
    }
    
    /**
     * 에러 카운트 초기화
     */
    clearErrorCounts() {
        this.errorCounts.clear();
        this.lastErrors = [];
    }
    
    /**
     * 에러 리포트 생성 (디버깅용)
     * @returns {Object}
     */
    generateErrorReport() {
        return {
            timestamp: new Date().toISOString(),
            totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
            errorsByCode: Object.fromEntries(this.errorCounts),
            recentErrors: this.lastErrors.slice(0, 20),
            systemInfo: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            }
        };
    }
}

// 전역으로 노출
window.ErrorHandler = ErrorHandler;