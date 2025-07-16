/**
 * 애플리케이션 커스텀 에러 클래스
 * 구체적인 에러 정보와 코드를 포함
 */
class AppError extends Error {
    constructor(message, code = Constants.ERROR_CODES.UNKNOWN, details = {}) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        // Error captureStackTrace if available (V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
    
    /**
     * 에러를 직렬화 가능한 객체로 변환
     * @returns {Object}
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
    
    /**
     * 네트워크 에러 생성
     * @param {string} message - 에러 메시지
     * @param {Object} details - 상세 정보
     * @returns {AppError}
     */
    static networkError(message = '네트워크 연결에 실패했습니다.', details = {}) {
        return new AppError(message, Constants.ERROR_CODES.NETWORK_ERROR, details);
    }
    
    /**
     * API 제한 에러 생성
     * @param {string} message - 에러 메시지
     * @param {Object} details - 상세 정보
     * @returns {AppError}
     */
    static apiLimitError(message = 'API 사용량 한계에 도달했습니다.', details = {}) {
        return new AppError(message, Constants.ERROR_CODES.API_LIMIT, details);
    }
    
    /**
     * 데이터 유효성 에러 생성
     * @param {string} message - 에러 메시지
     * @param {Object} details - 상세 정보
     * @returns {AppError}
     */
    static validationError(message = '데이터 형식이 올바르지 않습니다.', details = {}) {
        return new AppError(message, Constants.ERROR_CODES.VALIDATION_ERROR, details);
    }
    
    /**
     * 저장소 용량 에러 생성
     * @param {string} message - 에러 메시지
     * @param {Object} details - 상세 정보
     * @returns {AppError}
     */
    static storageFullError(message = '저장 공간이 부족합니다.', details = {}) {
        return new AppError(message, Constants.ERROR_CODES.STORAGE_FULL, details);
    }
    
    /**
     * 타임아웃 에러 생성
     * @param {string} message - 에러 메시지
     * @param {Object} details - 상세 정보
     * @returns {AppError}
     */
    static timeoutError(message = '요청 시간이 초과되었습니다.', details = {}) {
        return new AppError(message, Constants.ERROR_CODES.TIMEOUT, details);
    }
}

// 전역으로 노출
window.AppError = AppError;