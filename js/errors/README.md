# Errors 폴더 룰

## 목적
애플리케이션의 에러 처리와 예외 관리를 담당하는 폴더입니다.

## 파일 구조
- `AppError.js` - 앱 에러 클래스
- `ErrorHandler.js` - 에러 핸들러

## 코딩 룰

### 커스텀 에러 클래스
```javascript
class AppError extends Error {
    constructor(message, code, statusCode = 500, isOperational = true) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }
}

// 특정 에러 타입들
class APIError extends AppError {
    constructor(message, statusCode = 500) {
        super(message, 'API_ERROR', statusCode);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR', 400);
    }
}

class NetworkError extends AppError {
    constructor(message) {
        super(message, 'NETWORK_ERROR', 503);
    }
}
```

### 에러 핸들러 패턴
```javascript
class ErrorHandler {
    static handle(error, context = '') {
        const errorInfo = {
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR',
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        // 로깅
        this.logError(errorInfo);

        // 운영 에러인 경우 사용자에게 표시
        if (error.isOperational) {
            this.showUserFriendlyError(error);
        }

        // 개발 환경에서는 상세 에러 표시
        if (this.isDevelopment()) {
            console.error('🚨 Detailed Error:', errorInfo);
        }
    }

    static logError(errorInfo) {
        // 로컬 스토리지에 에러 로그 저장
        const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
        logs.push(errorInfo);
        
        // 최근 100개만 유지
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('error_logs', JSON.stringify(logs));
    }

    static showUserFriendlyError(error) {
        const userMessages = {
            'API_ERROR': '데이터를 가져오는 중 문제가 발생했습니다.',
            'NETWORK_ERROR': '네트워크 연결을 확인해주세요.',
            'VALIDATION_ERROR': '입력된 정보를 확인해주세요.',
            'DEFAULT': '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        };

        const message = userMessages[error.code] || userMessages.DEFAULT;
        
        // 사용자에게 알림 표시
        this.displayNotification(message, 'error');
    }
}
```

### 에러 재시도 로직
```javascript
class RetryHandler {
    static async withRetry(operation, maxRetries = 3, delay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (attempt === maxRetries) {
                    throw lastError;
                }

                // 재시도 가능한 에러인지 확인
                if (!this.isRetryableError(error)) {
                    throw error;
                }

                // 지연 시간 적용 (exponential backoff)
                await this.sleep(delay * Math.pow(2, attempt - 1));
            }
        }
    }

    static isRetryableError(error) {
        const retryableStatusCodes = [429, 500, 502, 503, 504];
        return error.statusCode && retryableStatusCodes.includes(error.statusCode);
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

### 글로벌 에러 핸들링
```javascript
// 전역 에러 리스너 설정
window.addEventListener('error', (event) => {
    ErrorHandler.handle(new AppError(
        event.error?.message || 'Unknown error',
        'GLOBAL_ERROR'
    ), 'Global Error Handler');
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.handle(new AppError(
        event.reason?.message || 'Unhandled promise rejection',
        'PROMISE_REJECTION'
    ), 'Unhandled Promise Rejection');
});
```

## 금지사항
- try-catch 블록 없이 비동기 코드 작성 금지
- 에러 정보 무시하고 빈 catch 블록 사용 금지
- 사용자에게 기술적 에러 메시지 직접 노출 금지
- 민감한 정보가 포함된 에러 로깅 금지
- 에러 발생 시 앱 전체 중단시키는 코드 작성 금지