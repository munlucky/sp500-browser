/**
 * 이벤트 버스 시스템
 * 모듈 간 느슨한 결합 통신을 제공
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.debugMode = false;
    }
    
    /**
     * 이벤트 리스너 등록
     * @param {string} event - 이벤트 이름
     * @param {Function} callback - 콜백 함수
     * @param {Object} options - 옵션 (once: 한 번만 실행)
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        
        const listener = {
            callback,
            once: options.once || false,
            id: Math.random().toString(36).substr(2, 9)
        };
        
        this.events.get(event).push(listener);
        
        if (this.debugMode) {
            console.log(`EventBus: Registered listener for '${event}'`);
        }
        
        return listener.id; // 제거할 때 사용할 ID 반환
    }
    
    /**
     * 한 번만 실행되는 이벤트 리스너 등록
     * @param {string} event - 이벤트 이름
     * @param {Function} callback - 콜백 함수
     */
    once(event, callback) {
        return this.on(event, callback, { once: true });
    }
    
    /**
     * 이벤트 발생
     * @param {string} event - 이벤트 이름
     * @param {any} data - 전달할 데이터
     */
    emit(event, data = null) {
        if (!this.events.has(event)) {
            if (this.debugMode) {
                console.log(`EventBus: No listeners for '${event}'`);
            }
            return;
        }
        
        const listeners = this.events.get(event);
        const listenersToRemove = [];
        
        // 이벤트 히스토리에 추가
        this.addToHistory(event, data);
        
        if (this.debugMode) {
            console.log(`EventBus: Emitting '${event}' to ${listeners.length} listeners`, data);
        }
        
        // 모든 리스너 실행
        listeners.forEach((listener, index) => {
            try {
                listener.callback(data);
                
                // once 옵션인 경우 제거 목록에 추가
                if (listener.once) {
                    listenersToRemove.push(index);
                }
            } catch (error) {
                console.error(`EventBus: Error in listener for '${event}':`, error);
            }
        });
        
        // once 리스너들 제거 (역순으로 제거하여 인덱스 문제 방지)
        listenersToRemove.reverse().forEach(index => {
            listeners.splice(index, 1);
        });
    }
    
    /**
     * 이벤트 리스너 제거
     * @param {string} event - 이벤트 이름
     * @param {string|Function} listenerIdOrCallback - 리스너 ID 또는 콜백 함수
     */
    off(event, listenerIdOrCallback) {
        if (!this.events.has(event)) {
            return;
        }
        
        const listeners = this.events.get(event);
        
        if (typeof listenerIdOrCallback === 'string') {
            // ID로 제거
            const index = listeners.findIndex(l => l.id === listenerIdOrCallback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        } else if (typeof listenerIdOrCallback === 'function') {
            // 콜백 함수로 제거
            const index = listeners.findIndex(l => l.callback === listenerIdOrCallback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        
        // 리스너가 없으면 이벤트 자체 제거
        if (listeners.length === 0) {
            this.events.delete(event);
        }
        
        if (this.debugMode) {
            console.log(`EventBus: Removed listener for '${event}'`);
        }
    }
    
    /**
     * 특정 이벤트의 모든 리스너 제거
     * @param {string} event - 이벤트 이름
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        
        if (this.debugMode) {
            console.log(`EventBus: Removed all listeners for '${event || 'all events'}'`);
        }
    }
    
    /**
     * 이벤트 히스토리에 추가
     * @param {string} event - 이벤트 이름
     * @param {any} data - 데이터
     */
    addToHistory(event, data) {
        this.eventHistory.push({
            event,
            data,
            timestamp: new Date().toISOString()
        });
        
        // 히스토리 크기 제한
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
    
    /**
     * 이벤트 히스토리 조회
     * @param {string} event - 특정 이벤트만 조회 (선택사항)
     * @returns {Array}
     */
    getHistory(event = null) {
        if (event) {
            return this.eventHistory.filter(h => h.event === event);
        }
        return [...this.eventHistory];
    }
    
    /**
     * 등록된 이벤트 목록 조회
     * @returns {string[]}
     */
    getRegisteredEvents() {
        return Array.from(this.events.keys());
    }
    
    /**
     * 특정 이벤트의 리스너 수 조회
     * @param {string} event - 이벤트 이름
     * @returns {number}
     */
    getListenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }
    
    /**
     * 디버그 모드 토글
     * @param {boolean} enabled - 디버그 모드 활성화 여부
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`EventBus: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// 전역 EventBus 클래스 노출
window.EventBus = EventBus;