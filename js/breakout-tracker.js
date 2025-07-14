// 래리 윌리엄스 변동성 돌파 추적 시스템
class BreakoutTracker {
  constructor() {
      this.watchList = new Map(); // 돌파 대기 종목들
      this.isTracking = false;
      this.trackingInterval = null;
      this.todayBreakouts = [];
      this.settings = {
          trackingIntervalMs: 30000, // 30초
          maxWatchListSize: 30,
          riskAmount: 1000 // $1000
      };
  }

  // 초기화
  async init() {
      console.log('🎯 돌파 추적 시스템 초기화...');
      
      // 저장된 워치리스트 로드
      this.loadWatchList();
      
      // 오늘의 돌파 기록 로드
      this.loadTodayBreakouts();
      
      // 이벤트 바인딩
      this.bindEvents();
      
      // UI 초기화
      this.initializeUI();
      
      console.log('✅ 돌파 추적 시스템 준비 완료');
  }

  // 돌파 대기 워치리스트 생성 (전날 데이터 기반)
  async generateWatchList() {
      console.log('📋 래리 윌리엄스 돌파 대기 종목 선별 시작...');
      this.updateStatus('워치리스트 생성 중...', 'scanning');
      
      // 캐시된 데이터 제외하고 새로운 스캔 실행
      console.log('🔄 캐시된 항목을 제외하고 새로운 워치리스트 생성 시작...');
      
      const candidates = [];
      const settings = StorageManager.getSettings();
      let skippedCount = 0;
      let scannedCount = 0;
      
      try {
          // S&P 500 종목들을 분석
          const tickers = stockScanner?.sp500Tickers || [];
          const totalTickers = tickers.length-1;
          
          for (let i = 0; i < totalTickers; i++) {
              const ticker = tickers[i];
              const progress = Math.round(((i + 1) / totalTickers) * 100);
              
              // 캐시된 데이터가 있는지 확인
              const cachedData = StorageManager.getCachedData(`stock_${ticker}`);
              if (cachedData) {
                  skippedCount++;
                  console.log(`⏭️ ${ticker} 캐시된 데이터 있음, 건너뜀`);
                  this.updateStatus(`워치리스트 생성 중... ${ticker} (캐시됨, 건너뜀) (${i + 1}/${totalTickers}) ${progress}%`, 'scanning');
                  continue;
              }
              
              scannedCount++;
              this.updateStatus(`워치리스트 생성 중... ${ticker} (새로 스캔) (${i + 1}/${totalTickers}) ${progress}%`, 'scanning');
              
              try {
                  // 캐시되지 않은 종목만 새로 데이터 가져오기
                  const yesterdayData = await this.getYesterdayData(ticker);
                  if (!yesterdayData) continue;
                  
                  const analysis = this.analyzeWatchListCandidate(yesterdayData, settings);
                  
                  if (analysis.isCandidate) {
                      candidates.push({
                          ticker,
                          ...analysis,
                          addedAt: new Date(),
                          lastCheck: null,
                          hasBreakout: false,
                          currentPrice: null
                      });
                      
                      console.log(`✅ ${ticker} 워치리스트 추가 (점수: ${analysis.score})`);
                  }
                  
              } catch (error) {
                  console.warn(`❌ ${ticker} 분석 실패:`, error.message);
              }
              
              // API 제한 고려 딜레이
              await this.delay(stockScanner?.demoMode ? 50 : 200);
          }
          
          // 점수 순으로 정렬하고 상위 30개만 선택
          candidates.sort((a, b) => b.score - a.score);
          const topCandidates = candidates.slice(0, this.settings.maxWatchListSize);
          
          // 워치리스트 업데이트
          this.updateWatchList(topCandidates);
          
          // 캐시에 저장 (24시간 유효)
          StorageManager.saveWatchListCandidates(topCandidates);
          
          this.updateStatus(`워치리스트 생성 완료: ${topCandidates.length}개 종목 (새로 스캔: ${scannedCount}개, 캐시 건너뜀: ${skippedCount}개)`, 'completed');
          
          console.log(`✅ 돌파 대기 워치리스트 생성 완료: ${topCandidates.length}개 종목 (새로 스캔: ${scannedCount}개, 캐시된 항목 건너뜀: ${skippedCount}개)`);
          return topCandidates;
          
      } catch (error) {
          console.error('❌ 워치리스트 생성 실패:', error);
          this.updateStatus('워치리스트 생성 실패', 'error');
          throw error;
      }
  }

  // 전날 데이터 분석 (돌파 대기 후보 선별)
  analyzeWatchListCandidate(data, settings) {
      const {
          yesterdayClose,
          yesterdayHigh,
          yesterdayLow,
          yesterdayVolume,
          priceHistory
      } = data;
      
      // 1. 변동성 계산
      const dailyRange = yesterdayHigh - yesterdayLow;
      const volatility = (dailyRange / yesterdayClose) * 100;
      
      // 2. 래리 윌리엄스 진입가 계산
      const breakoutFactor = settings.breakoutFactor || 0.6;
      const entryPrice = yesterdayClose + (dailyRange * breakoutFactor);
      
      // 3. 조건 확인
      const conditions = {
          volatilityOk: volatility >= (settings.volatilityMin * 100 || 2) && 
                       volatility <= (settings.volatilityMax * 100 || 8),
          volumeOk: yesterdayVolume >= (settings.minVolume || 1000000),
          priceOk: yesterdayClose >= (settings.minPrice || 10),
          consolidation: this.checkConsolidation(priceHistory),
          volumeIncrease: this.checkVolumeIncrease(data)
      };
      
      // 4. 점수 계산
      const score = this.calculateCandidateScore(data, conditions);
      
      // 5. 후보 여부 결정
      const basicConditionsMet = conditions.volatilityOk && 
                               conditions.volumeOk && 
                               conditions.priceOk;
      
      const isCandidate = basicConditionsMet && score >= 60;
      
      return {
          isCandidate,
          entryPrice,
          yesterdayClose,
          stopLoss: entryPrice * 0.95, // -5%
          target1: entryPrice * 1.02,  // +2%
          target2: entryPrice * 1.05,  // +5%
          volatility,
          volume: yesterdayVolume,
          score,
          conditions,
          dailyRange
      };
  }

  // 실시간 돌파 추적 시작
  startRealTimeTracking() {
      if (this.isTracking) {
          console.log('⚠️ 이미 추적 중입니다.');
          return;
      }
      
      if (this.watchList.size === 0) {
          alert('워치리스트가 비어있습니다. 먼저 워치리스트를 생성해주세요.');
          return;
      }
      
      if (!this.isMarketOpen()) {
          console.log('📴 장시간이 아닙니다.');
          this.updateStatus('장시간이 아님 - 추적 대기', 'error');
          return;
      }
      
      this.isTracking = true;
      console.log('🎯 실시간 돌파 추적 시작...');
      
      // 추적 인터벌 설정
      this.trackingInterval = setInterval(() => {
          this.checkBreakouts();
      }, this.settings.trackingIntervalMs);
      
      // 즉시 첫 체크 실행
      this.checkBreakouts();
      
      this.updateTrackingUI(true);
      this.updateStatus('실시간 돌파 추적 중...', 'scanning');
  }

  // 실시간 돌파 추적 중지
  stopRealTimeTracking() {
      if (!this.isTracking) return;
      
      this.isTracking = false;
      
      if (this.trackingInterval) {
          clearInterval(this.trackingInterval);
          this.trackingInterval = null;
      }
      
      console.log('⏹️ 실시간 돌파 추적 중지');
      this.updateTrackingUI(false);
      this.updateStatus('돌파 추적 중지됨', 'default');
  }

  // 돌파 확인 (핵심 로직)
  async checkBreakouts() {
      if (!this.isMarketOpen()) {
          this.stopRealTimeTracking();
          return;
      }
      
      console.log(`🔍 ${this.watchList.size}개 종목 돌파 체크...`);
      const newBreakouts = [];
      
      for (const [ticker, watchItem] of this.watchList) {
          try {
              // 실시간 현재가 조회
              const currentPrice = await this.getCurrentPrice(ticker);
              
              // 돌파 확인: 현재가 >= 미리 계산된 진입가
              if (currentPrice >= watchItem.entryPrice && !watchItem.hasBreakout) {
                  // 🚀 돌파 발생!
                  watchItem.hasBreakout = true;
                  watchItem.breakoutTime = new Date();
                  watchItem.breakoutPrice = currentPrice;
                  watchItem.currentPrice = currentPrice;
                  
                  const gain = ((currentPrice - watchItem.entryPrice) / watchItem.entryPrice * 100).toFixed(2);
                  
                  const breakoutData = {
                      ...watchItem,
                      currentPrice,
                      gain
                  };
                  
                  newBreakouts.push(breakoutData);
                  this.todayBreakouts.push(breakoutData);
                  
                  console.log(`🚀 돌파 감지: ${ticker}`);
                  console.log(`   현재가: $${currentPrice.toFixed(2)}`);
                  console.log(`   진입가: $${watchItem.entryPrice.toFixed(2)}`);
                  console.log(`   돌파폭: +${gain}%`);
                  
                  // 돌파 처리
                  this.handleBreakout(breakoutData);
                  
              } else {
                  // 아직 돌파 안됨 - 현재가만 업데이트
                  watchItem.currentPrice = currentPrice;
              }
              
              watchItem.lastCheck = new Date();
              
          } catch (error) {
              console.warn(`❌ ${ticker} 가격 체크 실패:`, error.message);
          }
          
          await this.delay(50);
      }
      
      // UI 업데이트
      this.displayWatchList();
      this.updateLastCheckTime();
      
      if (newBreakouts.length > 0) {
          this.displayTodayBreakouts();
          
          // 알림 발송
          if (typeof NotificationManager !== 'undefined') {
              NotificationManager.sendBreakoutAlert(newBreakouts);
          }
      }
  }

  // 돌파 이벤트 처리
  handleBreakout(breakoutData) {
      console.log(`📋 ${breakoutData.ticker} 돌파 처리 중...`);
      
      // 1. 모의 주문 생성
      const order = this.createSimulatedOrder(breakoutData);
      
      // 2. 주문 저장
      this.saveOrder(order);
      
      // 3. 화면 알림
      this.showBreakoutNotification(breakoutData);
      
      // 4. 로그 기록
      console.log(`✅ ${breakoutData.ticker} 돌파 처리 완료`);
  }

  // 모의 주문 생성
  createSimulatedOrder(breakoutData) {
      const quantity = Math.floor(this.settings.riskAmount / 
                      (breakoutData.entryPrice - breakoutData.stopLoss));
      
      return {
          ticker: breakoutData.ticker,
          action: 'BUY',
          quantity: Math.max(1, quantity),
          price: breakoutData.currentPrice,
          entryPrice: breakoutData.entryPrice,
          stopLoss: breakoutData.stopLoss,
          target1: breakoutData.target1,
          target2: breakoutData.target2,
          timestamp: new Date(),
          status: 'SIMULATED',
          riskAmount: this.settings.riskAmount
      };
  }

  // 전날 데이터 조회 (데모 모드)
  async getYesterdayData(ticker) {
      if (stockScanner?.demoMode) {
          return this.generateDemoYesterdayData(ticker);
      }
      
      // 실제 API 사용
      return await this.fetchRealYesterdayData(ticker);
  }

  async fetchRealYesterdayData(ticker) {
      try {
          // stockScanner의 fetchStockData 메서드 활용
          const apiData = await stockScanner.fetchStockData(ticker);
          if (!apiData || !apiData.timeSeries) {
              console.warn(`❌ ${ticker} API 데이터 없음`);
              return null;
          }

          const dates = Object.keys(apiData.timeSeries).sort().reverse();
          if (dates.length < 2) {
              console.warn(`❌ ${ticker} 충분한 데이터 없음`);
              return null;
          }

          // 가장 최근 거래일 데이터를 "어제" 데이터로 사용
          const latestDate = dates[0];
          const latestData = apiData.timeSeries[latestDate];
          
          console.log(`📅 ${ticker} 전일 데이터: ${latestDate}`);

          // 이전 5일 데이터로 히스토리 생성
          const priceHistory = [];
          const volumeHistory = [];
          
          for (let i = 0; i < Math.min(5, dates.length); i++) {
              const dayData = apiData.timeSeries[dates[i]];
              priceHistory.unshift(parseFloat(dayData['4. close']));
              volumeHistory.unshift(parseInt(dayData['5. volume']));
          }

          return {
              ticker,
              yesterdayClose: parseFloat(latestData['4. close']),
              yesterdayHigh: parseFloat(latestData['2. high']),
              yesterdayLow: parseFloat(latestData['3. low']),
              yesterdayVolume: parseInt(latestData['5. volume']),
              priceHistory,
              volumeHistory
          };
          
      } catch (error) {
          console.error(`❌ ${ticker} 전일 데이터 가져오기 실패:`, error);
          return null;
      }
  }

  // 데모용 전날 데이터 생성
  generateDemoYesterdayData(ticker) {
      const hash = this.hashCode(ticker);
      const random = (seed) => {
          const x = Math.sin(seed) * 10000;
          return x - Math.floor(x);
      };
      
      const basePrice = 30 + (random(hash) * 200);
      const volatility = 0.015 + (random(hash + 1) * 0.065);
      const volume = 800000 + (random(hash + 2) * 4000000);
      
      const yesterdayClose = basePrice;
      const dailyRange = yesterdayClose * volatility;
      const yesterdayLow = yesterdayClose - (dailyRange * 0.4);
      const yesterdayHigh = yesterdayLow + dailyRange;
      
      return {
          ticker,
          yesterdayClose,
          yesterdayHigh,
          yesterdayLow,
          yesterdayVolume: Math.floor(volume),
          priceHistory: this.generatePriceHistory(basePrice),
          volumeHistory: [volume, volume * 0.8, volume * 1.2, volume * 0.9, volume * 1.1]
      };
  }

  // 실시간 현재가 조회
  async getCurrentPrice(ticker) {
      if (stockScanner?.demoMode) {
          // 데모 모드: 진입가 기준으로 랜덤 변동
          const watchItem = this.watchList.get(ticker);
          if (!watchItem) return null;
          
          const basePrice = watchItem.currentPrice || watchItem.yesterdayClose;
          const volatility = Math.random() * 0.02 - 0.01; // ±1%
          const newPrice = basePrice * (1 + volatility);
          
          // 일정 확률로 돌파 시뮬레이션
          if (!watchItem.hasBreakout && Math.random() < 0.05) { // 5% 확률
              return watchItem.entryPrice + (Math.random() * 0.5); // 진입가 약간 초과
          }
          
          return Math.max(0.01, newPrice);
      }
      
      // 실제 API 사용 시 구현
      return null;
  }

  // UI 업데이트 메서드들
  displayWatchList() {
      const container = document.getElementById('watchListContainer');
      if (!container) return;
      
      const watchArray = Array.from(this.watchList.values());
      container.innerHTML = '';
      
      if (watchArray.length === 0) {
          container.innerHTML = '<div class="no-results">워치리스트가 비어있습니다. 워치리스트 생성 버튼을 클릭하세요.</div>';
          return;
      }
      
      watchArray.forEach(item => {
          const card = this.createWatchListCard(item);
          container.appendChild(card);
      });
      
      // 통계 업데이트
      document.getElementById('watchListCount').textContent = watchArray.length;
  }

  createWatchListCard(item) {
      const card = document.createElement('div');
      card.className = `watch-card ${item.hasBreakout ? 'breakout' : 'waiting'}`;
      
      let statusText, statusClass, currentPriceText;
      
      if (item.currentPrice) {
          if (item.hasBreakout) {
              const gain = ((item.currentPrice - item.entryPrice) / item.entryPrice * 100).toFixed(1);
              statusText = `돌파! +${gain}%`;
              statusClass = 'breakout-badge';
          } else {
              const gapToEntry = Math.max(0, item.entryPrice - item.currentPrice);
              const gapPercent = ((gapToEntry / item.entryPrice) * 100).toFixed(1);
              statusText = gapToEntry > 0 ? `${gapPercent}% 남음` : '진입가 도달';
              statusClass = 'gap';
          }
          currentPriceText = `$${item.currentPrice.toFixed(2)}`;
      } else {
          statusText = '추적 대기';
          statusClass = 'gap';
          currentPriceText = `$${item.yesterdayClose.toFixed(2)} (전일)`;
      }
      
      card.innerHTML = `
          <div class="stock-header">
              <h3>${item.ticker}</h3>
              <div class="${statusClass}">${statusText}</div>
          </div>
          <div class="price-info">
              <div class="current-price">${currentPriceText}</div>
              <div class="entry-price">진입가: $${item.entryPrice.toFixed(2)}</div>
          </div>
          <div class="watch-stats">
              <span>점수: ${item.score}</span>
              <span>변동률: ${item.volatility.toFixed(1)}%</span>
              <span>체크: ${item.lastCheck ? item.lastCheck.toLocaleTimeString('ko-KR') : '대기중'}</span>
          </div>
      `;
      
      card.onclick = () => this.openStockChart(item.ticker);
      return card;
  }

  displayTodayBreakouts() {
      const container = document.getElementById('todayBreakouts');
      if (!container) return;
      
      container.innerHTML = '';
      
      if (this.todayBreakouts.length === 0) {
          container.innerHTML = '<div class="no-results">아직 돌파한 종목이 없습니다.</div>';
          return;
      }
      
      // 최신 돌파 순으로 정렬
      const sortedBreakouts = [...this.todayBreakouts].sort((a, b) => 
          new Date(b.breakoutTime) - new Date(a.breakoutTime)
      );
      
      sortedBreakouts.forEach(breakout => {
          const card = document.createElement('div');
          card.className = 'stock-card breakout';
          
          const breakoutTime = new Date(breakout.breakoutTime).toLocaleTimeString('ko-KR');
          
          card.innerHTML = `
              <div class="stock-header">
                  <h3>${breakout.ticker}</h3>
                  <div class="breakout-badge">돌파! ${breakoutTime}</div>
              </div>
              <div class="price-info">
                  <div class="current-price">$${breakout.currentPrice.toFixed(2)}</div>
                  <div class="entry-price">진입가: $${breakout.entryPrice.toFixed(2)} (+${breakout.gain}%)</div>
              </div>
              <div class="targets">
                  <div class="target stop-loss">손절: $${breakout.stopLoss.toFixed(2)}</div>
                  <div class="target profit">목표1: $${breakout.target1.toFixed(2)}</div>
                  <div class="target profit">목표2: $${breakout.target2.toFixed(2)}</div>
              </div>
          `;
          
          card.onclick = () => this.openStockChart(breakout.ticker);
          container.appendChild(card);
      });
      
      // 통계 업데이트
      document.getElementById('breakoutToday').textContent = this.todayBreakouts.length;
  }

  // 유틸리티 메서드들
  updateWatchList(candidates) {
      this.watchList.clear();
      candidates.forEach(candidate => {
          this.watchList.set(candidate.ticker, candidate);
      });
      
      this.saveWatchList();
      this.displayWatchList();
  }

  updateTrackingUI(isTracking) {
      const trackBtn = document.getElementById('trackingBtn');
      if (trackBtn) {
          // 아이콘과 텍스트를 분리된 구조로 업데이트
          trackBtn.innerHTML = isTracking ? 
              '<span class="btn-icon">⏹️</span><span class="btn-text">추적 중지</span>' : 
              '<span class="btn-icon">▶️</span><span class="btn-text">추적 시작</span>';
          trackBtn.className = isTracking ? 'nav-btn success tracking' : 'nav-btn success';
      }
      
      const status = document.getElementById('trackingStatus');
      if (status) {
          status.textContent = isTracking ? '실시간 추적 중...' : '추적 중지';
          status.className = isTracking ? 'status status-scanning' : 'status';
      }
  }

  updateLastCheckTime() {
      const timeEl = document.getElementById('lastCheckTime');
      if (timeEl) {
          timeEl.textContent = new Date().toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit'
          });
      }
  }

  updateStatus(message, type = 'default') {
      const statusEl = document.getElementById('status');
      if (statusEl) {
          statusEl.textContent = message;
          statusEl.className = `status status-${type}`;
      }
      console.log(`📢 상태: ${message}`);
  }

  showBreakoutNotification(data) {
      const notification = document.createElement('div');
      notification.className = 'breakout-notification';
      notification.innerHTML = `
          <div class="notification-content">
              <h3>🚀 돌파 감지!</h3>
              <p><strong>${data.ticker}</strong>이 진입가를 돌파했습니다!</p>
              <p>현재가: $${data.currentPrice.toFixed(2)} (+${data.gain}%)</p>
              <button onclick="this.parentElement.parentElement.remove()">확인</button>
          </div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
          if (notification.parentElement) {
              notification.remove();
          }
      }, 10000);
  }

  openStockChart(ticker) {
      const url = `https://finance.yahoo.com/quote/${ticker}`;
      window.open(url, '_blank');
  }

  isMarketOpen() {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const currentDay = now.getDay();
      
      // 주말 체크
      if (currentDay === 0 || currentDay === 6) return false;
      
      // 장시간 체크 (9:30-16:00)
      return currentTime >= (9 * 60 + 30) && currentTime < (16 * 60);
  }

  // 데이터 저장/로드
  saveWatchList() {
      const data = Array.from(this.watchList.values());
      StorageManager.cacheData('breakout_watchlist', data, 24 * 60);
  }

  loadWatchList() {
      const data = StorageManager.getCachedData('breakout_watchlist');
      if (data && Array.isArray(data)) {
          this.watchList.clear();
          data.forEach(item => {
              this.watchList.set(item.ticker, item);
          });
          this.displayWatchList();
          console.log(`📦 워치리스트 로드됨: ${data.length}개 종목`);
      }
  }

  loadTodayBreakouts() {
      const today = new Date().toDateString();
      const saved = localStorage.getItem('today_breakouts');
      if (saved) {
          const data = JSON.parse(saved);
          // 오늘 날짜의 돌파만 필터링
          this.todayBreakouts = data.filter(item => 
              new Date(item.breakoutTime).toDateString() === today
          );
          this.displayTodayBreakouts();
      }
  }

  saveOrder(order) {
      const orders = JSON.parse(localStorage.getItem('simulated_orders') || '[]');
      orders.push(order);
      localStorage.setItem('simulated_orders', JSON.stringify(orders));
      console.log('💾 모의 주문 저장됨:', order);
  }

  // 이벤트 바인딩
  bindEvents() {
      // 워치리스트 생성 버튼
      const generateBtn = document.getElementById('generateWatchListBtn');
      if (generateBtn) {
          generateBtn.addEventListener('click', () => {
              this.generateWatchList();
          });
      }
      
      // 추적 시작/중지 버튼
      const trackingBtn = document.getElementById('trackingBtn');
      if (trackingBtn) {
          trackingBtn.addEventListener('click', () => {
              if (this.isTracking) {
                  this.stopRealTimeTracking();
              } else {
                  this.startRealTimeTracking();
              }
          });
      }
  }

  initializeUI() {
      this.displayWatchList();
      this.displayTodayBreakouts();
      this.updateTrackingUI(false);
  }

  // 헬퍼 메서드들
  delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // 32bit 정수로 변환
      }
      return Math.abs(hash);
  }

  generatePriceHistory(basePrice) {
      const history = [];
      let price = basePrice;
      
      for (let i = 0; i < 5; i++) {
          const change = (Math.random() - 0.5) * 0.04;
          price *= (1 + change);
          
          history.push({
              close: price,
              high: price * (1 + Math.random() * 0.02),
              low: price * (1 - Math.random() * 0.02),
              date: new Date(Date.now() - (4-i) * 24 * 60 * 60 * 1000)
          });
      }
      
      return history;
  }

  checkConsolidation(priceHistory) {
      if (!priceHistory || priceHistory.length < 3) return false;
      
      const highs = priceHistory.map(d => d.high);
      const lows = priceHistory.map(d => d.low);
      const range = Math.max(...highs) - Math.min(...lows);
      const avgPrice = priceHistory.reduce((sum, d) => sum + d.close, 0) / priceHistory.length;
      
      return (range / avgPrice) <= 0.05; // 5% 이내 횡보
  }

  checkVolumeIncrease(data) {
      const { yesterdayVolume, volumeHistory } = data;
      if (!volumeHistory || volumeHistory.length < 3) return true;
      
      const avgVolume = volumeHistory.reduce((sum, v) => sum + v, 0) / volumeHistory.length;
      return yesterdayVolume > avgVolume * 1.1; // 10% 이상 증가
  }

  calculateCandidateScore(data, conditions) {
      let score = 0;
      
      // 기본 조건 (각 20점)
      if (conditions.volatilityOk) score += 20;
      if (conditions.volumeOk) score += 20;
      if (conditions.priceOk) score += 20;
      
      // 고급 조건 (각 15점)
      if (conditions.consolidation) score += 15;
      if (conditions.volumeIncrease) score += 15;
      
      // 추가 점수 (변동성 최적화)
      const volatility = data.yesterdayClose ? 
          ((data.yesterdayHigh - data.yesterdayLow) / data.yesterdayClose) * 100 : 0;
      
      if (volatility >= 3 && volatility <= 5) score += 10; // 최적 변동성
      
      return Math.min(100, score);
  }
}

// 전역 인스턴스
let breakoutTracker;

// 초기화 함수
const initBreakoutTracker = async () => {
  try {
      breakoutTracker = new BreakoutTracker();
      await breakoutTracker.init();
      
      // 전역 객체로 노출
      window.breakoutTracker = breakoutTracker;
      
      console.log('✅ BreakoutTracker 초기화 완료');
      return breakoutTracker;
      
  } catch (error) {
      console.error('❌ BreakoutTracker 초기화 실패:', error);
      return null;
  }
};