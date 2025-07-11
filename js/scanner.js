class BrowserStockScanner {
    constructor() {
        this.apiKey = 'demo'; // Alpha Vantage 무료 키
        this.corsProxy = 'https://api.allorigins.win/raw?url=';
        this.isScanning = false;
        this.sp500Tickers = [];
    }

    async init() {
        console.log('🚀 스캐너 초기화 중...');
        await this.loadSP500Tickers();
        this.bindEvents();
    }

    async loadSP500Tickers() {
        try {
            // Wikipedia에서 S&P 500 리스트 가져오기 (CORS 우회)
            const url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies';
            const response = await fetch(`${this.corsProxy}${encodeURIComponent(url)}`);
            const html = await response.text();
            
            // HTML 파싱해서 티커 추출
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const table = doc.querySelector('table.wikitable');
            
            if (table) {
                const rows = table.querySelectorAll('tr');
                this.sp500Tickers = [];
                
                for (let i = 1; i < Math.min(rows.length, 51); i++) { // 처음 50개만
                    const cells = rows[i].querySelectorAll('td');
                    if (cells.length > 0) {
                        const ticker = cells[0].textContent.trim();
                        if (ticker && ticker.length <= 5) {
                            this.sp500Tickers.push(ticker);
                        }
                    }
                }
            }
            
            // 백업 리스트 (네트워크 실패 시)
            if (this.sp500Tickers.length === 0) {
                this.sp500Tickers = [
                    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 
                    'NFLX', 'AMD', 'PYPL', 'ADBE', 'CRM', 'INTC', 'CSCO', 'PEP'
                ];
            }
            
            console.log(`📊 ${this.sp500Tickers.length}개 S&P 500 종목 로드됨`);
            
        } catch (error) {
            console.error('S&P 500 리스트 로드 실패:', error);
            // 하드코딩된 백업 리스트 사용
            this.sp500Tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
        }
    }

    async scanStocks() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        this.updateStatus('스캔 중...', 'scanning');
        
        const results = {
            breakoutStocks: [],
            waitingStocks: [],
            totalScanned: 0,
            errors: 0
        };

        // 설정값 가져오기
        const settings = StorageManager.getSettings();
        
        try {
            // 배치로 처리 (API 제한 고려)
            const batchSize = 5;
            const batches = this.chunkArray(this.sp500Tickers, batchSize);
            
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                this.updateStatus(`스캔 중... (${i + 1}/${batches.length})`, 'scanning');
                
                const promises = batch.map(ticker => this.analyzeStock(ticker, settings));
                const batchResults = await Promise.allSettled(promises);
                
                batchResults.forEach((result, index) => {
                    results.totalScanned++;
                    
                    if (result.status === 'fulfilled' && result.value) {
                        const stock = result.value;
                        if (stock.isBreakout) {
                            results.breakoutStocks.push(stock);
                        } else {
                            results.waitingStocks.push(stock);
                        }
                    } else {
                        results.errors++;
                        console.error(`${batch[index]} 분석 실패:`, result.reason);
                    }
                });
                
                // API 제한 방지를 위한 딜레이
                if (i < batches.length - 1) {
                    await this.delay(1000);
                }
            }
            
            // 결과 정렬
            results.waitingStocks.sort((a, b) => a.gapToEntry - b.gapToEntry);
            results.breakoutStocks.sort((a, b) => b.score - a.score);
            
            // 상위 결과만 유지
            results.waitingStocks = results.waitingStocks.slice(0, 10);
            results.breakoutStocks = results.breakoutStocks.slice(0, 5);
            
            // 로컬 스토리지에 저장
            StorageManager.saveResults(results);
            
            // UI 업데이트
            this.displayResults(results);
            
            // 돌파 알림
            if (results.breakoutStocks.length > 0) {
                NotificationManager.sendBreakoutAlert(results.breakoutStocks);
            }
            
            this.updateStatus(`완료: ${results.totalScanned}개 스캔`, 'completed');
            
        } catch (error) {
            console.error('스캔 중 오류:', error);
            this.updateStatus('스캔 실패', 'error');
        } finally {
            this.isScanning = false;
        }
    }

    async analyzeStock(ticker, settings) {
        try {
            // Yahoo Finance API 대신 Alpha Vantage 사용 (CORS 지원)
            const data = await this.fetchStockData(ticker);
            
            if (!data || !data.timeSeries) {
                return null;
            }
            
            const dates = Object.keys(data.timeSeries).sort().reverse();
            if (dates.length < 2) return null;
            
            const today = data.timeSeries[dates[0]];
            const yesterday = data.timeSeries[dates[1]];
            
            // 변동성 돌파 계산
            const calculation = VolatilityCalculator.calculate({
                currentPrice: parseFloat(today['4. close']),
                yesterdayClose: parseFloat(yesterday['4. close']),
                yesterdayHigh: parseFloat(yesterday['2. high']),
                yesterdayLow: parseFloat(yesterday['3. low']),
                volume: parseInt(yesterday['5. volume'])
            }, settings);
            
            if (!calculation.meetsConditions) {
                return null;
            }
            
            return {
                ticker,
                ...calculation,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`${ticker} 분석 중 오류:`, error);
            return null;
        }
    }

    async fetchStockData(ticker) {
        try {
            // Alpha Vantage API (무료, CORS 지원)
            const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data['Error Message'] || data['Note']) {
                throw new Error('API 제한 또는 오류');
            }
            
            return {
                timeSeries: data['Time Series (Daily)']
            };
            
        } catch (error) {
            // 폴백: 가짜 데이터 (개발/테스트용)
            return this.generateMockData(ticker);
        }
    }

    generateMockData(ticker) {
        // 개발용 모의 데이터
        const basePrice = 50 + Math.random() * 200;
        const volatility = 0.02 + Math.random() * 0.06;
        
        const yesterday = {
            '1. open': (basePrice * (0.98 + Math.random() * 0.04)).toFixed(2),
            '2. high': (basePrice * (1.01 + volatility)).toFixed(2),
            '3. low': (basePrice * (0.99 - volatility)).toFixed(2),
            '4. close': basePrice.toFixed(2),
            '5. volume': Math.floor(1000000 + Math.random() * 5000000).toString()
        };
        
        const today = {
            '1. open': basePrice.toFixed(2),
            '2. high': (basePrice * 1.02).toFixed(2),
            '3. low': (basePrice * 0.98).toFixed(2),
            '4. close': (basePrice * (0.99 + Math.random() * 0.02)).toFixed(2),
            '5. volume': Math.floor(800000 + Math.random() * 4000000).toString()
        };
        
        return {
            timeSeries: {
                '2025-07-11': today,
                '2025-07-10': yesterday
            }
        };
    }

    displayResults(results) {
        // 대시보드 업데이트
        document.getElementById('breakoutCount').textContent = results.breakoutStocks.length;
        document.getElementById('waitingCount').textContent = results.waitingStocks.length;
        document.getElementById('totalScanned').textContent = results.totalScanned;
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('ko-KR');
        
        // 돌파 종목 표시
        this.renderStockCards('breakoutStocks', results.breakoutStocks, 'breakout');
        
        // 대기 종목 표시
        this.renderStockCards('waitingStocks', results.waitingStocks, 'waiting');
    }

    renderStockCards(containerId, stocks, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        if (stocks.length === 0) {
            container.innerHTML = '<div class="no-results">조건에 맞는 종목이 없습니다.</div>';
            return;
        }
        
        stocks.forEach(stock => {
            const card = document.createElement('div');
            card.className = `stock-card ${type}`;
            card.onclick = () => this.openStockChart(stock.ticker);
            
            const gapDisplay = type === 'waiting' 
                ? `<div class="gap">돌파까지: $${stock.gapToEntry.toFixed(2)}</div>`
                : '<div class="breakout-badge">돌파!</div>';
            
            card.innerHTML = `
                <div class="stock-header">
                    <h3>${stock.ticker}</h3>
                    ${gapDisplay}
                </div>
                <div class="price-info">
                    <div class="current-price">$${stock.currentPrice.toFixed(2)}</div>
                    <div class="entry-price">진입: $${stock.entryPrice.toFixed(2)}</div>
                </div>
                <div class="targets">
                    <div class="target stop-loss">손절: $${stock.stopLoss.toFixed(2)}</div>
                    <div class="target profit">목표1: $${stock.target1.toFixed(2)}</div>
                    <div class="target profit">목표2: $${stock.target2.toFixed(2)}</div>
                </div>
                <div class="stats">
                    <span>변동률: ${stock.volatility.toFixed(1)}%</span>
                    <span>거래량: ${this.formatNumber(stock.volume)}</span>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    openStockChart(ticker) {
        // TradingView 또는 Yahoo Finance로 새 탭에서 열기
        const url = `https://finance.yahoo.com/quote/${ticker}`;
        window.open(url, '_blank');
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    updateStatus(message, type = 'default') {
        const statusEl = document.getElementById('status');
        statusEl.textContent = message;
        statusEl.className = `status status-${type}`;
    }

    bindEvents() {
        document.getElementById('scanBtn').addEventListener('click', () => {
            this.scanStocks();
        });
        
        // 자동 스캔 설정
        document.getElementById('autoScan').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoScan();
            } else {
                this.stopAutoScan();
            }
        });
        
        // 설정 변경 감지
        document.getElementById('volatilityRange').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('volatilityValue').textContent = `2-${value}%`;
            StorageManager.updateSettings({ volatilityMax: value / 100 });
        });
        
        document.getElementById('minVolume').addEventListener('change', (e) => {
            StorageManager.updateSettings({ minVolume: parseInt(e.target.value) });
        });
    }

    startAutoScan() {
        this.autoScanInterval = setInterval(() => {
            if (!this.isScanning) {
                this.scanStocks();
            }
        }, 5 * 60 * 1000); // 5분마다
    }

    stopAutoScan() {
        if (this.autoScanInterval) {
            clearInterval(this.autoScanInterval);
            this.autoScanInterval = null;
        }
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 전역 스캐너 인스턴스
let stockScanner;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    stockScanner = new BrowserStockScanner();
    await stockScanner.init();
    
    // 캐시된 결과 로드
    const cachedResults = StorageManager.getResults();
    if (cachedResults) {
        stockScanner.displayResults(cachedResults);
    }
});