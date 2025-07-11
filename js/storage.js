class StorageManager {
    static KEYS = {
        RESULTS: 'sp500_results',
        SETTINGS: 'sp500_settings',
        CACHE: 'sp500_cache',
        FAVORITES: 'sp500_favorites',
        WATCHLIST_CANDIDATES: 'sp500_watchlist_candidates'
    };
    
    static saveResults(results) {
        try {
            const data = {
                ...results,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(this.KEYS.RESULTS, JSON.stringify(data));
            console.log('✅ 결과 저장됨');
        } catch (error) {
            console.error('❌ 결과 저장 실패:', error);
        }
    }
    
    static getResults() {
        try {
            const data = localStorage.getItem(this.KEYS.RESULTS);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('❌ 결과 로드 실패:', error);
            return null;
        }
    }
    
    static saveSettings(settings) {
        try {
            const currentSettings = this.getSettings();
            const newSettings = { ...currentSettings, ...settings };
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(newSettings));
            console.log('✅ 설정 저장됨');
        } catch (error) {
            console.error('❌ 설정 저장 실패:', error);
        }
    }
    
    static getSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            return data ? JSON.parse(data) : this.getDefaultSettings();
        } catch (error) {
            console.error('❌ 설정 로드 실패:', error);
            return this.getDefaultSettings();
        }
    }
    
    static getDefaultSettings() {
        return {
            volatilityMin: 0.02,
            volatilityMax: 0.08,
            minVolume: 1000000,
            minPrice: 10,
            breakoutFactor: 0.6,
            autoScan: false,
            notifications: false
        };
    }
    
    static updateSettings(updates) {
        const current = this.getSettings();
        this.saveSettings({ ...current, ...updates });
    }
    
    static cacheData(key, data, expireMinutes = 60) {
        try {
            const cacheData = {
                data,
                timestamp: Date.now(),
                expireAt: Date.now() + (expireMinutes * 60 * 1000)
            };
            
            const cache = this.getCache();
            cache[key] = cacheData;
            localStorage.setItem(this.KEYS.CACHE, JSON.stringify(cache));
        } catch (error) {
            console.error('❌ 캐시 저장 실패:', error);
        }
    }
    
    static getCachedData(key) {
        try {
            const cache = this.getCache();
            const cached = cache[key];
            
            if (cached && Date.now() < cached.expireAt) {
                return cached.data;
            } else {
                // 만료된 캐시 삭제
                delete cache[key];
                localStorage.setItem(this.KEYS.CACHE, JSON.stringify(cache));
                return null;
            }
        } catch (error) {
            console.error('❌ 캐시 로드 실패:', error);
            return null;
        }
    }
    
    static getCache() {
        try {
            const data = localStorage.getItem(this.KEYS.CACHE);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            return {};
        }
    }
    
    static clearCache() {
        try {
            localStorage.removeItem(this.KEYS.CACHE);
            console.log('✅ 캐시 클리어됨');
        } catch (error) {
            console.error('❌ 캐시 클리어 실패:', error);
        }
    }
    
    // 워치리스트 후보 캐시 관리
    static saveWatchListCandidates(candidates) {
        try {
            const data = {
                candidates,
                timestamp: new Date().toISOString(),
                createdAt: Date.now(),
                expireAt: Date.now() + (24 * 60 * 60 * 1000) // 24시간
            };
            localStorage.setItem(this.KEYS.WATCHLIST_CANDIDATES, JSON.stringify(data));
            console.log(`✅ 워치리스트 후보 ${candidates.length}개 캐시됨 (24시간 유효)`);
        } catch (error) {
            console.error('❌ 워치리스트 후보 저장 실패:', error);
        }
    }
    
    static getCachedWatchListCandidates() {
        try {
            const data = localStorage.getItem(this.KEYS.WATCHLIST_CANDIDATES);
            if (!data) return null;
            
            const cached = JSON.parse(data);
            
            // 24시간 경과 확인
            if (Date.now() > cached.expireAt) {
                localStorage.removeItem(this.KEYS.WATCHLIST_CANDIDATES);
                console.log('⏰ 워치리스트 후보 캐시 만료됨');
                return null;
            }
            
            console.log(`📦 캐시된 워치리스트 후보 ${cached.candidates.length}개 로드됨`);
            return cached.candidates;
        } catch (error) {
            console.error('❌ 워치리스트 후보 로드 실패:', error);
            return null;
        }
    }
    
    static clearWatchListCandidates() {
        try {
            localStorage.removeItem(this.KEYS.WATCHLIST_CANDIDATES);
            console.log('✅ 워치리스트 후보 캐시 클리어됨');
        } catch (error) {
            console.error('❌ 워치리스트 후보 캐시 클리어 실패:', error);
        }
    }

    static getStorageUsage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length;
            }
        }
        return {
            used: total,
            usedMB: (total / 1024 / 1024).toFixed(2),
            available: 5 * 1024 * 1024 - total, // 5MB 제한 가정
            availableMB: ((5 * 1024 * 1024 - total) / 1024 / 1024).toFixed(2)
        };
    }
}