/**
 * 개선된 저장소 관리자
 * 기존 storage.js를 대체하는 향상된 버전
 */
class StorageManager {
    constructor(eventBus, errorHandler) {
        this.eventBus = eventBus;
        this.errorHandler = errorHandler;
        this.setupEventListeners();
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        if (this.eventBus) {
            this.eventBus.on('storage:cleanup-requested', () => {
                this.cleanup();
            });
        }
    }
    
    /**
     * 아이템 저장 (TTL 지원)
     * @param {string} key - 저장 키
     * @param {any} data - 저장할 데이터
     * @param {number} ttlMinutes - 생존 시간 (분)
     */
    static setItem(key, data, ttlMinutes = null) {
        const item = {
            data: data,
            timestamp: Date.now(),
            ttl: ttlMinutes ? ttlMinutes * 60 * 1000 : null,
            version: '2.0' // 리팩토링 버전 표시
        };
        
        try {
            const serialized = JSON.stringify(item);
            localStorage.setItem(key, serialized);
            
            // 저장 성공 이벤트
            if (window.eventBus) {
                window.eventBus.emit('storage:item-saved', { key, size: serialized.length });
            }
            
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                // 용량 초과 시 자동 정리 시도
                StorageManager.cleanup();
                
                try {
                    localStorage.setItem(key, JSON.stringify(item));
                } catch (retryError) {
                    const appError = AppError.storageFullError('저장 공간이 부족합니다.', {
                        key,
                        dataSize: JSON.stringify(data).length,
                        originalError: retryError.message
                    });
                    
                    if (window.errorHandler) {
                        window.errorHandler.handle(appError);
                    } else {
                        console.error('Storage error:', appError);
                    }
                    throw appError;
                }
            } else {
                const appError = new AppError('저장 중 오류가 발생했습니다.', Constants.ERROR_CODES.STORAGE_FULL, {
                    key,
                    originalError: error.message
                });
                
                if (window.errorHandler) {
                    window.errorHandler.handle(appError);
                }
                throw appError;
            }
        }
    }
    
    /**
     * 아이템 조회
     * @param {string} key - 조회 키
     * @returns {any|null} 저장된 데이터 또는 null
     */
    static getItem(key) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            
            // 구버전 데이터 처리
            if (!item.version) {
                // 기존 storage.js 형식
                if (item.timestamp && item.data !== undefined) {
                    // TTL 확인
                    if (item.ttl && Date.now() - item.timestamp > item.ttl) {
                        localStorage.removeItem(key);
                        return null;
                    }
                    return item.data;
                }
                // 단순 데이터
                return item;
            }
            
            // 새 버전 데이터 처리
            if (item.version === '2.0') {
                // TTL 확인
                if (item.ttl && Date.now() - item.timestamp > item.ttl) {
                    localStorage.removeItem(key);
                    if (window.eventBus) {
                        window.eventBus.emit('storage:item-expired', { key });
                    }
                    return null;
                }
                
                return item.data;
            }
            
            // 알 수 없는 버전
            console.warn(`Unknown storage version for key ${key}:`, item.version);
            return item.data || item;
            
        } catch (error) {
            console.warn(`Error reading storage item ${key}:`, error.message);
            
            // 손상된 데이터 제거
            try {
                localStorage.removeItem(key);
            } catch (removeError) {
                console.error('Failed to remove corrupted storage item:', removeError);
            }
            
            return null;
        }
    }
    
    /**
     * 아이템 제거
     * @param {string} key - 제거할 키
     */
    static removeItem(key) {
        try {
            localStorage.removeItem(key);
            if (window.eventBus) {
                window.eventBus.emit('storage:item-removed', { key });
            }
        } catch (error) {
            console.warn(`Error removing storage item ${key}:`, error.message);
        }
    }
    
    /**
     * 아이템 존재 여부 확인
     * @param {string} key - 확인할 키
     * @returns {boolean}
     */
    static hasItem(key) {
        return localStorage.getItem(key) !== null;
    }
    
    /**
     * 만료된 아이템들 정리
     * @returns {Object} 정리 결과
     */
    static cleanup() {
        let removedCount = 0;
        let freedSpace = 0;
        const removedKeys = [];
        
        try {
            const keys = Object.keys(localStorage);
            
            for (const key of keys) {
                try {
                    const itemStr = localStorage.getItem(key);
                    if (!itemStr) continue;
                    
                    const originalSize = itemStr.length;
                    const item = JSON.parse(itemStr);
                    
                    // TTL 확인하여 만료된 항목 제거
                    if (item.ttl && item.timestamp && Date.now() - item.timestamp > item.ttl) {
                        localStorage.removeItem(key);
                        removedCount++;
                        freedSpace += originalSize;
                        removedKeys.push(key);
                    }
                    
                } catch (parseError) {
                    // 손상된 데이터도 제거
                    const originalSize = localStorage.getItem(key)?.length || 0;
                    localStorage.removeItem(key);
                    removedCount++;
                    freedSpace += originalSize;
                    removedKeys.push(key);
                }
            }
            
            const result = {
                removedCount,
                freedSpace,
                removedKeys,
                success: true
            };
            
            if (window.eventBus) {
                window.eventBus.emit('storage:cleanup-completed', result);
            }
            
            console.log(`Storage cleanup completed: ${removedCount} items removed, ${freedSpace} bytes freed`);
            return result;
            
        } catch (error) {
            const appError = new AppError('저장소 정리 중 오류가 발생했습니다.', Constants.ERROR_CODES.STORAGE_FULL, {
                originalError: error.message
            });
            
            if (window.errorHandler) {
                window.errorHandler.handle(appError);
            }
            
            return {
                removedCount: 0,
                freedSpace: 0,
                removedKeys: [],
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 저장소 사용량 정보 조회
     * @returns {Object} 사용량 정보
     */
    static getStorageInfo() {
        try {
            let totalSize = 0;
            let itemCount = 0;
            const itemSizes = {};
            
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const value = localStorage[key];
                    const itemSize = key.length + value.length;
                    totalSize += itemSize;
                    itemCount++;
                    itemSizes[key] = itemSize;
                }
            }
            
            const usedMB = (totalSize / 1024 / 1024) || 0;
            const maxMB = 5; // 대부분 브라우저의 localStorage 한계
            const availableMB = maxMB - usedMB;
            const percentage = (usedMB / maxMB) * 100;
            
            // 안전한 임계값 접근
            const storageThreshold = Constants?.THRESHOLDS?.HIGH_STORAGE_USAGE_PERCENT || 80;
            
            return {
                used: parseFloat(usedMB.toFixed(2)),
                available: parseFloat(availableMB.toFixed(2)),
                percentage: parseFloat(percentage.toFixed(1)),
                itemCount,
                totalSize,
                itemSizes,
                usedMB: parseFloat(usedMB.toFixed(2)), // app.js에서 사용하는 속성 추가
                isNearLimit: percentage > storageThreshold
            };
            
        } catch (error) {
            console.error('Error getting storage info:', error);
            return {
                used: 0,
                available: 5,
                percentage: 0,
                itemCount: 0,
                totalSize: 0,
                itemSizes: {},
                isNearLimit: false,
                error: error.message
            };
        }
    }
    
    /**
     * 특정 패턴의 키들 제거
     * @param {string|RegExp} pattern - 제거할 키 패턴
     * @returns {number} 제거된 아이템 수
     */
    static removeByPattern(pattern) {
        let removedCount = 0;
        const keys = Object.keys(localStorage);
        
        for (const key of keys) {
            let shouldRemove = false;
            
            if (typeof pattern === 'string') {
                shouldRemove = key.includes(pattern);
            } else if (pattern instanceof RegExp) {
                shouldRemove = pattern.test(key);
            }
            
            if (shouldRemove) {
                localStorage.removeItem(key);
                removedCount++;
            }
        }
        
        if (window.eventBus) {
            window.eventBus.emit('storage:pattern-removed', { pattern: pattern.toString(), removedCount });
        }
        
        return removedCount;
    }
    
    /**
     * 저장소 전체 초기화 (개발용)
     */
    static clear() {
        const itemCount = localStorage.length;
        localStorage.clear();
        
        if (window.eventBus) {
            window.eventBus.emit('storage:cleared', { itemCount });
        }
        
        console.log(`Storage cleared: ${itemCount} items removed`);
    }
    
    /**
     * 백업 생성
     * @returns {Object} 백업 데이터
     */
    static createBackup() {
        const backup = {
            timestamp: new Date().toISOString(),
            version: '2.0',
            data: {}
        };
        
        try {
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    backup.data[key] = localStorage[key];
                }
            }
            
            return backup;
        } catch (error) {
            throw new AppError('백업 생성에 실패했습니다.', Constants.ERROR_CODES.STORAGE_FULL, {
                originalError: error.message
            });
        }
    }
    
    /**
     * 백업 복원
     * @param {Object} backup - 백업 데이터
     */
    static restoreBackup(backup) {
        if (!backup || !backup.data) {
            throw new AppError('유효하지 않은 백업 데이터입니다.', Constants.ERROR_CODES.VALIDATION_ERROR);
        }
        
        try {
            // 기존 데이터 제거
            localStorage.clear();
            
            // 백업 데이터 복원
            for (const [key, value] of Object.entries(backup.data)) {
                localStorage.setItem(key, value);
            }
            
            if (window.eventBus) {
                window.eventBus.emit('storage:backup-restored', { 
                    itemCount: Object.keys(backup.data).length,
                    backupTimestamp: backup.timestamp 
                });
            }
            
        } catch (error) {
            throw new AppError('백업 복원에 실패했습니다.', Constants.ERROR_CODES.STORAGE_FULL, {
                originalError: error.message
            });
        }
    }
}

// 편의 메서드들 (기존 storage.js 호환성)
StorageManager.getSettings = () => StorageManager.getItem(Constants.STORAGE_KEYS.SETTINGS) || StorageManager.getDefaultSettings();
StorageManager.saveSettings = (settings) => StorageManager.setItem(Constants.STORAGE_KEYS.SETTINGS, settings);
StorageManager.getResults = () => StorageManager.getItem(Constants.STORAGE_KEYS.RESULTS);
StorageManager.saveResults = (results) => StorageManager.setItem(Constants.STORAGE_KEYS.RESULTS, results, Constants.CACHE.RESULTS_TTL_MINUTES);
StorageManager.getCachedData = (key) => StorageManager.getItem(key);
StorageManager.cacheData = (key, data, ttlMinutes) => StorageManager.setItem(key, data, ttlMinutes);
StorageManager.clearCache = () => StorageManager.cleanup();

// 기본 설정 반환
StorageManager.getDefaultSettings = () => ({
    volatilityMin: Constants.SCAN.DEFAULT_VOLATILITY_MIN,
    volatilityMax: Constants.SCAN.DEFAULT_VOLATILITY_MAX,
    minVolume: Constants.SCAN.DEFAULT_MIN_VOLUME,
    updateInterval: Constants.AUTO_UPDATE.DEFAULT_INTERVAL_MS / 1000,
    autoUpdateEnabled: false,
    demoMode: false,
    notificationEnabled: true
});

// 기존 storage.js와의 호환성을 위한 추가 메서드들
StorageManager.initializeCacheCleanup = () => {
    try {
        console.log('🧹 캐시 정리 시작...');
        
        // 만료된 항목들 정리
        const result = StorageManager.cleanup();
        
        console.log(`🧹 캐시 정리 완료: ${result.removedCount}개 항목 제거`);
        
    } catch (error) {
        console.error('❌ 캐시 정리 실패:', error);
    }
};

// 워치리스트 관련 호환성 메서드들
StorageManager.getCachedWatchListCandidates = () => {
    return StorageManager.getItem('sp500_watchlist_candidates');
};

StorageManager.cacheWatchListCandidates = (candidates, ttlMinutes = 24 * 60) => {
    StorageManager.setItem('sp500_watchlist_candidates', candidates, ttlMinutes);
};

// 돌파 종목 캐시 메서드들
StorageManager.saveBreakoutResults = (breakoutStocks, waitingStocks, ttlMinutes = 60) => {
    const cacheData = {
        breakoutStocks: breakoutStocks || [],
        waitingStocks: waitingStocks || [],
        timestamp: new Date().toISOString(),
        totalCount: (breakoutStocks?.length || 0) + (waitingStocks?.length || 0)
    };
    
    console.log(`💾 돌파 결과 캐시 저장: 돌파 ${breakoutStocks?.length || 0}개, 대기 ${waitingStocks?.length || 0}개`);
    StorageManager.setItem('breakout_scan_results', cacheData, ttlMinutes);
    
    // 개별 종목별로도 캐시 저장 (중복 스캔 방지용)
    if (breakoutStocks?.length > 0) {
        breakoutStocks.forEach(stock => {
            StorageManager.setItem(`breakout_stock_${stock.ticker}`, stock, ttlMinutes);
        });
    }
    
    if (waitingStocks?.length > 0) {
        waitingStocks.forEach(stock => {
            StorageManager.setItem(`waiting_stock_${stock.ticker}`, stock, ttlMinutes);
        });
    }
};

StorageManager.getBreakoutResults = () => {
    return StorageManager.getItem('breakout_scan_results');
};

StorageManager.getCachedStockData = (ticker) => {
    // 돌파 종목에서 먼저 찾기
    const breakoutStock = StorageManager.getItem(`breakout_stock_${ticker}`);
    if (breakoutStock) {
        console.log(`📦 ${ticker} 돌파 종목 캐시 사용`);
        return { ...breakoutStock, cached: true, cacheType: 'breakout' };
    }
    
    // 대기 종목에서 찾기
    const waitingStock = StorageManager.getItem(`waiting_stock_${ticker}`);
    if (waitingStock) {
        console.log(`📦 ${ticker} 대기 종목 캐시 사용`);
        return { ...waitingStock, cached: true, cacheType: 'waiting' };
    }
    
    // 일반 주식 데이터 캐시에서 찾기
    return StorageManager.getItem(`stock_${ticker}`);
};

StorageManager.invalidateStockCache = (ticker) => {
    // 특정 종목의 모든 캐시 제거
    StorageManager.removeItem(`breakout_stock_${ticker}`);
    StorageManager.removeItem(`waiting_stock_${ticker}`);
    StorageManager.removeItem(`stock_${ticker}`);
    console.log(`🗑️ ${ticker} 캐시 무효화됨`);
};

StorageManager.cleanupStockCaches = () => {
    // 종목별 캐시들 정리
    const pattern = /^(breakout_stock_|waiting_stock_|stock_)/;
    return StorageManager.removeByPattern(pattern);
};

// 기존 코드 호환성을 위한 updateSettings 함수 추가
StorageManager.updateSettings = (updates) => {
    const current = StorageManager.getSettings();
    StorageManager.saveSettings({ ...current, ...updates });
};

StorageManager.clearYesterdayCache = () => {
    // 어제 날짜로 시작하는 캐시 키들 제거
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    return StorageManager.removeByPattern(yesterdayStr);
};

// 사용량 정보 (기존 메서드명 호환성)
StorageManager.getStorageUsage = () => {
    return StorageManager.getStorageInfo();
};

// 전역으로 노출
window.StorageManager = StorageManager;