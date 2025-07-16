/**
 * 공통 유틸리티 함수들
 * 프로젝트 전반에서 사용되는 헬퍼 함수들을 모음
 */
const Utils = {
    /**
     * 지연 실행 (Promise 기반)
     * @param {number} ms - 밀리초
     * @returns {Promise}
     */
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    /**
     * 숫자 포맷팅 (천 단위 구분자)
     * @param {number} num - 숫자
     * @returns {string}
     */
    formatNumber: (num) => {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        return num.toLocaleString();
    },
    
    /**
     * 통화 포맷팅
     * @param {number} amount - 금액
     * @param {string} currency - 통화 코드 (기본값: USD)
     * @returns {string}
     */
    formatCurrency: (amount, currency = 'USD') => {
        if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },
    
    /**
     * 퍼센트 계산
     * @param {number} current - 현재 값
     * @param {number} previous - 이전 값
     * @returns {number}
     */
    calculatePercentage: (current, previous) => {
        if (!previous || previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    },
    
    /**
     * 퍼센트 포맷팅
     * @param {number} percentage - 퍼센트 값
     * @param {number} decimals - 소수점 자리수 (기본값: 2)
     * @returns {string}
     */
    formatPercentage: (percentage, decimals = 2) => {
        if (typeof percentage !== 'number' || isNaN(percentage)) return '0.00%';
        return `${percentage.toFixed(decimals)}%`;
    },
    
    /**
     * 주식 데이터 유효성 검사
     * @param {Object} data - 주식 데이터
     * @returns {boolean}
     */
    isValidStockData: (data) => {
        return data && 
               data.ticker && 
               typeof data.ticker === 'string' &&
               typeof data.currentPrice === 'number' &&
               data.currentPrice > 0 &&
               typeof data.yesterdayClose === 'number' &&
               data.yesterdayClose > 0;
    },
    
    /**
     * 안전한 숫자 파싱
     * @param {any} value - 파싱할 값
     * @param {number} defaultValue - 기본값
     * @returns {number}
     */
    safeParseFloat: (value, defaultValue = 0) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    },
    
    /**
     * 안전한 정수 파싱
     * @param {any} value - 파싱할 값
     * @param {number} defaultValue - 기본값
     * @returns {number}
     */
    safeParseInt: (value, defaultValue = 0) => {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    },
    
    /**
     * 디바운스 함수 생성
     * @param {Function} func - 디바운스할 함수
     * @param {number} delay - 지연 시간 (밀리초)
     * @returns {Function}
     */
    debounce: (func, delay) => {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    /**
     * 스로틀 함수 생성
     * @param {Function} func - 스로틀할 함수
     * @param {number} delay - 지연 시간 (밀리초)
     * @returns {Function}
     */
    throttle: (func, delay) => {
        let lastCall = 0;
        return function (...args) {
            const now = new Date().getTime();
            if (now - lastCall < delay) {
                return;
            }
            lastCall = now;
            return func.apply(this, args);
        };
    },
    
    /**
     * 배열을 청크로 나누기
     * @param {Array} array - 분할할 배열
     * @param {number} size - 청크 크기
     * @returns {Array[]}
     */
    chunk: (array, size) => {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },
    
    /**
     * 객체 깊은 복사
     * @param {any} obj - 복사할 객체
     * @returns {any}
     */
    deepClone: (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => Utils.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = Utils.deepClone(obj[key]);
            });
            return cloned;
        }
    },
    
    /**
     * 날짜 포맷팅
     * @param {Date|string} date - 날짜
     * @param {string} format - 포맷 ('YYYY-MM-DD', 'MM/DD/YYYY', 등)
     * @returns {string}
     */
    formatDate: (date, format = 'YYYY-MM-DD') => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            default:
                return d.toLocaleDateString();
        }
    },
    
    /**
     * 시간 포맷팅
     * @param {Date|string} date - 날짜/시간
     * @param {boolean} includeSeconds - 초 포함 여부
     * @returns {string}
     */
    formatTime: (date, includeSeconds = false) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        if (includeSeconds) {
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }
        
        return `${hours}:${minutes}`;
    },
    
    /**
     * URL 매개변수 파싱
     * @param {string} url - URL 문자열
     * @returns {Object}
     */
    parseUrlParams: (url = window.location.href) => {
        const params = {};
        const urlObj = new URL(url);
        for (const [key, value] of urlObj.searchParams) {
            params[key] = value;
        }
        return params;
    },
    
    /**
     * 로컬 스토리지 용량 계산
     * @returns {Object} { used: MB, available: MB, percentage: % }
     */
    getStorageInfo: () => {
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        
        const usedMB = (totalSize / 1024 / 1024).toFixed(2);
        const maxMB = 5; // 대부분 브라우저의 localStorage 한계
        const availableMB = (maxMB - usedMB).toFixed(2);
        const percentage = ((usedMB / maxMB) * 100).toFixed(1);
        
        return {
            used: parseFloat(usedMB),
            available: parseFloat(availableMB),
            percentage: parseFloat(percentage)
        };
    }
};

// 전역으로 노출
window.Utils = Utils;