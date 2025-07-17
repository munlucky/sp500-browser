class BrowserStockScanner {
    constructor() {
        this.apiKey = 'VVTMQ91XVOYZSYFR'; // Alpha Vantage 무료 키
        this.corsProxy = 'https://api.allorigins.win/raw?url=';
        this.isScanning = false;
        this.sp500Tickers = [];
        this.demoMode = true; // 테스트용 데모 모드 활성화
        this.autoUpdateTimeout = null;
        this.autoUpdateEnabled = false;
        this.isAutoUpdating = false; // 업데이트 실행 중 플래그
        this.lastScanResults = null;
        this.progressInterval = null;
        this.lastUpdateTime = null;
        this.updateIntervalMs = 60000; // 기본 1분
    }

    async init() {
        console.log('🚀 스캐너 초기화 중...');
        await this.loadSP500Tickers();
        this.loadSettings();
        this.bindEvents();
        
        // 초기 UI 상태 설정
        this.updateAutoUpdateButtonUI();
    }

    // 설정 로드
    loadSettings() {
        const settings = StorageManager.getSettings();
        this.demoMode = settings.demoMode;
        this.updateIntervalMs = settings.updateInterval * 1000;
        console.log('📋 설정 로드됨:', {
            demoMode: this.demoMode,
            updateInterval: settings.updateInterval + '초',
            autoUpdateEnabled: settings.autoUpdateEnabled
        });
    }

    async loadSP500Tickers() {
        try {
            // 캐시된 리스트 먼저 확인
            const cachedTickers = StorageManager.getCachedData('sp500_tickers');
            if (cachedTickers && cachedTickers.length > 400) {
                this.sp500Tickers = cachedTickers;
                console.log(`📦 캐시된 ${this.sp500Tickers.length}개 S&P 500 종목 로드됨`);
                return;
            }

            // 무료 무제한 데이터 소스들
            const freeSources = [
                {
                    name: 'Wikipedia JSON API',
                    url: this.corsProxy + encodeURIComponent('https://en.wikipedia.org/api/rest_v1/page/mobile-sections/List_of_S%26P_500_companies'),
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
                }
            ];

            for (const source of freeSources) {
                try {
                    console.log(`📡 ${source.name}에서 S&P 500 리스트 로드 시도...`);
                    console.log(`🔗 URL: ${source.url}`);
                    const response = await fetch(source.url);
                    
                    console.log(`📊 응답 상태: ${response.status} ${response.statusText}`);
                    
                    if (response.ok) {
                        const data = await response.text();
                        console.log(`📄 데이터 길이: ${data.length} characters`);
                        console.log(`📄 데이터 시작 부분: ${data.substring(0, 200)}...`);
                        
                        const tickers = await source.parser(data);
                        console.log(`🎯 파싱 결과: ${tickers ? tickers.length : 0}개 티커`);
                        
                        if (tickers && tickers.length > 400) { // S&P 500은 500개 정도이므로 400개 이상일 때만 성공으로 간주
                            // 중복 제거
                            this.sp500Tickers = [...new Set(tickers)];
                            StorageManager.cacheData('sp500_tickers', this.sp500Tickers, 7 * 24 * 60); // 7일 캐시
                            console.log(`📊 ${source.name}에서 ${this.sp500Tickers.length}개 S&P 500 종목 로드됨 (중복 제거 완료)`);
                            return;
                        } else if (tickers && tickers.length > 0) {
                            console.warn(`⚠️ ${source.name}에서 ${tickers.length}개만 로드됨 (부분 성공)`);
                            console.log(`🔍 첫 10개 티커:`, tickers.slice(0, 10));
                        } else {
                            console.warn(`❌ ${source.name}에서 파싱 실패 또는 빈 결과`);
                        }
                    } else {
                        console.warn(`❌ ${source.name} HTTP 오류: ${response.status} ${response.statusText}`);
                    }
                } catch (error) {
                    console.warn(`❌ ${source.name} 로드 실패:`, error);
                    continue;
                }
            }

            // 모든 방법 실패 시 확장된 백업 리스트 사용 (주요 S&P 500 종목들) - 중복 제거됨
            const backupTickers = [
                // 기술주 (Technology)
                'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'AMD', 'PYPL', 'ADBE', 'CRM', 'INTC', 'CSCO', 'AVGO', 'ORCL', 'QCOM', 'TXN', 'INTU', 'AMAT', 'MU', 'LRCX', 'KLAC', 'MRVL', 'CDNS', 'SNPS', 'WDAY', 'ABNB', 'FTNT', 'DXCM', 'TEAM', 'ADSK', 'SPLK', 'DOCU', 'ZOOM', 'ROKU', 'CRWD', 'OKTA', 'SNOW', 'DDOG', 'ZS', 'PANW', 'UBER', 'LYFT', 'PLTR', 'RBLX', 'HOOD', 'AFRM', 'UPST', 'SQ', 'SHOP',
                
                // 헬스케어 (Healthcare)
                'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'ABBV', 'DHR', 'BMY', 'CVS', 'MDT', 'GILD', 'REGN', 'VRTX', 'ISRG', 'CI', 'ANTM', 'HUM', 'BIIB', 'ILMN', 'MRNA', 'ZTS', 'EW', 'IDXX', 'A', 'SYK', 'BSX', 'ALGN', 'RMD', 'TECH', 'CTLT', 'BDX', 'WAT', 'MTD', 'DGX', 'LH', 'PKI', 'HOLX', 'RVTY', 'MOH', 'CNC', 'CAH', 'MCK', 'ABC', 'VTRS', 'GEHC', 'SOLV', 'PODD', 'HSIC',
                
                // 금융 (Financial Services)
                'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BLK', 'SPGI', 'ICE', 'CME', 'MCO', 'COF', 'USB', 'TFC', 'PNC', 'SCHW', 'BK', 'STT', 'NTRS', 'CFG', 'HBAN', 'RF', 'FITB', 'KEY', 'ZION', 'SIVB', 'PBCT', 'CMA', 'ALLY', 'DFS', 'SYF', 'FIS', 'FISV', 'ADP', 'PAYX', 'BR', 'MKTX', 'NDAQ', 'CBOE', 'TROW', 'BEN', 'IVZ', 'ETFC', 'IBKR', 'NAVI',
                
                // 소비재 (Consumer Discretionary)
                'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'ORLY', 'LULU', 'EBAY', 'ETSY', 'CHTR', 'CMCSA', 'DISH', 'DIS', 'PARA', 'WBD', 'FOXA', 'FOX', 'GRMN', 'APTV', 'LEA', 'BWA', 'GM', 'F', 'RIVN', 'LCID', 'NVR', 'PHM', 'DHI', 'LEN', 'TOL', 'KBH', 'MTH', 'TMHC', 'TPG', 'HLT', 'MAR', 'H', 'IHG', 'WYNN', 'LVS', 'MGM', 'CZR', 'PENN', 'DKNG',
                
                // 소비필수재 (Consumer Staples)
                'WMT', 'PG', 'KO', 'PEP', 'COST', 'MDLZ', 'WBA', 'EXC', 'CL', 'GIS', 'K', 'HSY', 'CPB', 'CAG', 'SJM', 'HRL', 'MKC', 'CHD', 'CLX', 'COTY', 'EL', 'KMB', 'SYY', 'DLTR', 'DG', 'KR', 'SWK', 'TSN', 'TAP', 'STZ', 'DEO', 'PM', 'MO', 'BTI', 'UVV', 'USFD', 'PFGC', 'CALM', 'JJSF', 'LANC', 'RIBT', 'SENEA', 'SENEB', 'SPTN', 'UNFI', 'USNA',
                
                // 에너지 (Energy)
                'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'MPC', 'OXY', 'KMI', 'WMB', 'OKE', 'TRGP', 'LNG', 'FANG', 'DVN', 'PXD', 'CTRA', 'MRO', 'APA', 'HAL', 'BKR', 'FTI', 'NOV', 'HP', 'CHK', 'EQT', 'MTDR', 'SM', 'RRC', 'CNX', 'CIVI', 'CPG', 'CRC', 'CRGY', 'CRK', 'DINO', 'DRQ', 'EGY', 'ENLC', 'EPD', 'ET', 'HESM', 'HES', 'HPK', 'KRP', 'MPLX', 'NEXT', 'NRP',
                
                // 산업재 (Industrials)
                'BA', 'UNP', 'UPS', 'HON', 'RTX', 'LMT', 'CAT', 'DE', 'GE', 'MMM', 'FDX', 'NSC', 'CSX', 'NOC', 'GD', 'EMR', 'ETN', 'ITW', 'PH', 'CMI', 'CARR', 'OTIS', 'PCAR', 'JCI', 'TT', 'ROK', 'FAST', 'VRSK', 'CTAS', 'EXPD', 'CHRW', 'JBHT', 'ODFL', 'XPO', 'ARCB', 'LSTR', 'MATX', 'SAIA', 'WERN', 'KNX', 'HUBG', 'FELE', 'GATX', 'GWR', 'RAIL', 'WAB', 'WABC',
                
                // 소재 (Materials)
                'LIN', 'APD', 'ECL', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'PPG', 'IFF', 'MLM', 'VMC', 'NUE', 'STLD', 'PKG', 'IP', 'WRK', 'SON', 'SEE', 'BALL', 'CCL', 'AMCR', 'AVY', 'CF', 'FMC', 'LYB', 'CE', 'RPM', 'ALB', 'EMN', 'MOS', 'AA', 'X', 'CLF', 'SCCO', 'TECK', 'RIO', 'BHP', 'VALE', 'GOLD', 'AEM', 'KGC', 'AU', 'EGO', 'CDE', 'AG', 'HL', 'PAAS',
                
                // 부동산 (Real Estate)
                'AMT', 'PLD', 'CCI', 'EQIX', 'WELL', 'DLR', 'O', 'SBAC', 'PSA', 'EXR', 'AVB', 'EQR', 'VICI', 'VTR', 'ESS', 'MAA', 'KIM', 'REG', 'FRT', 'BXP', 'ARE', 'HST', 'CPT', 'UDR', 'PEAK', 'AIV', 'ELS', 'SUI', 'MSA', 'LSI', 'CUBE', 'REXR', 'AMH', 'INVH', 'COLD', 'PPS', 'LAMR', 'UNIT', 'ROIC', 'STAG', 'FR', 'KRC', 'HIW', 'DEI', 'PGRE', 'SLG', 'VNO', 'BDN', 'CUZ',
                
                // 유틸리티 (Utilities)
                'NEE', 'DUK', 'SO', 'D', 'AEP', 'XEL', 'SRE', 'WEC', 'ED', 'EIX', 'ETR', 'ES', 'FE', 'AWK', 'PPL', 'CMS', 'DTE', 'NI', 'LNT', 'EVRG', 'AEE', 'CNP', 'VST', 'ATO', 'NJR', 'SWX', 'OGE', 'POR', 'AVA', 'AGR', 'BKH', 'SR', 'MDU', 'UTL', 'MGEE', 'OTTR', 'NOVA', 'YORW', 'ARTNA', 'CWEN', 'CWEN.A', 'HE', 'IDA', 'NEP', 'NWE', 'PNM', 'UGI', 'WTRG'
            ];
            
            // 중복 제거
            this.sp500Tickers = [...new Set(backupTickers)];
            
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
            const totalTickers = this.sp500Tickers.length; // 모든 S&P 500 종목 스캔
            const failedTickers = []; // 실패한 항목들 저장
            
            
            
            for (let i = 0; i < totalTickers; i++) {
                const ticker = this.sp500Tickers[i];
                const progress = Math.round(((i + 1) / totalTickers) * 100);
                let stock = null;
                
                this.updateStatus(`스캔 중... ${ticker} (${i + 1}/${totalTickers}) ${progress}%`, 'scanning');
                
                try {
                    stock = await this.analyzeStock(ticker, settings);
                    results.totalScanned++;
                    
                    if (stock) {
                        if (stock.isBreakout) {
                            results.breakoutStocks.push(stock);
                            console.log(`🚀 돌파 발견: ${ticker} $${stock.currentPrice.toFixed(2)} (진입가: $${stock.entryPrice.toFixed(2)})`);
                        } else {
                            results.waitingStocks.push(stock);
                            console.log(`⏰ 대기 중: ${ticker} $${(stock.currentPrice || 0).toFixed(2)} (진입까지: $${(stock.gapToEntry || 0).toFixed(2)})`);
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
                        console.warn(`❌ ${ticker} 분석 실패: 데이터 없음 또는 계산 오류`);
                    }
                } catch (error) {
                    results.errors++;
                    console.error(`❌ ${ticker} 분석 실패:`, error.message);
                    // 실패한 항목을 배열에 추가
                    failedTickers.push(ticker);
                }
                
                // 실시간 업데이트 (5개마다)
                if ((i + 1) % 5 === 0 || (stock && stock.isBreakout)) {
                    this.updateDashboard(results);
                }
                
                // 딜레이 (API 제한 방지) - 프로그래스 업데이트 후에 실행
                await this.delay(this.demoMode ? 50 : 200);
            }
            
            // 실패한 항목들이 있으면 맨 뒤에 추가해서 재시도
            if (failedTickers.length > 0) {
                console.log(`🔄 실패한 ${failedTickers.length}개 항목을 재시도합니다...`);
                
                for (let i = 0; i < failedTickers.length; i++) {
                    const ticker = failedTickers[i];
                    const progress = Math.round(((results.totalScanned + i + 1) / (totalTickers + failedTickers.length)) * 100);
                    
                    this.updateStatus(`재시도 중... ${ticker} (${results.totalScanned + i + 1}/${totalTickers + failedTickers.length}) ${progress}%`, 'scanning');
                    
                    try {
                        const stock = await this.analyzeStock(ticker, settings);
                        results.totalScanned++;
                        
                        if (stock) {
                            if (stock.isBreakout) {
                                results.breakoutStocks.push(stock);
                                console.log(`🚀 재시도 성공 - 돌파 발견: ${ticker} $${stock.currentPrice.toFixed(2)} (진입가: $${stock.entryPrice.toFixed(2)})`);
                            } else {
                                results.waitingStocks.push(stock);
                                console.log(`⏰ 재시도 성공 - 대기 중: ${ticker} $${stock.currentPrice.toFixed(2)} (진입까지: $${stock.gapToEntry.toFixed(2)})`);
                            }
                        } else {
                            console.warn(`❌ ${ticker} 재시도 실패: 조건 불만족`);
                        }
                    } catch (error) {
                        console.error(`❌ ${ticker} 재시도 실패:`, error.message);
                    }
                    
                    // 실시간 업데이트 (5개마다)
                    if ((i + 1) % 5 === 0) {
                        this.updateDashboard(results);
                    }
                    
                    // 딜레이 (API 제한 방지) - 프로그래스 업데이트 후에 실행
                    await this.delay(this.demoMode ? 50 : 200);
                }
            }
            
            // 결과 정렬
            results.waitingStocks.sort((a, b) => a.gapToEntry - b.gapToEntry);
            results.breakoutStocks.sort((a, b) => b.score - a.score);
            
            // 상위 결과만 유지
            results.waitingStocks = results.waitingStocks.slice(0, 15);
            results.breakoutStocks = results.breakoutStocks.slice(0, 10);
            
            // 로컬 스토리지에 저장
            StorageManager.saveResults(results);
            
            // UI 업데이트
            this.displayResults(results);
            
            // 돌파 알림
            if (results.breakoutStocks.length > 0 && typeof NotificationManager !== 'undefined') {
                NotificationManager.sendBreakoutAlert(results.breakoutStocks);
            }
            
            this.updateStatus(`완료: ${results.totalScanned}개 스캔 (돌파: ${results.breakoutStocks.length}, 대기: ${results.waitingStocks.length})`, 'completed');
            
            // 스캔 완료 후 총 조회수 로그
            if (window.logger) {
                window.logger.success(`스캔 완료: 총 ${results.totalScanned}개 종목 조회 완료`);
            }
            
            
            
        } catch (error) {
            console.error('스캔 중 오류:', error);
            this.updateStatus('스캔 실패', 'error');
            
        } finally {
            this.isScanning = false;
            
        }
    }

    async smartScanStocks() {
        if (this.isScanning) return;
        
        console.log('🚀 스마트 스캔 전략 시작...');
        this.isScanning = true;
        this.updateStatus('스마트 스캔 중...', 'scanning');
        
        
        
        try {
            // 스마트 스캐너의 적응형 스캔 사용
            const results = await window.smartScanner.adaptiveScan(this.sp500Tickers);
            
            // 기본 결과 구조로 변환
            const formattedResults = {
                breakoutStocks: results.breakoutStocks || [],
                waitingStocks: results.waitingStocks || [],
                totalScanned: results.totalScanned || 0,
                errors: results.errors || 0,
                strategy: results.strategy || 'adaptive',
                timestamp: new Date().toISOString()
            };
            
            // 로컬 스토리지에 저장
            StorageManager.saveResults(formattedResults);
            
            // UI 업데이트
            this.displayResults(formattedResults);
            
            // 돌파 알림
            if (formattedResults.breakoutStocks.length > 0 && typeof NotificationManager !== 'undefined') {
                NotificationManager.sendBreakoutAlert(formattedResults.breakoutStocks);
            }
            
            const statusMessage = `스마트 스캔 완료 (${results.strategy}): ${formattedResults.totalScanned}개 스캔 ` +
                `(돌파: ${formattedResults.breakoutStocks.length}, 대기: ${formattedResults.waitingStocks.length})`;
            
            console.log(`✅ ${statusMessage}`);
            this.updateStatus(statusMessage, 'completed');
            
            // 스마트 스캔 완료 후 총 조회수 로그
            if (window.logger) {
                window.logger.success(`스마트 스캔 완료: 총 ${formattedResults.totalScanned}개 종목 조회 완료`);
            }
            
            // 진행 상황 최종 업데이트
            this.updateProgressDisplay(formattedResults.totalScanned, formattedResults.totalScanned, '완료', 'completed', formattedResults);
            
            
        } catch (error) {
            console.error('❌ 스마트 스캔 중 오류:', error);
            this.updateStatus('스마트 스캔 실패 - 기본 스캔으로 전환', 'error');
            
            
            // 에러 시 기본 스캔으로 폴백
            setTimeout(() => {
                this.scanStocks();
            }, 2000);
            
        } finally {
            this.isScanning = false;
            
        }
    }

    async analyzeStock(ticker, settings, preLoadedData = null) {
        try {
            let stockData;
            
            let apiData;
            
            if (preLoadedData) {
                // 미리 로드된 데이터가 있으면 사용 (중복 호출 방지)
                apiData = preLoadedData;
            } else {
                // 데이터가 없으면 새로 가져오기
                apiData = await this.fetchStockData(ticker);
            }
            
            if (this.demoMode) {
                // 데모 모드: 미리 로드된 데이터가 없을 때만 모의 데이터 생성
                stockData = apiData || this.generateDemoData(ticker);
            } else {
                // 실제 API 모드
                
                if (!apiData) {
                    return null;
                }
                
                // API Manager에서 반환된 데이터가 이미 변환된 형태인지 확인
                if (apiData.currentPrice && apiData.yesterdayClose) {
                    // 이미 변환된 데이터 사용 (중복 호출 방지)
                    stockData = apiData;
                } else if (apiData.timeSeries) {
                    // Alpha Vantage API 응답 처리
                    const dates = Object.keys(apiData.timeSeries).sort().reverse();
                    if (dates.length < 2) return null;
                    
                    // 오늘이 2025-07-11 (금요일)이므로 가장 최근 거래일 찾기
                    const latestDate = dates[0]; // 가장 최근 날짜
                    const previousDate = dates[1]; // 그 전 거래일
                    
                    console.log(`📅 ${ticker} 데이터 날짜: 최근=${latestDate}, 이전=${previousDate}`);
                    
                    const today = apiData.timeSeries[latestDate];
                    const yesterday = apiData.timeSeries[previousDate];
                    
                    stockData = {
                        currentPrice: parseFloat(today['4. close']),
                        yesterdayClose: parseFloat(yesterday['4. close']),
                        yesterdayHigh: parseFloat(yesterday['2. high']),
                        yesterdayLow: parseFloat(yesterday['3. low']),
                        volume: parseInt(yesterday['5. volume'])
                    };
                } else {
                    console.warn(`❌ ${ticker}: 지원되지 않는 데이터 형식`);
                    return null;
                }
            }
            
            // 변동성 돌파 계산
            const calculation = VolatilityCalculator.calculate(stockData, settings);
            
            if (!calculation) {
                return null; // 계산 자체가 실패한 경우만 제외
            }
            
            // 조건을 만족하지 않아도 결과에 포함 (대기 종목으로 분류될 수 있음)
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

    generateDemoData(ticker) {
        // 시드값을 위한 간단한 해시 함수
        const hash = ticker.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        const random = (seed) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };
        
        const basePrice = 30 + (random(hash) * 200); // $30-$230
        const volatility = 0.015 + (random(hash + 1) * 0.065); // 1.5-8%
        const volume = 800000 + (random(hash + 2) * 4000000); // 80만-480만주
        
        const yesterdayClose = basePrice;
        const dailyRange = yesterdayClose * volatility;
        const yesterdayLow = yesterdayClose - (dailyRange * 0.4);
        const yesterdayHigh = yesterdayLow + dailyRange;
        
        // 현재가는 랜덤하게 설정 (일부는 돌파, 일부는 대기)
        const breakoutChance = random(hash + 3);
        const entryPrice = yesterdayClose + (dailyRange * 0.6);
        
        let currentPrice;
        if (breakoutChance < 0.15) {
            // 15% 확률로 돌파
            currentPrice = entryPrice + (random(hash + 4) * dailyRange * 0.4);
        } else {
            // 85% 확률로 대기
            currentPrice = yesterdayClose + (random(hash + 5) * dailyRange * 0.5);
        }
        
        return {
            currentPrice,
            yesterdayClose,
            yesterdayHigh,
            yesterdayLow,
            volume: Math.floor(volume)
        };
    }

    async fetchStockData(ticker) {
        // 데모 모드 확인
        if (this.demoMode) {
            return this.generateDemoData(ticker);
        }

        try {
            // 새로운 API Manager 사용 (다중 소스)
            if (window.APIManager) {
                const apiManager = new window.APIManager();
                console.log(`📡 ${ticker}: API Manager로 데이터 요청...`);
                const stockData = await apiManager.fetchStockData(ticker);
                
                if (stockData) {
                    stockData.ticker = ticker;
                    console.log(`✅ ${ticker}: 데이터 조회 성공 - $${stockData.currentPrice?.toFixed(2) || 'N/A'}`);
                    return stockData;
                }
            }
            
        } catch (error) {
            console.warn(`❌ ${ticker} 데이터 가져오기 실패:`, error.message);
        }
        
        return null;
    }

    displayResults(results) {
        // 결과 저장 (자동 업데이트용)
        this.lastScanResults = results;
        
        // 대시보드 업데이트
        this.updateDashboard(results);
        
        // 돌파 종목 표시
        this.renderStockCards('breakoutStocks', results.breakoutStocks, 'breakout');
        
        // 대기 종목 표시
        this.renderStockCards('waitingStocks', results.waitingStocks, 'waiting');
        
        // 스캔 완료 후 자동 업데이트 시작 (설정에서 활성화된 경우 + 스캔 결과가 있는 경우 + 실제 스캔이 완료된 경우만)
        const settings = StorageManager.getSettings();
        
        const hasResults = (results.breakoutStocks && results.breakoutStocks.length > 0) || 
                          (results.waitingStocks && results.waitingStocks.length > 0);
        
        // 실제 스캔이 완료된 경우에만 자동 업데이트 시작 (캐시 로드시에는 시작하지 않음)
        const isFromActualScan = this.isScanning || this.lastScanResults === null;
        
        if (!this.autoUpdateEnabled && settings.autoUpdateEnabled && hasResults && isFromActualScan) {
            this.startAutoUpdate();
        }
    }

    updateDashboard(results) {
        // 통합된 통계 업데이트
        const breakoutCountEl = document.getElementById('breakoutCount');
        const waitingCountEl = document.getElementById('waitingCount');
        const totalScannedEl = document.getElementById('totalScanned');
        const errorCountEl = document.getElementById('errorCount');
        
        // 애니메이션과 함께 값 업데이트
        this.updateStatWithAnimation(breakoutCountEl, results.breakoutStocks.length);
        this.updateStatWithAnimation(waitingCountEl, results.waitingStocks.length);
        this.updateStatWithAnimation(totalScannedEl, results.totalScanned);
        this.updateStatWithAnimation(errorCountEl, results.errorCount || 0);
        
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
        if (!container) return;
        
        container.innerHTML = '';
        
        if (stocks.length === 0) {
            container.innerHTML = '<div class="no-results">조건에 맞는 종목이 없습니다.</div>';
            return;
        }
        
        stocks.forEach(stock => {
            const card = document.createElement('div');
            card.className = `stock-card ${type}`;
            card.onclick = () => this.openStockChart(stock.ticker);
            
            let gapDisplay, strategyDisplay = '';
            
            if (type === 'waiting') {
                gapDisplay = `<div class="gap">돌파까지: $${(stock.gapToEntry || 0).toFixed(2)}</div>`;
            } else {
                // 돌파한 종목에 대한 진입 전략 결정
                const entryStrategy = this.determineEntryStrategy(stock);
                let strategyIcon = '';
                let strategyColor = '';
                
                switch(entryStrategy.confidence) {
                    case 'high': strategyIcon = '🟢'; strategyColor = '#16a34a'; break;
                    case 'medium': strategyIcon = '🟡'; strategyColor = '#d97706'; break;
                    case 'low': strategyIcon = '🔴'; strategyColor = '#dc2626'; break;
                }
                
                gapDisplay = '<div class="breakout-badge">돌파!</div>';
                strategyDisplay = `
                    <div class="strategy-info" style="margin-top: 8px; padding: 6px; background: rgba(0,0,0,0.05); border-radius: 4px;">
                        <div style="font-size: 0.85em; color: ${strategyColor};">
                            ${strategyIcon} ${entryStrategy.name}
                        </div>
                        ${entryStrategy.note ? `<div style="font-size: 0.8em; color: #666; margin-top: 2px;">${entryStrategy.note}</div>` : ''}
                    </div>
                `;
            }
            
            const riskReward = stock.riskRewardRatio ? ` (R:R ${stock.riskRewardRatio.toFixed(1)}:1)` : '';
            
            card.innerHTML = `
                <div class="stock-header">
                    <h3>${stock.ticker}</h3>
                    ${gapDisplay}
                </div>
                <div class="price-info">
                    <div class="current-price">$${(stock.currentPrice || 0).toFixed(2)}</div>
                    <div class="entry-price">진입: $${(stock.entryPrice || 0).toFixed(2)}${riskReward}</div>
                </div>
                <div class="targets">
                    <div class="target stop-loss">손절: $${(stock.stopLoss || 0).toFixed(2)}</div>
                    <div class="target profit">목표1: $${(stock.target1 || 0).toFixed(2)}</div>
                    <div class="target profit">목표2: $${(stock.target2 || 0).toFixed(2)}</div>
                </div>
                <div class="stats">
                    <span>변동률: ${(stock.volatility || 0).toFixed(1)}%</span>
                    <span>거래량: ${this.formatNumber(stock.volume || stock.yesterdayVolume || 0)}</span>
                    <span>점수: ${stock.score || 0}/100</span>
                </div>
                ${strategyDisplay}
            `;
            
            container.appendChild(card);
        });
    }

    // 돌파 후 진입 전략 결정 (breakout-tracker.js와 동일한 로직)
    determineEntryStrategy(stock) {
        const currentPrice = stock.currentPrice;
        const entryPrice = stock.entryPrice;
        const breakoutGap = ((currentPrice - entryPrice) / entryPrice) * 100;
        
        if (breakoutGap <= 1.0) {
            return {
                name: '즉시 진입',
                confidence: 'high',
                note: '1% 이내 돌파, 높은 성공률'
            };
        } else if (breakoutGap <= 2.5) {
            return {
                name: '분할 진입',
                confidence: 'medium',
                note: '50% 포지션, 풀백 시 추가'
            };
        } else if (breakoutGap <= 5.0) {
            return {
                name: '풀백 대기',
                confidence: 'medium',
                note: `${(entryPrice * 1.01).toFixed(2)} 되돌림 대기`
            };
        } else {
            return {
                name: '관망',
                confidence: 'low',
                note: `돌파폭 ${breakoutGap.toFixed(1)}%로 추격 위험`
            };
        }
    }

    openStockChart(ticker) {
        // TradingView 또는 Yahoo Finance로 새 탭에서 열기
        const url = `https://finance.yahoo.com/quote/${ticker}`;
        window.open(url, '_blank');
    }

    formatNumber(num) {
        if (!num || isNaN(num)) {
            return '0';
        }
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // 통계 값 업데이트 시 애니메이션 추가
    updateStatWithAnimation(element, newValue) {
        if (!element) return;
        
        const currentValue = element.textContent;
        if (currentValue !== newValue.toString()) {
            element.textContent = newValue;
            element.classList.add('updated');
            
            // 애니메이션 완료 후 클래스 제거
            setTimeout(() => {
                element.classList.remove('updated');
            }, 600);
        }
    }

    updateStatus(message, type = 'default') {
        const statusEl = document.getElementById('status');
        const scanBtn = document.getElementById('scanBtn');
        
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status status-${type}`;
            statusEl.style.display = 'block';
        }
        
        // 스캔 버튼 상태 업데이트
        if (scanBtn) {
            const btnIcon = scanBtn.querySelector('.btn-icon');
            const btnTitle = scanBtn.querySelector('.btn-title');
            const btnSubtitle = scanBtn.querySelector('.btn-subtitle');
            
            if (type === 'scanning') {
                scanBtn.disabled = true;
                if (btnIcon) btnIcon.textContent = '🔄';
                if (btnTitle) btnTitle.textContent = '스캔 중...';
                if (btnSubtitle) btnSubtitle.textContent = '분석 진행 중';
            } else {
                scanBtn.disabled = false;
                if (btnIcon) btnIcon.textContent = '🚀';
                if (btnTitle) btnTitle.textContent = '스마트 스캔';
                if (btnSubtitle) btnSubtitle.textContent = 'S&P 500 돌파 전략 분석';
            }
        }
    }

    bindEvents() {
        // 전체 스캔 버튼 (기존 기능)
        const scanBtn = document.getElementById('scanBtn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                // 스마트 스캐너 사용 여부 확인
                if (window.smartScanner && !this.demoMode) {
                    console.log('🧠 스마트 스캔 전략 사용');
                    this.smartScanStocks();
                } else {
                    console.log('📊 기본 전체 스캔 사용');
                    this.scanStocks();
                }
            });
        }
        
        // 자동 업데이트 토글 버튼
        const autoUpdateToggleBtn = document.getElementById('autoUpdateToggleBtn');
        if (autoUpdateToggleBtn) {
            autoUpdateToggleBtn.addEventListener('click', () => {
                this.toggleAutoUpdate();
            });
        }

        // 재확인 버튼 이벤트
        const reCheckBtn = document.getElementById('reCheckBtn');
        if (reCheckBtn) {
            reCheckBtn.addEventListener('click', () => {
                this.reCheckBreakoutStocks();
            });
        }

        // 자동 스캔 설정
        const autoScanCheck = document.getElementById('autoScan');
        if (autoScanCheck) {
            autoScanCheck.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoScan();
                } else {
                    this.stopAutoScan();
                }
            });
        }
        
        // 설정 변경 감지
        const volatilityRange = document.getElementById('volatilityRange');
        if (volatilityRange) {
            volatilityRange.addEventListener('input', (e) => {
                const value = e.target.value;
                const valueDisplay = document.getElementById('volatilityValue');
                if (valueDisplay) {
                    valueDisplay.textContent = `2-${value}%`;
                }
                StorageManager.updateSettings({ volatilityMax: value / 100 });
            });
        }
        
        const minVolumeSelect = document.getElementById('minVolume');
        if (minVolumeSelect) {
            minVolumeSelect.addEventListener('change', (e) => {
                StorageManager.updateSettings({ minVolume: parseInt(e.target.value) });
            });
        }
        
        // 데모 모드 토글
        const demoModeCheck = document.getElementById('demoMode');
        if (demoModeCheck) {
            demoModeCheck.addEventListener('change', (e) => {
                this.demoMode = e.target.checked;
                StorageManager.updateSettings({ demoMode: e.target.checked });
                console.log(`데모 모드: ${this.demoMode ? 'ON' : 'OFF'}`);
            });
        }

        // 자동 업데이트 설정
        const autoUpdateEnabledCheck = document.getElementById('autoUpdateEnabled');
        if (autoUpdateEnabledCheck) {
            autoUpdateEnabledCheck.addEventListener('change', (e) => {
                StorageManager.updateSettings({ autoUpdateEnabled: e.target.checked });
                console.log(`자동 업데이트 기본 활성화: ${e.target.checked ? 'ON' : 'OFF'}`);
            });
        }

        const updateIntervalSelect = document.getElementById('updateInterval');
        if (updateIntervalSelect) {
            updateIntervalSelect.addEventListener('change', (e) => {
                const interval = parseInt(e.target.value);
                StorageManager.updateSettings({ updateInterval: interval });
                console.log(`업데이트 주기: ${interval}초`);
                
                // 업데이트 간격 즉시 적용
                this.updateIntervalMs = interval * 1000;
                
                // 현재 자동 업데이트가 실행 중이면 재시작
                if (this.autoUpdateEnabled) {
                    this.stopAutoUpdate();
                    setTimeout(() => {
                        this.startAutoUpdate();
                    }, 500); // 500ms 후 재시작
                }
            });
        }


        // 브라우저 알림 설정
        const notificationEnabledCheck = document.getElementById('notificationEnabled');
        if (notificationEnabledCheck) {
            notificationEnabledCheck.addEventListener('change', (e) => {
                StorageManager.updateSettings({ notificationEnabled: e.target.checked });
                console.log(`브라우저 알림: ${e.target.checked ? 'ON' : 'OFF'}`);
            });
        }
    }

    startAutoScan() {
        this.autoScanInterval = setInterval(() => {
            if (!this.isScanning) {
                this.scanStocks();
            }
        }, 5 * 60 * 1000); // 5분마다
        console.log('✅ 자동 스캔 시작됨 (5분 간격)');
    }

    stopAutoScan() {
        if (this.autoScanInterval) {
            clearInterval(this.autoScanInterval);
            this.autoScanInterval = null;
            console.log('⏹️ 자동 스캔 중지됨');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 자동 업데이트 시작 (업데이트 완료 후 설정된 간격만큼 대기)
    startAutoUpdate() {
        if (this.autoUpdateEnabled) {
            console.log('⚠️ 자동 업데이트가 이미 실행 중입니다.');
            return;
        }
        
        this.autoUpdateEnabled = true;
        
        // 기존 스케줄 정리
        if (this.autoUpdateTimeout) {
            clearTimeout(this.autoUpdateTimeout);
            this.autoUpdateTimeout = null;
        }
        
        // 첫 번째 업데이트는 즉시 실행
        this.scheduleNextUpdate(true);
        
        console.log(`🔄 자동 업데이트 시작됨 (${this.updateIntervalMs/1000}초 간격)`);
        this.updateAutoUpdateButtonUI();
    }

    // 다음 업데이트 스케줄링
    scheduleNextUpdate(immediate = false) {
        if (!this.autoUpdateEnabled) return;
        
        // 이미 스케줄된 업데이트가 있으면 취소
        if (this.autoUpdateTimeout) {
            clearTimeout(this.autoUpdateTimeout);
            this.autoUpdateTimeout = null;
        }
        
        if (immediate) {
            // 즉시 실행 (첫 번째 업데이트)
            this.executeUpdate();
        } else {
            // 대기 시간 후 실행 - 진행 표시기 시작
            this.startProgressIndicator();
            
            this.autoUpdateTimeout = setTimeout(() => {
                if (!this.autoUpdateEnabled) return;
                this.executeUpdate();
            }, this.updateIntervalMs);
            
            console.log(`⏰ 다음 자동 업데이트가 ${this.updateIntervalMs/1000}초 후 스케줄됨`);
        }
    }

    // 업데이트 실행
    async executeUpdate() {
        if (!this.autoUpdateEnabled) return;
        
        // 이미 업데이트가 실행 중이면 건너뛰기
        if (this.isAutoUpdating) {
            console.warn('⚠️ 자동 업데이트가 이미 실행 중입니다. 건너뜁니다.');
            // 다음 업데이트 스케줄링 (중복 방지)
            this.scheduleNextUpdate();
            return;
        }
        
        // 업데이트 실행 상태 설정
        this.isAutoUpdating = true;
        
        // 진행 표시기 중지 (업데이트 시작)
        this.stopProgressIndicator();
        
        // 업데이트 중 상태 표시
        const timerEl = document.getElementById('autoUpdateTimer');
        if (timerEl) {
            timerEl.textContent = '업데이트 중...';
        }
        
        try {
            console.log('🔄 자동 업데이트 실행 시작...');
            await this.performAutoUpdate();
            console.log('✅ 자동 업데이트 실행 완료');
        } catch (error) {
            console.error('❌ 자동 업데이트 실행 중 오류:', error);
        } finally {
            // 업데이트 완료 상태로 복원
            this.isAutoUpdating = false;
        }
        
        // 업데이트 완료 후 다음 업데이트 스케줄링
        this.scheduleNextUpdate();
    }

    // 자동 업데이트 중지
    stopAutoUpdate() {
        if (this.autoUpdateEnabled) {
            this.autoUpdateEnabled = false;
            
            // 스케줄된 업데이트 취소
            if (this.autoUpdateTimeout) {
                clearTimeout(this.autoUpdateTimeout);
                this.autoUpdateTimeout = null;
            }
            
            // 진행 표시기 중지
            this.stopProgressIndicator();
            
            // API Manager의 대기 중인 요청들도 취소
            if (window.apiManager) {
                const wasActive = window.apiManager.isActive();
                if (wasActive) {
                    console.log('🛑 API Manager 요청 취소 중...');
                    window.apiManager.cancelAllRequests();
                }
            }
            
            // 실행 중인 업데이트가 있다면 완료될 때까지 기다리도록 플래그만 설정
            // (실제 업데이트 작업은 완료될 때까지 진행됨)
            if (this.isAutoUpdating) {
                console.log('⏹️ 자동 업데이트 중지 요청됨 (현재 실행 중인 업데이트는 완료 후 중지)');
            } else {
                console.log('⏹️ 자동 업데이트 중지됨');
            }
            
            this.updateAutoUpdateButtonUI();
        }
    }

    // 자동 업데이트 토글
    toggleAutoUpdate() {
        if (this.autoUpdateEnabled) {
            this.stopAutoUpdate();
        } else {
            // 스캔 결과가 있을 때만 자동 업데이트 시작 가능
            if (this.lastScanResults && 
                (this.lastScanResults.breakoutStocks.length > 0 || this.lastScanResults.waitingStocks.length > 0)) {
                this.startAutoUpdate();
            } else {
                console.warn('⚠️ 스캔 결과가 없어 자동 업데이트를 시작할 수 없습니다. 먼저 스캔을 실행하세요.');
                this.updateStatus('스캔 결과가 없습니다. 먼저 스캔을 실행하세요.', 'error');
            }
        }
    }

    // 저장된 결과에서 돌파종목 재확인
    async reCheckBreakoutStocks() {
        try {
            // 저장된 결과 불러오기
            const savedResults = StorageManager.getResults();
            if (!savedResults) {
                alert('저장된 스캔 결과가 없습니다. 먼저 스캔을 실행해주세요.');
                return;
            }

            // 모든 저장된 종목 수집 (돌파 + 대기)
            const allStocks = [
                ...(savedResults.breakoutStocks || []),
                ...(savedResults.waitingStocks || [])
            ];

            if (allStocks.length === 0) {
                alert('재확인할 종목이 없습니다.');
                return;
            }

            this.updateStatus('저장된 종목 재확인 중...', 'scanning');
            console.log(`🔍 ${allStocks.length}개 저장된 종목 재확인 시작...`);

            const reCheckResults = {
                breakoutStocks: [],
                waitingStocks: [],
                totalScanned: 0,
                errors: 0,
                timestamp: new Date().toISOString()
            };

            // 각 종목에 대해 현재 상태 재확인
            for (let i = 0; i < allStocks.length; i++) {
                const stock = allStocks[i];
                
                try {
                    // 진행률 업데이트
                    const progress = Math.round(((i + 1) / allStocks.length) * 100);
                    this.updateStatus(`재확인 중... ${i + 1}/${allStocks.length} (${progress}%)`, 'scanning');
                    
                    // 현재 주식 데이터 가져오기
                    const stockData = await this.fetchStockData(stock.ticker);
                    
                    if (stockData) {
                        // 현재 설정으로 다시 분석
                        const settings = StorageManager.getSettings();
                        const analysis = await this.analyzeStock(stock.ticker, settings, stockData);
                        
                        if (analysis) {
                            // 돌파/대기 분류 (isBreakout 속성 사용)
                            if (analysis.isBreakout) {
                                reCheckResults.breakoutStocks.push(analysis);
                                console.log(`🚀 재확인 돌파: ${stock.ticker} - 현재가: $${analysis.currentPrice.toFixed(2)}, 진입가: $${analysis.entryPrice.toFixed(2)}`);
                            } else {
                                reCheckResults.waitingStocks.push(analysis);
                                console.log(`⏰ 재확인 대기: ${stock.ticker} - 현재가: $${analysis.currentPrice.toFixed(2)}, 진입가: $${analysis.entryPrice.toFixed(2)}, 조건만족: ${analysis.meetsConditions}`);
                            }
                            reCheckResults.totalScanned++;
                        } else {
                            console.warn(`❌ ${stock.ticker} 재확인 실패: 분석 결과 없음`);
                        }
                    } else {
                        console.warn(`❌ ${stock.ticker} 재확인 실패: 주식 데이터 조회 실패`);
                        reCheckResults.errors++;
                    }
                    
                    // API 부하 방지를 위한 딜레이
                    if (i < allStocks.length - 1) {
                        await this.delay(1000);
                    }
                    
                } catch (error) {
                    console.warn(`❌ ${stock.ticker} 재확인 실패:`, error);
                    reCheckResults.errors++;
                }
            }

            // 결과 저장 및 표시
            this.lastScanResults = reCheckResults;
            StorageManager.saveResults(reCheckResults);
            this.displayResults(reCheckResults);

            // 완료 메시지
            const statusMessage = `재확인 완료: ${reCheckResults.totalScanned}개 종목 ` +
                `(돌파: ${reCheckResults.breakoutStocks.length}, 대기: ${reCheckResults.waitingStocks.length})`;
            
            this.updateStatus(statusMessage, 'completed');
            console.log(`✅ ${statusMessage}`);

            // 돌파 알림
            if (reCheckResults.breakoutStocks.length > 0 && typeof NotificationManager !== 'undefined') {
                NotificationManager.sendBreakoutAlert(reCheckResults.breakoutStocks);
            }

            // 자동 업데이트 재시작
            const settings = StorageManager.getSettings();
            if (!this.autoUpdateEnabled && settings.autoUpdateEnabled) {
                this.startAutoUpdate();
            }

        } catch (error) {
            console.error('❌ 재확인 중 오류 발생:', error);
            this.updateStatus('재확인 중 오류가 발생했습니다.', 'error');
        }
    }

    // 백그라운드에서 기존 종목들의 현재가 업데이트 (모든 종목을 동적으로 조회)
    async performAutoUpdate() {
        // 기본 조건 확인
        if (!this.lastScanResults || this.isScanning) return;
        
        // 자동 업데이트가 비활성화되었으면 중단
        if (!this.autoUpdateEnabled) {
            console.log('⏹️ 자동 업데이트가 비활성화되어 중단됨');
            return;
        }

        console.log('🔄 자동 업데이트 실행 중...');
        
        try {
            const allStocks = [
                ...this.lastScanResults.breakoutStocks,
                ...this.lastScanResults.waitingStocks
            ];

            if (allStocks.length === 0) return;

            let updatedCount = 0;
            let successCount = 0;
            let failedCount = 0;

            // 모든 종목을 동적으로 업데이트 (랜덤 선택 없이)
            console.log(`📈 ${allStocks.length}개 종목 전체 업데이트 시작...`);

            for (const stock of allStocks) {
                // 업데이트 중 중지 요청이 있으면 즉시 중단
                if (!this.autoUpdateEnabled) {
                    console.log('⏹️ 자동 업데이트 중지 요청으로 인한 조기 종료');
                    break;
                }
                
                try {
                    if (this.demoMode) {
                        // 데모 모드: 랜덤 변동 시뮬레이션
                        const volatility = Math.random() * 0.04 - 0.02; // ±2%
                        stock.currentPrice = Math.max(0.01, stock.currentPrice * (1 + volatility));
                        successCount++;
                    } else {
                        // 실제 모드: API에서 현재가 가져오기
                        const newPrice = await this.getCurrentPriceOnly(stock.ticker);
                        if (newPrice && newPrice > 0) {
                            stock.currentPrice = newPrice;
                            stock.lastUpdated = new Date();
                            successCount++;
                            console.log(`✅ ${stock.ticker}: $${newPrice.toFixed(2)}`);
                        } else {
                            failedCount++;
                            console.warn(`❌ ${stock.ticker}: 가격 조회 실패`);
                        }
                    }
                    
                    updatedCount++;
                    
                    // API 제한 고려하여 적절한 지연
                    if (!this.demoMode) {
                        await this.delay(200); // 200ms 지연으로 API 부하 방지
                    }
                    
                } catch (error) {
                    failedCount++;
                    console.warn(`❌ ${stock.ticker} 업데이트 실패:`, error.message);
                }
            }

            // 업데이트된 결과로 UI 갱신
            this.updateStockStatus();
            this.updateDashboard(this.lastScanResults);

            console.log(`✅ 자동 업데이트 완료: 전체 ${updatedCount}개, 성공 ${successCount}개, 실패 ${failedCount}개`);
            
            // 마지막 업데이트 시간 기록
            this.lastUpdateTime = new Date();

        } catch (error) {
            console.error('❌ 자동 업데이트 실패:', error);
        }
    }

    // 현재가만 가져오는 메서드 (전체 스캔과 동일한 API 사용)
    async getCurrentPriceOnly(ticker) {
        try {
            if (this.demoMode) {
                // 데모 모드에서는 랜덤 가격 반환
                return 50 + Math.random() * 100;
            }

            // 전체 스캔과 동일한 API Manager 사용
            if (window.APIManager) {
                const apiManager = new window.APIManager();
                const stockData = await apiManager.fetchStockData(ticker);
                
                if (stockData && stockData.currentPrice) {
                    return stockData.currentPrice;
                }
            }

            Utils.delay(1000); // API 호출 간 지연
            
            // API Manager가 실패한 경우 fetchStockData 사용 (백업)
            // const fullData = await this.fetchStockData(ticker);
            // if (fullData && fullData.currentPrice) {
            //     return fullData.currentPrice;
            // }
            
        } catch (error) {
            console.warn(`❌ ${ticker} 현재가 조회 실패:`, error.message);
        }
        return null;
    }

    // 돌파/대기 상태 재평가
    updateStockStatus() {
        if (!this.lastScanResults) return;

        let statusChanged = false;

        // 대기 종목 중 돌파한 것이 있는지 확인
        const stillWaiting = [];
        for (const stock of this.lastScanResults.waitingStocks) {
            if (stock.currentPrice >= stock.entryPrice) {
                // 돌파 발생!
                this.lastScanResults.breakoutStocks.push(stock);
                statusChanged = true;
                console.log(`🚀 새로운 돌파: ${stock.ticker} $${stock.currentPrice.toFixed(2)}`);
                
                // 브라우저 알림 (가능한 경우)
                this.showBreakoutNotification(stock);
            } else {
                stillWaiting.push(stock);
            }
        }

        this.lastScanResults.waitingStocks = stillWaiting;

        if (statusChanged) {
            // 상태가 변경된 경우에만 UI 전체 갱신
            this.renderStockCards('breakoutStocks', this.lastScanResults.breakoutStocks, 'breakout');
            this.renderStockCards('waitingStocks', this.lastScanResults.waitingStocks, 'waiting');
        } else {
            // 상태 변경이 없는 경우 가격만 업데이트
            this.updateExistingCards();
        }
    }

    // 기존 카드들의 가격만 업데이트
    updateExistingCards() {
        // 돌파 종목 가격 업데이트
        const breakoutContainer = document.getElementById('breakoutStocks');
        if (breakoutContainer) {
            const cards = breakoutContainer.querySelectorAll('.stock-card');
            cards.forEach((card, index) => {
                if (this.lastScanResults.breakoutStocks[index]) {
                    const stock = this.lastScanResults.breakoutStocks[index];
                    const priceEl = card.querySelector('.current-price');
                    if (priceEl) {
                        priceEl.textContent = `$${stock.currentPrice.toFixed(2)}`;
                        priceEl.classList.add('updated');
                        setTimeout(() => priceEl.classList.remove('updated'), 600);
                    }
                }
            });
        }

        // 대기 종목 가격 업데이트
        const waitingContainer = document.getElementById('waitingStocks');
        if (waitingContainer) {
            const cards = waitingContainer.querySelectorAll('.stock-card');
            cards.forEach((card, index) => {
                if (this.lastScanResults.waitingStocks[index]) {
                    const stock = this.lastScanResults.waitingStocks[index];
                    const priceEl = card.querySelector('.current-price');
                    if (priceEl) {
                        priceEl.textContent = `$${stock.currentPrice.toFixed(2)}`;
                        priceEl.classList.add('updated');
                        setTimeout(() => priceEl.classList.remove('updated'), 600);
                    }

                    // 진입가까지 남은 금액 업데이트
                    const gapEl = card.querySelector('.gap');
                    if (gapEl && stock.currentPrice < stock.entryPrice) {
                        const gap = stock.entryPrice - stock.currentPrice;
                        gapEl.textContent = `돌파까지: $${gap.toFixed(2)}`;
                    }
                }
            });
        }
    }

    // 돌파 알림 표시
    showBreakoutNotification(stock) {
        const settings = StorageManager.getSettings();
        
        // 브라우저 알림 (설정에서 활성화된 경우만)
        if (settings.notificationEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`🚀 돌파 감지: ${stock.ticker}`, {
                body: `현재가: $${stock.currentPrice.toFixed(2)}\n진입가: $${stock.entryPrice.toFixed(2)}`,
                icon: '/favicon.ico'
            });
        }

        // 화면 알림도 표시
        const notification = document.createElement('div');
        notification.className = 'auto-update-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>🚀 실시간 돌파 감지!</h4>
                <p><strong>${stock.ticker}</strong>이 진입가를 돌파했습니다!</p>
                <p>현재가: $${stock.currentPrice.toFixed(2)} (진입가: $${stock.entryPrice.toFixed(2)})</p>
                <button onclick="this.parentElement.parentElement.remove()">확인</button>
            </div>
        `;
        
        // 간단한 스타일링
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 300px;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 10초 후 자동 제거
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    // 자동 업데이트 버튼 UI 업데이트
    updateAutoUpdateButtonUI() {
        const autoUpdateBtn = document.getElementById('autoUpdateToggleBtn');
        if (!autoUpdateBtn) return;

        const iconEl = autoUpdateBtn.querySelector('.btn-icon');
        const statusEl = autoUpdateBtn.querySelector('.auto-update-status');
        const timerEl = autoUpdateBtn.querySelector('.auto-update-timer');

        if (this.autoUpdateEnabled) {
            // 활성화 상태
            autoUpdateBtn.classList.add('active');
            if (iconEl) iconEl.textContent = '▶️';
            if (statusEl) statusEl.textContent = '실행 중';
            if (timerEl) timerEl.style.display = 'block';
            autoUpdateBtn.title = '자동 업데이트 실행 중 (1분마다) - 클릭하여 중지';
        } else {
            // 비활성화 상태
            autoUpdateBtn.classList.remove('active');
            if (iconEl) iconEl.textContent = '⏸️';
            if (statusEl) statusEl.textContent = '중지됨';
            if (timerEl) {
                timerEl.style.display = 'none';
                timerEl.textContent = '';
            }
            autoUpdateBtn.title = '실시간 가격 자동 업데이트 (1분마다) - 클릭하여 시작';
        }
    }

    // 진행 표시기 시작
    startProgressIndicator() {
        const progressEl = document.getElementById('autoUpdateProgress');
        const timerEl = document.getElementById('autoUpdateTimer');
        
        if (!progressEl || !timerEl) return;
        
        // 진행 표시기 초기화
        progressEl.style.width = '0%';
        
        let secondsElapsed = 0;
        const totalSeconds = this.updateIntervalMs / 1000; // 설정된 간격 사용

        this.progressInterval = setInterval(() => {
            secondsElapsed++;
            const progress = (secondsElapsed / totalSeconds) * 100;
            
            progressEl.style.width = `${progress}%`;
            
            const remaining = totalSeconds - secondsElapsed;
            if (remaining > 0) {
                timerEl.textContent = `${remaining}초 후 업데이트`;
            } else {
                // 시간이 다 되면 진행 표시기 정지 (executeUpdate에서 처리됨)
                this.stopProgressIndicator();
            }
        }, 1000);
    }

    // 진행 표시기 중지
    stopProgressIndicator() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        const progressEl = document.getElementById('autoUpdateProgress');
        if (progressEl) {
            progressEl.style.width = '0%';
        }
    }

    // 데이터 파싱 메서드들
    parseWikipediaJSON(jsonText) {
        try {
            const data = JSON.parse(jsonText);
            const tickers = [];
            
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

    parseCSV(csvText) {
        try {
            const lines = csvText.split('\n');
            const tickers = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line) {
                    const ticker = line.split(',')[0].trim().replace(/"/g, '');
                    if (ticker && ticker.length <= 5 && ticker.match(/^[A-Z.]+$/)) {
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

    parseAlternativeCSV(csvText) {
        try {
            const lines = csvText.split('\n');
            const tickers = [];
            
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
                            if (ticker && ticker.length <= 5 && ticker.match(/^[A-Z.]+$/)) {
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
}

// 전역 스캐너 인스턴스
let stockScanner;

// 페이지 로드 시 초기화 (app.js에서 호출될 예정)
const initScanner = async () => {
    stockScanner = new BrowserStockScanner();
    await stockScanner.init();
    
    // 캐시된 결과 로드는 app.js에서 처리됨 (중복 방지)
    
    return stockScanner;
};