# Utils 폴더 룰

## 목적
재사용 가능한 유틸리티 함수와 상수를 관리하는 폴더입니다.

## 파일 구조
- `constants.js` - 상수 정의
- `index.js` - 유틸리티 인덱스

## 코딩 룰

### 상수 정의
```javascript
// constants.js
export const API_ENDPOINTS = {
    YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v8/finance/chart/',
    SP500_LIST: 'https://en.wikipedia.org/api/rest_v1/page/summary/List_of_S%26P_500_companies'
};

export const SETTINGS = {
    DEFAULT_VOLATILITY_MAX: 0.06,
    DEFAULT_MIN_VOLUME: 1000000,
    DEFAULT_MIN_PRICE: 10,
    CACHE_EXPIRY_HOURS: 24,
    AUTO_UPDATE_INTERVAL: 60000, // 1분
    RATE_LIMIT_DELAY: 1000 // 1초
};

export const ERROR_CODES = {
    API_ERROR: 'API_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    CACHE_ERROR: 'CACHE_ERROR'
};

export const LARRY_WILLIAMS = {
    ENTRY_MULTIPLIER: 0.6,
    STOP_LOSS_RATIO: 0.95,
    TARGET1_RATIO: 1.02,
    TARGET2_RATIO: 1.05,
    MIN_VOLATILITY: 0.02,
    MAX_VOLATILITY: 0.08
};
```

### 유틸리티 함수
```javascript
// 날짜 관련 유틸리티
export const DateUtils = {
    formatDate(date) {
        return new Intl.DateTimeFormat('ko-KR').format(date);
    },

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
};

// 숫자 관련 유틸리티
export const NumberUtils = {
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
        }).format(amount);
    },

    formatPercentage(value, decimals = 2) {
        return `${(value * 100).toFixed(decimals)}%`;
    },

    roundToDecimal(number, decimals = 2) {
        return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
};

// 배열 관련 유틸리티
export const ArrayUtils = {
    chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },

    unique(array) {
        return [...new Set(array)];
    },

    sortBy(array, key) {
        return array.sort((a, b) => {
            if (a[key] < b[key]) return -1;
            if (a[key] > b[key]) return 1;
            return 0;
        });
    }
};

// 객체 관련 유틸리티
export const ObjectUtils = {
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    pick(obj, keys) {
        const result = {};
        keys.forEach(key => {
            if (key in obj) {
                result[key] = obj[key];
            }
        });
        return result;
    },

    omit(obj, keys) {
        const result = { ...obj };
        keys.forEach(key => delete result[key]);
        return result;
    }
};

// 문자열 관련 유틸리티
export const StringUtils = {
    sanitize(str) {
        return str.replace(/[<>]/g, '');
    },

    truncate(str, length) {
        return str.length > length ? str.substring(0, length) + '...' : str;
    },

    slugify(str) {
        return str.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .trim();
    }
};

// 비동기 관련 유틸리티
export const AsyncUtils = {
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    timeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), ms)
            )
        ]);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
```

### 검증 유틸리티
```javascript
export const ValidationUtils = {
    isValidTicker(ticker) {
        return /^[A-Z]{1,5}$/.test(ticker);
    },

    isValidPrice(price) {
        return typeof price === 'number' && price > 0;
    },

    isValidVolume(volume) {
        return typeof volume === 'number' && volume >= 0;
    },

    isValidPercentage(value) {
        return typeof value === 'number' && value >= 0 && value <= 1;
    }
};
```

## 금지사항
- 특정 비즈니스 로직에 종속적인 함수 작성 금지
- 부수 효과(side effect)가 있는 순수하지 않은 함수 작성 금지
- 외부 의존성이 있는 유틸리티 함수 작성 금지
- 하드코딩된 값 사용 금지 (상수로 분리)
- 플랫폼 특정적인 코드 작성 금지 (크로스 플랫폼 고려)