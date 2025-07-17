// 섹터 분석 클래스
class SectorAnalyzer {
    constructor() {
        this.sectorMapping = this.initializeSectorMapping();
        this.sectorPerformance = new Map();
        this.lastUpdateTime = null;
    }

    // 섹터 매핑 초기화
    initializeSectorMapping() {
        return {
            'Technology': [
                'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'AMD', 
                'PYPL', 'ADBE', 'CRM', 'INTC', 'CSCO', 'AVGO', 'ORCL', 'QCOM', 'TXN', 'INTU', 
                'AMAT', 'MU', 'LRCX', 'KLAC', 'MRVL', 'CDNS', 'SNPS', 'WDAY', 'ABNB', 'FTNT', 
                'DXCM', 'TEAM', 'ADSK', 'SPLK', 'DOCU', 'ZOOM', 'ROKU', 'CRWD', 'OKTA', 'SNOW', 
                'DDOG', 'ZS', 'PANW', 'UBER', 'LYFT', 'PLTR', 'RBLX', 'HOOD', 'AFRM', 'UPST', 'SQ', 'SHOP'
            ],
            'Healthcare': [
                'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'ABBV', 'DHR', 'BMY', 'CVS', 'MDT', 
                'GILD', 'REGN', 'VRTX', 'ISRG', 'CI', 'ANTM', 'HUM', 'BIIB', 'ILMN', 'MRNA', 
                'ZTS', 'EW', 'IDXX', 'A', 'SYK', 'BSX', 'ALGN', 'RMD', 'TECH', 'CTLT', 
                'BDX', 'WAT', 'MTD', 'DGX', 'LH', 'PKI', 'HOLX', 'RVTY', 'MOH', 'CNC', 
                'CAH', 'MCK', 'ABC', 'VTRS', 'GEHC', 'SOLV', 'PODD', 'HSIC'
            ],
            'Financial Services': [
                'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 
                'BLK', 'SPGI', 'ICE', 'CME', 'MCO', 'COF', 'USB', 'TFC', 'PNC', 'SCHW', 
                'BK', 'STT', 'NTRS', 'CFG', 'HBAN', 'RF', 'FITB', 'KEY', 'ZION', 'SIVB', 
                'PBCT', 'CMA', 'ALLY', 'DFS', 'SYF', 'FIS', 'FISV', 'ADP', 'PAYX', 'BR', 
                'MKTX', 'NDAQ', 'CBOE', 'TROW', 'BEN', 'IVZ', 'ETFC', 'IBKR', 'NAVI'
            ],
            'Consumer Discretionary': [
                'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'ORLY', 'LULU', 'EBAY', 
                'ETSY', 'CHTR', 'CMCSA', 'DISH', 'DIS', 'PARA', 'WBD', 'FOXA', 'FOX', 'GRMN', 
                'APTV', 'LEA', 'BWA', 'GM', 'F', 'RIVN', 'LCID', 'NVR', 'PHM', 'DHI', 
                'LEN', 'TOL', 'KBH', 'MTH', 'TMHC', 'TPG', 'HLT', 'MAR', 'H', 'IHG', 
                'WYNN', 'LVS', 'MGM', 'CZR', 'PENN', 'DKNG'
            ],
            'Consumer Staples': [
                'WMT', 'PG', 'KO', 'PEP', 'COST', 'MDLZ', 'WBA', 'EXC', 'CL', 'GIS', 
                'K', 'HSY', 'CPB', 'CAG', 'SJM', 'HRL', 'MKC', 'CHD', 'CLX', 'COTY', 
                'EL', 'KMB', 'SYY', 'DLTR', 'DG', 'KR', 'SWK', 'TSN', 'TAP', 'STZ', 
                'DEO', 'PM', 'MO', 'BTI', 'UVV', 'USFD', 'PFGC', 'CALM', 'JJSF', 'LANC', 
                'RIBT', 'SENEA', 'SENEB', 'SPTN', 'UNFI', 'USNA'
            ],
            'Energy': [
                'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'MPC', 'OXY', 'KMI', 
                'WMB', 'OKE', 'TRGP', 'LNG', 'FANG', 'DVN', 'PXD', 'CTRA', 'MRO', 'APA', 
                'HAL', 'BKR', 'FTI', 'NOV', 'HP', 'CHK', 'EQT', 'MTDR', 'SM', 'RRC', 
                'CNX', 'CIVI', 'CPG', 'CRC', 'CRGY', 'CRK', 'DINO', 'DRQ', 'EGY', 'ENLC', 
                'EPD', 'ET', 'HESM', 'HES', 'HPK', 'KRP', 'MPLX', 'NEXT', 'NRP'
            ],
            'Industrials': [
                'BA', 'UNP', 'UPS', 'HON', 'RTX', 'LMT', 'CAT', 'DE', 'GE', 'MMM', 
                'FDX', 'NSC', 'CSX', 'NOC', 'GD', 'EMR', 'ETN', 'ITW', 'PH', 'CMI', 
                'CARR', 'OTIS', 'PCAR', 'JCI', 'TT', 'ROK', 'FAST', 'VRSK', 'CTAS', 'EXPD', 
                'CHRW', 'JBHT', 'ODFL', 'XPO', 'ARCB', 'LSTR', 'MATX', 'SAIA', 'WERN', 'KNX', 
                'HUBG', 'FELE', 'GATX', 'GWR', 'RAIL', 'WAB', 'WABC'
            ],
            'Materials': [
                'LIN', 'APD', 'ECL', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'PPG', 'IFF', 
                'MLM', 'VMC', 'NUE', 'STLD', 'PKG', 'IP', 'WRK', 'SON', 'SEE', 'BALL', 
                'CCL', 'AMCR', 'AVY', 'CF', 'FMC', 'LYB', 'CE', 'RPM', 'ALB', 'EMN', 
                'MOS', 'AA', 'X', 'CLF', 'SCCO', 'TECK', 'RIO', 'BHP', 'VALE', 'GOLD', 
                'AEM', 'KGC', 'AU', 'EGO', 'CDE', 'AG', 'HL', 'PAAS'
            ],
            'Real Estate': [
                'AMT', 'PLD', 'CCI', 'EQIX', 'WELL', 'DLR', 'O', 'SBAC', 'PSA', 'EXR', 
                'AVB', 'EQR', 'VICI', 'VTR', 'ESS', 'MAA', 'KIM', 'REG', 'FRT', 'BXP', 
                'ARE', 'HST', 'CPT', 'UDR', 'PEAK', 'AIV', 'ELS', 'SUI', 'MSA', 'LSI', 
                'CUBE', 'REXR', 'AMH', 'INVH', 'COLD', 'PPS', 'LAMR', 'UNIT', 'ROIC', 'STAG', 
                'FR', 'KRC', 'HIW', 'DEI', 'PGRE', 'SLG', 'VNO', 'BDN', 'CUZ'
            ],
            'Utilities': [
                'NEE', 'DUK', 'SO', 'D', 'AEP', 'XEL', 'SRE', 'WEC', 'ED', 'EIX', 
                'ETR', 'ES', 'FE', 'AWK', 'PPL', 'CMS', 'DTE', 'NI', 'LNT', 'EVRG', 
                'AEE', 'CNP', 'VST', 'ATO', 'NJR', 'SWX', 'OGE', 'POR', 'AVA', 'AGR', 
                'BKH', 'SR', 'MDU', 'UTL', 'MGEE', 'OTTR', 'NOVA', 'YORW', 'ARTNA', 'CWEN', 
                'CWEN.A', 'HE', 'IDA', 'NEP', 'NWE', 'PNM', 'UGI', 'WTRG'
            ]
        };
    }

    // 티커로 섹터 찾기
    getSectorByTicker(ticker) {
        for (const [sector, tickers] of Object.entries(this.sectorMapping)) {
            if (tickers.includes(ticker)) {
                return sector;
            }
        }
        return 'Unknown';
    }

    // 섹터별 성과 계산
    async calculateSectorPerformance(breakoutStocks) {
        console.log('📊 섹터별 성과 계산 중...');
        
        const sectorData = {};
        
        // 각 섹터별로 데이터 초기화
        Object.keys(this.sectorMapping).forEach(sector => {
            sectorData[sector] = {
                breakoutCount: 0,
                totalStocks: this.sectorMapping[sector].length,
                breakoutRate: 0,
                avgGain: 0,
                totalGain: 0,
                bestPerformer: null,
                worstPerformer: null,
                breakoutStocks: []
            };
        });

        // 돌파 종목들을 섹터별로 분류
        breakoutStocks.forEach(stock => {
            const sector = this.getSectorByTicker(stock.ticker);
            if (sector !== 'Unknown' && sectorData[sector]) {
                sectorData[sector].breakoutCount++;
                sectorData[sector].breakoutStocks.push(stock);
                
                const gain = parseFloat(stock.gain) || 0;
                sectorData[sector].totalGain += gain;
                
                // 최고/최저 성과 업데이트
                if (!sectorData[sector].bestPerformer || gain > sectorData[sector].bestPerformer.gain) {
                    sectorData[sector].bestPerformer = { ticker: stock.ticker, gain };
                }
                if (!sectorData[sector].worstPerformer || gain < sectorData[sector].worstPerformer.gain) {
                    sectorData[sector].worstPerformer = { ticker: stock.ticker, gain };
                }
            }
        });

        // 추가 섹터 전체 성과 계산 (데모 모드에서 시뮬레이션)
        for (const [sector, data] of Object.entries(sectorData)) {
            if (data.breakoutCount > 0) {
                data.avgGain = data.totalGain / data.breakoutCount;
                data.breakoutRate = (data.breakoutCount / data.totalStocks) * 100;
                
                // 섹터 전체 성과 시뮬레이션 (실제로는 API를 통해 가져와야 함)
                data.sectorPerformance = await this.calculateSectorOverallPerformance(sector);
            }
        }

        // 결과 저장
        this.sectorPerformance = new Map(Object.entries(sectorData));
        this.lastUpdateTime = new Date();
        
        console.log('✅ 섹터별 성과 계산 완료:', sectorData);
        return sectorData;
    }

    // 섹터 전체 성과 계산 (시뮬레이션)
    async calculateSectorOverallPerformance(sector) {
        // 실제 환경에서는 섹터 ETF나 지수 데이터를 사용해야 함
        // 여기서는 데모를 위한 시뮬레이션
        const hash = this.hashCode(sector);
        const random = (seed) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };
        
        // 섹터별 특성을 반영한 성과 시뮬레이션
        const basePerformance = {
            'Technology': 0.5,
            'Healthcare': 0.3,
            'Financial Services': 0.2,
            'Consumer Discretionary': 0.1,
            'Consumer Staples': -0.1,
            'Energy': 0.8,
            'Industrials': 0.4,
            'Materials': 0.6,
            'Real Estate': -0.2,
            'Utilities': -0.3
        };

        const base = basePerformance[sector] || 0;
        const variation = (random(hash) - 0.5) * 2; // -1 to 1
        const performance = base + variation;

        return {
            dailyChange: performance,
            isPositive: performance > 0,
            strength: Math.abs(performance) > 0.5 ? 'strong' : 'weak'
        };
    }

    // 돌파 종목들의 섹터 정보 추가
    enrichBreakoutStocksWithSector(breakoutStocks) {
        return breakoutStocks.map(stock => ({
            ...stock,
            sector: this.getSectorByTicker(stock.ticker)
        }));
    }

    // 섹터 성과 요약
    getSectorSummary() {
        if (this.sectorPerformance.size === 0) {
            return null;
        }

        const sectors = Array.from(this.sectorPerformance.entries())
            .filter(([_, data]) => data.breakoutCount > 0)
            .sort((a, b) => b[1].breakoutCount - a[1].breakoutCount);

        return {
            totalSectors: sectors.length,
            topSector: sectors[0] || null,
            sectors: sectors,
            lastUpdate: this.lastUpdateTime
        };
    }

    // 특정 섹터 상세 정보
    getSectorDetails(sectorName) {
        return this.sectorPerformance.get(sectorName) || null;
    }

    // 해시 함수
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    // 섹터 색상 매핑
    getSectorColor(sector) {
        const colors = {
            'Technology': '#3B82F6',
            'Healthcare': '#10B981',
            'Financial Services': '#F59E0B',
            'Consumer Discretionary': '#EF4444',
            'Consumer Staples': '#8B5CF6',
            'Energy': '#F97316',
            'Industrials': '#6B7280',
            'Materials': '#84CC16',
            'Real Estate': '#06B6D4',
            'Utilities': '#EC4899'
        };
        return colors[sector] || '#9CA3AF';
    }

    // 섹터 성과 UI 카드 생성
    createSectorPerformanceCard(sector, data) {
        const card = document.createElement('div');
        card.className = 'sector-card';
        
        const performanceClass = data.sectorPerformance?.isPositive ? 'positive' : 'negative';
        const performanceIcon = data.sectorPerformance?.isPositive ? '📈' : '📉';
        const performanceText = data.sectorPerformance?.dailyChange ? 
            `${data.sectorPerformance.dailyChange > 0 ? '+' : ''}${data.sectorPerformance.dailyChange.toFixed(1)}%` : 'N/A';

        card.innerHTML = `
            <div class="sector-header">
                <h4 style="color: ${this.getSectorColor(sector)}">${sector}</h4>
                <div class="sector-performance ${performanceClass}">
                    ${performanceIcon} ${performanceText}
                </div>
            </div>
            <div class="sector-stats">
                <div class="stat-item">
                    <span class="stat-label">돌파 종목:</span>
                    <span class="stat-value">${data.breakoutCount}개</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">돌파율:</span>
                    <span class="stat-value">${data.breakoutRate.toFixed(1)}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">평균 수익:</span>
                    <span class="stat-value">+${data.avgGain.toFixed(1)}%</span>
                </div>
            </div>
            <div class="sector-details">
                <div class="best-performer">
                    <span class="performer-label">최고:</span>
                    <span class="performer-value">${data.bestPerformer?.ticker} (+${data.bestPerformer?.gain.toFixed(1)}%)</span>
                </div>
            </div>
        `;

        return card;
    }
}

// 전역 인스턴스 생성
window.sectorAnalyzer = new SectorAnalyzer();