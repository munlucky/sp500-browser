/**
 * 의존성 주입 컨테이너
 * 서비스들의 생성과 관리를 담당
 */
class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }
    
    /**
     * 서비스를 컨테이너에 등록
     * @param {string} name - 서비스 이름
     * @param {Function} factory - 서비스 생성 팩토리 함수
     * @param {boolean} singleton - 싱글톤 여부 (기본값: true)
     */
    register(name, factory, singleton = true) {
        this.services.set(name, { factory, singleton });
    }
    
    /**
     * 서비스를 해결(생성/반환)
     * @param {string} name - 서비스 이름
     * @returns {any} 서비스 인스턴스
     */
    resolve(name) {
        // 싱글톤으로 이미 생성된 경우 기존 인스턴스 반환
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }
        
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not found. Available services: ${Array.from(this.services.keys()).join(', ')}`);
        }
        
        try {
            const instance = service.factory(this);
            
            // 싱글톤인 경우 저장
            if (service.singleton) {
                this.singletons.set(name, instance);
            }
            
            return instance;
        } catch (error) {
            throw new Error(`Failed to create service '${name}': ${error.message}`);
        }
    }
    
    /**
     * 서비스가 등록되었는지 확인
     * @param {string} name - 서비스 이름
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name);
    }
    
    /**
     * 싱글톤 인스턴스 제거 (메모리 정리용)
     * @param {string} name - 서비스 이름
     */
    clearSingleton(name) {
        this.singletons.delete(name);
    }
    
    /**
     * 모든 싱글톤 인스턴스 제거
     */
    clearAllSingletons() {
        this.singletons.clear();
    }
    
    /**
     * 등록된 서비스 목록 반환
     * @returns {string[]}
     */
    getRegisteredServices() {
        return Array.from(this.services.keys());
    }
}

// 전역 컨테이너 인스턴스
window.DIContainer = DIContainer;