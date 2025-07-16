/**
 * 설정 컴포넌트
 * 설정 모달과 폼 관리를 담당
 */
class SettingsComponent {
    constructor(eventBus, storageManager) {
        this.eventBus = eventBus;
        this.storageManager = storageManager;
        this.modal = null;
        this.isVisible = false;
        this.currentSettings = {};
        this.originalSettings = {};
        
        this.init();
        console.log('✅ SettingsComponent 초기화 완료');
    }
    
    /**
     * 컴포넌트 초기화
     */
    init() {
        this.findElements();
        this.setupEventListeners();
        this.loadSettings();
    }
    
    /**
     * DOM 요소들 찾기
     */
    findElements() {
        this.modal = document.getElementById('settingsModal');
        this.elements = {
            modal: this.modal,
            closeBtn: document.getElementById('closeSettingsBtn'),
            saveBtn: document.getElementById('saveSettingsBtn'),
            resetBtn: document.getElementById('resetSettingsBtn'),
            
            // 스캔 필터 설정
            volatilityRange: document.getElementById('volatilityRange'),
            volatilityValue: document.getElementById('volatilityValue'),
            minVolume: document.getElementById('minVolume'),
            
            // 자동 업데이트 설정
            autoUpdateEnabled: document.getElementById('autoUpdateEnabled'),
            updateInterval: document.getElementById('updateInterval'),
            
            // 시스템 설정
            demoMode: document.getElementById('demoMode'),
            notificationEnabled: document.getElementById('notificationEnabled')
        };
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 모달 제어
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.hide());
        }
        
        // 모달 외부 클릭 시 닫기
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }
        
        // ESC 키로 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
        
        // 저장 버튼
        if (this.elements.saveBtn) {
            this.elements.saveBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // 리셋 버튼
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.resetToDefaults());
        }
        
        // 변동성 슬라이더 실시간 업데이트
        if (this.elements.volatilityRange && this.elements.volatilityValue) {
            this.elements.volatilityRange.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.elements.volatilityValue.textContent = `2-${value}%`;
                this.updateSetting('volatilityMax', value / 100);
            });
        }
        
        // 실시간 설정 변경 감지
        this.setupRealTimeUpdates();
    }
    
    /**
     * 실시간 설정 업데이트 리스너 설정
     */
    setupRealTimeUpdates() {
        const settingsMap = {
            minVolume: 'minVolume',
            autoUpdateEnabled: 'autoUpdateEnabled',
            updateInterval: 'updateInterval',
            demoMode: 'demoMode',
            notificationEnabled: 'notificationEnabled'
        };
        
        Object.entries(settingsMap).forEach(([elementId, settingKey]) => {
            const element = this.elements[elementId];
            if (!element) return;
            
            const eventType = element.type === 'checkbox' ? 'change' : 'input';
            element.addEventListener(eventType, (e) => {
                const value = element.type === 'checkbox' ? e.target.checked : 
                             element.type === 'number' ? parseFloat(e.target.value) :
                             e.target.value;
                this.updateSetting(settingKey, value);
            });
        });
    }
    
    /**
     * 설정 모달 표시
     */
    show() {
        if (!this.modal) return;
        
        this.loadSettings();
        this.modal.classList.remove('hidden');
        this.isVisible = true;
        
        // 포커스 설정
        const firstInput = this.modal.querySelector('input, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
        
        // 이벤트 발생
        this.eventBus?.emit('settings:modal-opened');
        
        console.log('⚙️ 설정 모달 열림');
    }
    
    /**
     * 설정 모달 숨기기
     */
    hide() {
        if (!this.modal) return;
        
        this.modal.classList.add('hidden');
        this.isVisible = false;
        
        // 변경사항이 있으면 확인
        if (this.hasUnsavedChanges()) {
            if (confirm('변경사항이 저장되지 않았습니다. 저장하시겠습니까?')) {
                this.saveSettings();
            } else {
                this.loadSettings(); // 원래 설정으로 되돌리기
            }
        }
        
        // 이벤트 발생
        this.eventBus?.emit('settings:modal-closed');
        
        console.log('⚙️ 설정 모달 닫힘');
    }
    
    /**
     * 현재 설정 로드
     */
    loadSettings() {
        try {
            const settings = this.storageManager?.getSettings?.() || this.getDefaultSettings();
            this.currentSettings = { ...settings };
            this.originalSettings = { ...settings };
            
            this.populateForm(settings);
            
            console.log('📋 설정 로드됨:', settings);
        } catch (error) {
            console.error('❌ 설정 로드 실패:', error);
            this.populateForm(this.getDefaultSettings());
        }
    }
    
    /**
     * 폼에 설정값 채우기
     * @param {Object} settings - 설정 객체
     */
    populateForm(settings) {
        // 변동성 설정
        if (this.elements.volatilityRange && this.elements.volatilityValue) {
            const volatilityMax = (settings.volatilityMax || 0.06) * 100;
            this.elements.volatilityRange.value = volatilityMax;
            this.elements.volatilityValue.textContent = `2-${volatilityMax}%`;
        }
        
        // 최소 거래량
        if (this.elements.minVolume) {
            this.elements.minVolume.value = settings.minVolume || 1000000;
        }
        
        // 자동 업데이트 설정
        if (this.elements.autoUpdateEnabled) {
            this.elements.autoUpdateEnabled.checked = settings.autoUpdateEnabled || false;
        }
        
        if (this.elements.updateInterval) {
            this.elements.updateInterval.value = settings.updateInterval || 60;
        }
        
        // 시스템 설정
        if (this.elements.demoMode) {
            this.elements.demoMode.checked = settings.demoMode || false;
        }
        
        if (this.elements.notificationEnabled) {
            this.elements.notificationEnabled.checked = settings.notificationEnabled !== false;
        }
    }
    
    /**
     * 개별 설정 업데이트
     * @param {string} key - 설정 키
     * @param {any} value - 설정 값
     */
    updateSetting(key, value) {
        this.currentSettings[key] = value;
        
        // 실시간 적용이 가능한 설정들
        this.applyRealTimeSettings(key, value);
        
        // 변경사항 표시
        this.markAsChanged();
    }
    
    /**
     * 실시간 적용 가능한 설정들 처리
     * @param {string} key - 설정 키
     * @param {any} value - 설정 값
     */
    applyRealTimeSettings(key, value) {
        switch (key) {
            case 'demoMode':
                this.eventBus?.emit('settings:demo-mode-changed', { enabled: value });
                break;
            case 'notificationEnabled':
                this.eventBus?.emit('settings:notifications-changed', { enabled: value });
                break;
            case 'autoUpdateEnabled':
                this.eventBus?.emit('settings:auto-update-changed', { enabled: value });
                break;
            case 'updateInterval':
                this.eventBus?.emit('settings:update-interval-changed', { interval: value });
                break;
        }
    }
    
    /**
     * 설정 저장
     */
    saveSettings() {
        try {
            // 설정 유효성 검사
            const validation = this.validateSettings(this.currentSettings);
            if (!validation.isValid) {
                alert(`설정 오류: ${validation.errors.join(', ')}`);
                return;
            }
            
            // 저장
            this.storageManager?.saveSettings?.(this.currentSettings);
            this.originalSettings = { ...this.currentSettings };
            
            // 설정 적용 이벤트 발생
            this.eventBus?.emit('settings:saved', this.currentSettings);
            
            // 성공 표시
            this.showSaveSuccess();
            
            console.log('💾 설정 저장됨:', this.currentSettings);
        } catch (error) {
            console.error('❌ 설정 저장 실패:', error);
            alert('설정 저장에 실패했습니다.');
        }
    }
    
    /**
     * 설정 유효성 검사
     * @param {Object} settings - 검사할 설정
     * @returns {Object} 검사 결과
     */
    validateSettings(settings) {
        const errors = [];
        
        // 변동성 범위 검사
        if (settings.volatilityMax && (settings.volatilityMax < 0.02 || settings.volatilityMax > 0.2)) {
            errors.push('변동성 범위는 2-20% 사이여야 합니다');
        }
        
        // 거래량 검사
        if (settings.minVolume && settings.minVolume < 100000) {
            errors.push('최소 거래량은 10만주 이상이어야 합니다');
        }
        
        // 업데이트 간격 검사
        if (settings.updateInterval && (settings.updateInterval < 30 || settings.updateInterval > 300)) {
            errors.push('업데이트 간격은 30초-5분 사이여야 합니다');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * 기본값으로 리셋
     */
    resetToDefaults() {
        if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
            const defaults = this.getDefaultSettings();
            this.currentSettings = { ...defaults };
            this.populateForm(defaults);
            this.markAsChanged();
            
            console.log('🔄 설정이 기본값으로 리셋됨');
        }
    }
    
    /**
     * 기본 설정 반환
     * @returns {Object} 기본 설정
     */
    getDefaultSettings() {
        return {
            volatilityMin: 0.02,
            volatilityMax: 0.06,
            minVolume: 1000000,
            updateInterval: 60,
            autoUpdateEnabled: false,
            demoMode: false,
            notificationEnabled: true
        };
    }
    
    /**
     * 변경사항 존재 여부 확인
     * @returns {boolean}
     */
    hasUnsavedChanges() {
        return JSON.stringify(this.currentSettings) !== JSON.stringify(this.originalSettings);
    }
    
    /**
     * 변경사항 표시
     */
    markAsChanged() {
        if (this.elements.saveBtn) {
            this.elements.saveBtn.disabled = false;
            this.elements.saveBtn.textContent = '저장 *';
            this.elements.saveBtn.classList.add('has-changes');
        }
    }
    
    /**
     * 저장 성공 표시
     */
    showSaveSuccess() {
        if (this.elements.saveBtn) {
            const originalText = this.elements.saveBtn.textContent;
            this.elements.saveBtn.textContent = '저장됨 ✓';
            this.elements.saveBtn.classList.remove('has-changes');
            this.elements.saveBtn.classList.add('saved');
            
            setTimeout(() => {
                this.elements.saveBtn.textContent = '저장';
                this.elements.saveBtn.classList.remove('saved');
                this.elements.saveBtn.disabled = !this.hasUnsavedChanges();
            }, 2000);
        }
    }
    
    /**
     * 현재 설정 가져오기
     * @returns {Object} 현재 설정
     */
    getCurrentSettings() {
        return { ...this.currentSettings };
    }
    
    /**
     * 특정 설정값 가져오기
     * @param {string} key - 설정 키
     * @returns {any} 설정값
     */
    getSetting(key) {
        return this.currentSettings[key];
    }
    
    /**
     * 컴포넌트 파괴
     */
    destroy() {
        // 이벤트 리스너 제거는 자동으로 처리됨 (요소가 제거되면)
        this.currentSettings = {};
        this.originalSettings = {};
        
        console.log('🗑️ SettingsComponent 파괴됨');
    }
}

// 전역으로 노출
window.SettingsComponent = SettingsComponent;