class BrowserStockScanner {
    constructor() {
        this.apiKey = 'VVTMQ91XVOYZSYFR'; // Alpha Vantage 무료 키
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
            // 캐시된 리스트 먼저 확인
            const cachedTickers = StorageManager.getCachedData('sp500_tickers');
            if (cachedTickers && cachedTickers.length > 0) {
                this.sp500Tickers = cachedTickers;
                console.log(`📦 캐시된 ${this.sp500Tickers.length}개 S&P 500 종목 로드됨`);
                return;
            }

            // 무료 무제한 데이터 소스들
            const freeSources = [
                {
                    name: 'Wikipedia JSON API',
                    url: 'https://en.wikipedia.org/api/rest_v1/page/mobile-sections/List_of_S%26P_500_companies',
                    parser: this.parseWikipediaJSON.bind(this)
                },
                {
                    name: 'GitHub S&P 500 CSV',
                    url: 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv',
                    parser: this.parseCSV.bind(this)
                },
                {
                    name: 'Alternative GitHub CSV',
                    url: 'https://raw.githubusercontent.com/dxjoshi/sp500_stocks/main/sp500_stocks.csv',
                    parser: this.parseAlternativeCSV.bind(this)
                },
                {
                    name: 'Datahub S&P 500',
                    url: 'https://datahub.io/core/s-and-p-500-companies/r/constituents.csv',
                    parser: this.parseCSV.bind(this)
                },
                {
                    name: 'CORS Proxy + Yahoo Finance',
                    url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://finance.yahoo.com/quote/%5EGSPC/components/'),
                    parser: this.parseYahooHTML.bind(this)
                }
            ];

            for (const source of freeSources) {
                try {
                    console.log(`📡 ${source.name}에서 S&P 500 리스트 로드 시도...`);
                    const response = await fetch(source.url);
                    
                    if (response.ok) {
                        const data = await response.text();
                        const tickers = await source.parser(data);
                        
                        if (tickers && tickers.length > 400) { // S&P 500은 500개 정도이므로 400개 이상일 때만 성공으로 간주
                            this.sp500Tickers = tickers;
                            StorageManager.cacheData('sp500_tickers', this.sp500Tickers, 7 * 24 * 60); // 7일 캐시
                            console.log(`📊 ${source.name}에서 ${this.sp500Tickers.length}개 S&P 500 종목 로드됨`);
                            return;
                        } else if (tickers && tickers.length > 0) {
                            console.warn(`⚠️ ${source.name}에서 ${tickers.length}개만 로드됨 (부분 성공)`);
                        }
                    }
                } catch (error) {
                    console.warn(`❌ ${source.name} 로드 실패:`, error);
                    continue;
                }
            }

            // 모든 방법 실패 시 확장된 백업 리스트 사용 (주요 S&P 500 종목들)
            this.sp500Tickers = [
                // 기술주 (Technology)
                'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'AMD', 'PYPL', 'ADBE', 'CRM', 'INTC', 'CSCO', 'AVGO', 'ORCL', 'QCOM', 'TXN', 'INTU', 'AMAT', 'MU', 'LRCX', 'KLAC', 'MRVL', 'CDNS', 'SNPS', 'WDAY', 'ABNB', 'FTNT', 'DXCM', 'TEAM', 'ADSK', 'SPLK', 'DOCU', 'ZOOM', 'ROKU', 'CRWD', 'OKTA', 'SNOW', 'DDOG', 'ZS', 'PANW', 'UBER', 'LYFT', 'PLTR', 'RBLX', 'HOOD', 'AFRM', 'UPST', 'SQ', 'SHOP',
                
                // 헬스케어 (Healthcare)
                'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'ABBV', 'DHR', 'BMY', 'CVS', 'MDT', 'GILD', 'REGN', 'VRTX', 'ISRG', 'CI', 'ANTM', 'HUM', 'BIIB', 'ILMN', 'MRNA', 'DXCM', 'ZTS', 'EW', 'IDXX', 'A', 'SYK', 'BSX', 'ALGN', 'RMD', 'TECH', 'CTLT', 'BDX', 'WAT', 'MTD', 'DGX', 'LH', 'PKI', 'HOLX', 'RVTY', 'MOH', 'CNC', 'CAH', 'MCK', 'ABC', 'VTRS', 'GEHC', 'SOLV', 'PODD', 'HSIC',
                
                // 금융 (Financial Services)
                'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BLK', 'SPGI', 'ICE', 'CME', 'MCO', 'COF', 'USB', 'TFC', 'PNC', 'SCHW', 'BK', 'STT', 'NTRS', 'CFG', 'HBAN', 'RF', 'FITB', 'KEY', 'ZION', 'SIVB', 'PBCT', 'CMA', 'ALLY', 'DFS', 'SYF', 'PYPL', 'FIS', 'FISV', 'ADP', 'PAYX', 'BR', 'MKTX', 'NDAQ', 'CBOE', 'TROW', 'BEN', 'IVZ', 'ETFC', 'IBKR', 'NAVI',
                
                // 소비재 (Consumer Discretionary)
                'TSLA', 'AMZN', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'ORLY', 'LULU', 'EBAY', 'ETSY', 'CHTR', 'CMCSA', 'DISH', 'NFLX', 'DIS', 'PARA', 'WBD', 'FOXA', 'FOX', 'GRMN', 'APTV', 'LEA', 'BWA', 'GM', 'F', 'RIVN', 'LCID', 'NVR', 'PHM', 'DHI', 'LEN', 'TOL', 'KBH', 'MTH', 'TMHC', 'TPG', 'HLT', 'MAR', 'H', 'IHG', 'WYNN', 'LVS', 'MGM', 'CZR', 'PENN', 'DKNG',
                
                // 소비필수재 (Consumer Staples)
                'WMT', 'PG', 'KO', 'PEP', 'COST', 'MDLZ', 'WBA', 'CVS', 'EXC', 'JNJ', 'CL', 'GIS', 'K', 'HSY', 'CPB', 'CAG', 'SJM', 'HRL', 'MKC', 'CHD', 'CLX', 'COTY', 'EL', 'KMB', 'SYY', 'DLTR', 'DG', 'KR', 'SWK', 'TSN', 'TAP', 'STZ', 'DEO', 'PM', 'MO', 'BTI', 'UVV', 'TPG', 'USFD', 'PFGC', 'CALM', 'JJSF', 'LANC', 'RIBT', 'SENEA', 'SENEB', 'SPTN', 'UNFI', 'USNA',
                
                // 에너지 (Energy)
                'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'MPC', 'OXY', 'KMI', 'WMB', 'OKE', 'TRGP', 'LNG', 'FANG', 'DVN', 'PXD', 'CTRA', 'MRO', 'APA', 'HAL', 'BKR', 'FTI', 'NOV', 'HP', 'CHK', 'EQT', 'MTDR', 'SM', 'RRC', 'CNX', 'CIVI', 'CPG', 'CRC', 'CRGY', 'CRK', 'DINO', 'DRQ', 'EGY', 'ENLC', 'EPD', 'ET', 'HESM', 'HES', 'HPK', 'KRP', 'MPLX', 'NEXT', 'NRP',
                
                // 산업재 (Industrials)
                'BA', 'UNP', 'UPS', 'HON', 'RTX', 'LMT', 'CAT', 'DE', 'GE', 'MMM', 'FDX', 'NSC', 'CSX', 'NOC', 'GD', 'EMR', 'ETN', 'ITW', 'PH', 'CMI', 'CARR', 'OTIS', 'PCAR', 'JCI', 'TT', 'ROK', 'FAST', 'VRSK', 'PAYX', 'CTAS', 'EXPD', 'CHRW', 'JBHT', 'ODFL', 'XPO', 'ARCB', 'LSTR', 'MATX', 'SAIA', 'WERN', 'KNX', 'HUBG', 'FELE', 'GATX', 'GWR', 'RAIL', 'UNP', 'WAB', 'WABC',
                
                // 소재 (Materials)
                'LIN', 'APD', 'ECL', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'PPG', 'IFF', 'MLM', 'VMC', 'NUE', 'STLD', 'PKG', 'IP', 'WRK', 'SON', 'SEE', 'BALL', 'CCL', 'AMCR', 'AVY', 'CF', 'FMC', 'LYB', 'CE', 'RPM', 'ALB', 'EMN', 'MOS', 'AA', 'X', 'CLF', 'SCCO', 'TECK', 'RIO', 'BHP', 'VALE', 'GOLD', 'NEM', 'AEM', 'KGC', 'AU', 'EGO', 'CDE', 'AG', 'HL', 'PAAS',
                
                // 부동산 (Real Estate)
                'AMT', 'PLD', 'CCI', 'EQIX', 'WELL', 'DLR', 'O', 'SBAC', 'PSA', 'EXR', 'AVB', 'EQR', 'VICI', 'VTR', 'ESS', 'MAA', 'KIM', 'REG', 'FRT', 'BXP', 'ARE', 'HST', 'CPT', 'UDR', 'PEAK', 'AIV', 'ELS', 'SUI', 'MSA', 'LSI', 'CUBE', 'REXR', 'AMH', 'INVH', 'COLD', 'PPS', 'LAMR', 'UNIT', 'ROIC', 'STAG', 'FR', 'KRC', 'HIW', 'DEI', 'PGRE', 'SLG', 'VNO', 'BDN', 'CUZ',
                
                // 유틸리티 (Utilities)
                'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'WEC', 'ED', 'EIX', 'ETR', 'ES', 'FE', 'AWK', 'PPL', 'CMS', 'DTE', 'NI', 'LNT', 'EVRG', 'AEE', 'CNP', 'VST', 'ATO', 'NJR', 'SWX', 'OGE', 'POR', 'AVA', 'AGR', 'BKH', 'SR', 'MDU', 'UTL', 'MGEE', 'OTTR', 'NOVA', 'YORW', 'ARTNA', 'CWEN', 'CWEN.A', 'HE', 'IDA', 'NEP', 'NWE', 'PNM', 'UGI', 'WTRG'
            ];
            
            console.log(`📋 백업 리스트 사용: ${this.sp500Tickers.length}개 종목`);
            
        } catch (error) {
            console.error('S&P 500 리스트 로드 실패:', error);
            // 최소 백업 리스트
            this.sp500Tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
            console.log(`⚠️ 최소 백업 리스트 사용: ${this.sp500Tickers.length}개 종목`);
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
            // 순차적 처리 (하나씩 처리)
            const totalTickers = this.sp500Tickers.length;
            
            for (let i = 0; i < totalTickers; i++) {
                const ticker = this.sp500Tickers[i];
                const progress = Math.round(((i + 1) / totalTickers) * 100);
                
                this.updateStatus(`스캔 중... ${ticker} (${i + 1}/${totalTickers}) ${progress}%`, 'scanning');
                
                try {
                    const stock = await this.analyzeStock(ticker, settings);
                    results.totalScanned++;
                    
                    if (stock) {
                        if (stock.isBreakout) {
                            results.breakoutStocks.push(stock);
                            console.log(`🚀 돌파 발견: ${ticker} $${stock.currentPrice.toFixed(2)} (진입가: $${stock.entryPrice.toFixed(2)}, 목표1: $${stock.target1.toFixed(2)})`);
                        } else {
                            results.waitingStocks.push(stock);
                            console.log(`⏰ 대기 중: ${ticker} $${stock.currentPrice.toFixed(2)} (진입까지: $${stock.gapToEntry.toFixed(2)})`);
                        }
                        
                        // 상세 로그 (디버깅용)
                        console.debug(`📊 ${ticker} 분석결과:`, {
                            현재가: stock.currentPrice.toFixed(2),
                            진입가: stock.entryPrice.toFixed(2),
                            변동률: stock.volatility.toFixed(1) + '%',
                            거래량: stock.volume.toLocaleString(),
                            돌파여부: stock.isBreakout ? '✅' : '❌',
                            조건만족: stock.meetsConditions ? '✅' : '❌'
                        });
                    } else {
                        results.errors++;
                        console.warn(`❌ ${ticker} 분석 실패: 조건 불만족`);
                    }
                } catch (error) {
                    results.errors++;
                    console.error(`❌ ${ticker} 분석 실패:`, error.message);
                }
                
                // 실시간 업데이트 (10개마다 또는 새로운 돌파 종목 발견 시)
                if ((i + 1) % 10 === 0 || (stock && stock.isBreakout)) {
                    this.updateDashboard(results);
                }
                
                // API 제한 방지를 위한 딜레이 (데모 모드가 아닐 때만)
                if (this.apiKey !== 'demo') {
                    await this.delay(200); // 200ms 딜레이
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
        // 실제 Alpha Vantage API 키가 있을 때 API 호출
        if (this.apiKey !== 'demo') {
            try {
                console.log(`📡 ${ticker} Alpha Vantage API 데이터 가져오는 중...`);
                const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&apikey=${this.apiKey}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    const parsedData = await this.parseAlphaVantageData(data);
                    
                    if (parsedData && parsedData.timeSeries) {
                        console.log(`✅ ${ticker} 실제 API 데이터 로드 성공`);
                        return parsedData;
                    } else {
                        console.warn(`⚠️ ${ticker} API 응답이 유효하지 않음, 모의 데이터 사용`);
                    }
                } else {
                    console.warn(`⚠️ ${ticker} API 응답 오류 (${response.status}), 모의 데이터 사용`);
                }
            } catch (apiError) {
                console.warn(`❌ ${ticker} Alpha Vantage API 실패:`, apiError);
            }
        }
    }

    // API 데이터 파싱 메서드들
    async parseAlphaVantageData(data) {
        try {
            if (data['Error Message'] || data['Note']) {
                throw new Error('API 제한 또는 오류');
            }
            
            return {
                timeSeries: data['Time Series (Daily)']
            };
        } catch (error) {
            return null;
        }
    }


    displayResults(results) {
        // 대시보드 업데이트
        this.updateDashboard(results);
        
        // 돌파 종목 표시
        this.renderStockCards('breakoutStocks', results.breakoutStocks, 'breakout');
        
        // 대기 종목 표시
        this.renderStockCards('waitingStocks', results.waitingStocks, 'waiting');
    }

    updateDashboard(results) {
        // 대시보드 숫자 업데이트
        document.getElementById('breakoutCount').textContent = results.breakoutStocks.length;
        document.getElementById('waitingCount').textContent = results.waitingStocks.length;
        document.getElementById('totalScanned').textContent = results.totalScanned;
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('ko-KR');
        
        // 진행 중일 때 실시간 결과 표시
        if (results.breakoutStocks.length > 0) {
            this.renderStockCards('breakoutStocks', results.breakoutStocks.slice(0, 10), 'breakout');
        }
        
        if (results.waitingStocks.length > 0) {
            this.renderStockCards('waitingStocks', results.waitingStocks.slice(0, 15), 'waiting');
        }
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

    // 데이터 파싱 메서드들

    // Wikipedia JSON API 파싱
    parseWikipediaJSON(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            const tickers = [];
            
            // Wikipedia mobile API 응답에서 테이블 데이터 추출
            if (data.sections) {
                for (const section of data.sections) {
                    if (section.text && section.text.includes('ticker')) {
                        const regex = /\b[A-Z]{1,5}\b/g;
                        const matches = section.text.match(regex);
                        if (matches) {
                            matches.forEach(ticker => {
                                if (ticker.length <= 5 && !tickers.includes(ticker)) {
                                    tickers.push(ticker);
                                }
                            });
                        }
                    }
                }
            }
            
            console.log(`Wikipedia JSON에서 ${tickers.length}개 종목 파싱됨`);
            return tickers;
        } catch (error) {
            console.warn('Wikipedia JSON 파싱 실패:', error);
            return [];
        }
    }

    // CSV 파싱 (표준)
    parseCSV(csvText) {
        try {
            const lines = csvText.split('\n');
            const tickers = [];
            
            // CSV 파싱 (첫 번째 줄은 헤더 - Symbol,Security,GICS Sector,...)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    const ticker = line.split(',')[0].trim().replace(/"/g, '');
                    if (ticker && ticker.length <= 5 && ticker.match(/^[A-Z]+$/)) {
                        tickers.push(ticker);
                    }
                }
            }
            
            console.log(`CSV에서 ${tickers.length}개 종목 파싱됨`);
            return tickers;
        } catch (error) {
            console.warn('CSV 파싱 실패:', error);
            return [];
        }
    }

    // Alternative CSV 파싱
    parseAlternativeCSV(csvText) {
        try {
            const lines = csvText.split('\n');
            const tickers = [];
            
            // 헤더에서 Symbol 컬럼 찾기
            const headers = lines[0].toLowerCase().split(',');
            const symbolIndex = headers.findIndex(h => 
                h.includes('symbol') || h.includes('ticker') || h.includes('stock')
            );
            
            if (symbolIndex >= 0) {
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        const columns = line.split(',');
                        if (columns.length > symbolIndex) {
                            const ticker = columns[symbolIndex].trim().replace(/"/g, '');
                            if (ticker && ticker.length <= 5 && ticker.match(/^[A-Z]+$/)) {
                                tickers.push(ticker);
                            }
                        }
                    }
                }
            }
            
            console.log(`Alternative CSV에서 ${tickers.length}개 종목 파싱됨`);
            return tickers;
        } catch (error) {
            console.warn('Alternative CSV 파싱 실패:', error);
            return [];
        }
    }

    // Yahoo Finance HTML 파싱
    parseYahooHTML(htmlText) {
        try {
            const tickers = [];
            
            // Yahoo Finance에서 ticker 패턴 찾기
            const tickerRegex = /data-symbol="([A-Z]{1,5})"/g;
            let match;
            
            while ((match = tickerRegex.exec(htmlText)) !== null) {
                const ticker = match[1];
                if (ticker && ticker.length <= 5 && !tickers.includes(ticker)) {
                    tickers.push(ticker);
                }
            }
            
            // 추가 패턴으로 더 많은 ticker 찾기
            const altRegex = /symbol:\s*"([A-Z]{1,5})"/g;
            while ((match = altRegex.exec(htmlText)) !== null) {
                const ticker = match[1];
                if (ticker && ticker.length <= 5 && !tickers.includes(ticker)) {
                    tickers.push(ticker);
                }
            }
            
            console.log(`Yahoo Finance HTML에서 ${tickers.length}개 종목 파싱됨`);
            return tickers;
        } catch (error) {
            console.warn('Yahoo Finance HTML 파싱 실패:', error);
            return [];
        }
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