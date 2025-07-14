# 📈 S&P 500 실시간 돌파 스캐너

래리 윌리엄스(Larry Williams) 변동성 돌파 전략을 구현한 실시간 S&P 500 주식 스캐너입니다.

![S&P 500 Scanner](https://img.shields.io/badge/S%26P%20500-Scanner-blue?style=for-the-badge&logo=chart.js)
![Larry Williams Strategy](https://img.shields.io/badge/Larry%20Williams-Strategy-green?style=for-the-badge)
![PWA Ready](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge&logo=pwa)

## 🎯 주요 기능

### 📊 래리 윌리엄스 돌파 전략
- **진입가 공식**: `전일 종가 + (전일 고가 - 전일 저가) × 0.6`
- **변동성 필터링**: 2-8% 일일 변동성 범위 내 종목 선별
- **거래량 조건**: 100만주 이상 거래량, 거래량 증가 패턴 감지
- **리스크 관리**: 자동 손절가(-5%) 및 목표가(+2%, +5%) 계산

### 🎯 실시간 돌파 추적
- **워치리스트 생성**: 전날 데이터 기반 돌파 대기 종목 자동 선별
- **실시간 모니터링**: 30초/1분/5분 주기로 진입가 돌파 감지
- **즉시 알림**: 돌파 발생 시 브라우저 알림 + 소리 알림
- **모의 주문**: 리스크 기반 포지션 사이징 및 자동 주문 생성

### 📱 Progressive Web App (PWA)
- **오프라인 지원**: 캐시된 데이터로 오프라인에서도 분석 가능
- **모바일 최적화**: 반응형 디자인으로 모든 기기에서 사용
- **앱 설치**: 홈 화면에 설치하여 네이티브 앱처럼 사용
- **푸시 알림**: 중요한 돌파 이벤트 즉시 알림

## 🚀 빠른 시작

### 1. 프로젝트 복제
```bash
git clone https://github.com/munlucky/sp500-browser.git
cd sp500-browser
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 웹 서버 실행
```bash
# Python 3 사용
python -m http.server 8000

# 또는 Node.js 사용
npx http-server

# 또는 Live Server 확장 프로그램 사용 (VS Code)
```

### 4. 브라우저에서 접속
```
http://localhost:8000
```

## 📋 사용법

### 기본 워크플로우
1. **워치리스트 생성**: 전날 데이터로 돌파 대기 종목 자동 선별 (최대 30개)
2. **실시간 추적 시작**: 선별된 종목들의 진입가 돌파 모니터링
3. **돌파 알림 수신**: 돌파 발생 시 즉시 알림 + 모의 주문 생성
4. **수익 관리**: 목표가 달성 또는 손절가 도달 시 포지션 청산

### 주요 버튼 설명
- **🔍 워치리스트 생성**: 래리 윌리엄스 전략으로 돌파 대기 종목 선별
- **▶️ 추적 시작**: 실시간 돌파 감지 시작 (장시간에만 작동)
- **📊 전체 스캔**: S&P 500 전체 종목 스캔 (기존 기능)
- **🔔 알림 설정**: 브라우저 알림 권한 요청

### 설정 옵션
- **변동성 범위**: 2-10% (기본값: 2-6%)
- **최소 거래량**: 50만주-500만주 (기본값: 100만주)
- **추적 주기**: 15초-5분 (기본값: 30초)
- **리스크 금액**: 주문 수량 계산용 ($100-$10,000)
- **데모 모드**: 실제 API 없이 테스트 데이터 사용

## 🔧 기술 스택

### Frontend
- **Vanilla JavaScript**: 모던 ES6+ 문법 사용
- **CSS3**: Flexbox, Grid, CSS Variables 활용
- **HTML5**: 시맨틱 마크업, PWA 지원

### APIs & 데이터
- **Multi-Source API Manager**: 다중 데이터 소스를 통한 안정적 데이터 제공
  - **Yahoo Finance API**: 실시간 주식 데이터 (기본 소스 - 무료 무제한)
  - **Alpha Vantage API**: 백업 데이터 소스
  - **Financial Modeling Prep**: 보조 데이터 제공자
  - **IEX Cloud**: 추가 실시간 데이터
- **Smart Scanner**: Yahoo Finance 최적화된 효율적 스캔 전략
- **Wikipedia API**: S&P 500 종목 리스트
- **GitHub CSV**: 대체 데이터 소스

### PWA 기술
- **Service Worker**: 오프라인 캐싱 및 백그라운드 동기화
- **Web App Manifest**: 앱 설치 및 아이콘 설정
- **Local Storage**: 설정 및 결과 데이터 저장
- **Notification API**: 브라우저 알림
- **Web Audio API**: 소리 알림

### 테스트
- **Jest**: 단위 테스트 및 통합 테스트
- **32개 테스트**: 핵심 비즈니스 로직 검증
- **100% 통과율**: 모든 주요 기능 검증 완료

## 📊 래리 윌리엄스 전략 상세

### 핵심 원리
래리 윌리엄스의 변동성 돌파 전략은 **횡보 후 변동성 돌파**를 이용한 단기 매매 기법입니다.

### 진입 조건
```javascript
// 돌파 진입가 계산
const dailyRange = yesterdayHigh - yesterdayLow;
const entryPrice = yesterdayClose + (dailyRange * 0.6);

// 변동성 조건 (2-8%)
const volatility = (dailyRange / yesterdayClose) * 100;
const isValidVolatility = volatility >= 2 && volatility <= 8;

// 거래량 조건
const isValidVolume = yesterdayVolume >= 1000000;
```

### 리스크 관리
```javascript
// 손절 라인 (5% 손실)
const stopLoss = entryPrice * 0.95;

// 목표가 설정
const target1 = entryPrice * 1.02; // 2% 수익
const target2 = entryPrice * 1.05; // 5% 수익

// 포지션 사이징 (리스크 기반)
const riskPerShare = entryPrice - stopLoss;
const position = Math.floor(riskAmount / riskPerShare);
```

### 추가 필터
- **거래량 증가**: 전 5일 평균 대비 20% 이상 증가
- **가격 조건**: $10 이상 주가
- **횡보 패턴**: 최근 5일간 5% 이내 변동

## 🚀 API 제한 해결 방안

### 문제: Alpha Vantage 무료 API 제한
- **일일 제한**: 500회 API 호출 (무료 플랜)
- **분당 제한**: 최대 5회 호출
- **S&P 500**: 500개 전체 종목 스캔 불가능

### 해결책: Multi-Source API Manager
```javascript
// 다중 데이터 소스 우선순위 (Yahoo Finance 기본)
1. Yahoo Finance API (기본 소스 - 무료 무제한)
2. Alpha Vantage API (백업 소스)
3. Financial Modeling Prep (제한적 무료)
4. IEX Cloud (테스트 토큰)
```

### Smart Scanner 전략
- **우선순위 스캔**: 시가총액 상위 50종목 우선 분석
- **배치 스캔**: 25-100개씩 나누어 처리, 5초 간격 (Yahoo Finance 최적화)
- **혼합 전략**: 우선순위 + 랜덤 샘플링 (총 100종목)
- **적응형 스캔**: 실시간 API 상태에 따른 동적 조정

### 사용법
```bash
# 기본 스캔 (데모 모드)
데모 모드 체크 → 전체 스캔

# 스마트 스캔 (실제 API)
데모 모드 해제 → 전체 스캔 (자동으로 스마트 전략 사용)

# 로그 시스템
📋 로그 버튼 클릭 또는 Ctrl+L (Cmd+L)로 실시간 로그 확인
💾 다운로드 버튼으로 로그를 JSON 파일로 저장
```

## 📋 실시간 로그 시스템

### 주요 기능
- **실시간 로그**: 모든 시스템 동작을 실시간으로 화면에 표시
- **로그 레벨**: ERROR, WARN, INFO, SUCCESS, DEBUG 5단계 분류
- **필터링**: 로그 레벨별 필터링으로 원하는 정보만 확인
- **파일 저장**: JSON 형태로 로그를 파일로 다운로드
- **로컬 저장**: 최근 100개 로그를 브라우저에 자동 저장

### 사용방법
- **📋 로그 버튼**: 헤더의 로그 버튼으로 패널 열기/닫기
- **Ctrl+L 단축키**: 키보드로 빠른 로그 패널 토글
- **자동스크롤**: 새 로그가 추가될 때 자동으로 스크롤
- **다운로드**: 전체 로그를 날짜별 JSON 파일로 저장

### 로그 관리
- **자동 정리**: 최대 1000개 로그 보관 (초과 시 오래된 것 삭제)
- **성능 최적화**: 화면에는 최대 500개만 표시
- **지속성**: 페이지 새로고침 후에도 최근 로그 복원

## 🔔 알림 시스템

### 브라우저 알림
- **돌파 알림**: 진입가 돌파 시 즉시 알림
- **목표가 알림**: 수익 목표 달성 시 알림
- **손절 알림**: 손절가 도달 시 알림
- **일일 요약**: 장 마감 후 전체 결과 요약

### 알림 설정
- **권한 요청**: 최초 1회 브라우저 알림 권한 필요
- **소리 알림**: Web Audio API를 통한 효과음
- **스팸 방지**: 동일 종목 5분간 중복 알림 차단
- **조용한 시간**: 22:00-08:00 알림 음소거 옵션

## 📱 PWA 기능

### 설치 방법
1. **Chrome/Edge**: 주소창 옆 설치 아이콘 클릭
2. **Safari**: 공유 → 홈 화면에 추가
3. **Android**: 브라우저 메뉴 → 앱 설치
4. **iOS**: Safari에서 공유 버튼 → 홈 화면에 추가

### 오프라인 지원
- **캐시된 데이터**: 최근 스캔 결과 24시간 보관
- **설정 보존**: 모든 사용자 설정 로컬 저장
- **워치리스트**: 생성된 워치리스트 24시간 캐시
- **데모 모드**: 인터넷 없이도 전체 기능 테스트

## 🧪 테스트

### 테스트 실행
```bash
# 전체 테스트 실행
npm test

# 커버리지 리포트 생성
npm run test:coverage

# 감시 모드 (개발용)
npm run test:watch
```

### 테스트 구성
- **32개 테스트**: 핵심 기능 100% 검증
- **실행 시간**: 0.2초 (매우 빠름)
- **테스트 파일**: 2개 (핵심 로직 + 기본 구조)

### 검증 항목
- ✅ 래리 윌리엄스 공식 계산 정확성
- ✅ 변동성 및 거래량 필터링 로직
- ✅ 시장 시간 감지 (9:30-16:00, 주말 휴장)
- ✅ 돌파 감지 및 알림 시스템
- ✅ 리스크 관리 및 포지션 사이징
- ✅ 데이터 유효성 검증
- ✅ 성능 최적화 (500종목 0.1초 처리)

## ⚙️ 설정

### API 키 설정 (선택사항)
Alpha Vantage API 키를 사용하면 실시간 데이터를 이용할 수 있습니다.

1. [Alpha Vantage](https://www.alphavantage.co/support/#api-key)에서 무료 API 키 발급
2. `js/scanner.js` 파일의 `API_KEY` 변수 수정
3. 하루 500회 요청 제한 (무료 플랜)

**참고**: API 키 없이도 데모 모드로 모든 기능을 테스트할 수 있습니다.

### 브라우저 호환성
- **Chrome 80+**: 모든 기능 완벽 지원
- **Firefox 75+**: PWA 기능 제한적 지원
- **Safari 13+**: iOS에서 PWA 설치 가능
- **Edge 80+**: Chrome과 동일한 지원

## 🤝 기여하기

### 개발 환경 설정
```bash
# 저장소 포크 후 클론
git clone https://github.com/YOUR_USERNAME/sp500-browser.git
cd sp500-browser

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 테스트 실행
npm test
```

### 기여 가이드라인
1. **이슈 생성**: 버그 리포트나 기능 제안
2. **브랜치 생성**: `feature/your-feature-name`
3. **테스트 작성**: 새 기능에 대한 테스트 필수
4. **Pull Request**: 상세한 설명과 함께 제출

### 코딩 스타일
- **JavaScript**: ES6+ 모던 문법 사용
- **들여쓰기**: 2 스페이스
- **네이밍**: camelCase 사용
- **주석**: JSDoc 형식으로 함수 문서화

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 🔗 관련 링크

- **GitHub Repository**: [https://github.com/munlucky/sp500-browser](https://github.com/munlucky/sp500-browser)
- **Live Demo**: [GitHub Pages 링크]
- **Alpha Vantage API**: [https://www.alphavantage.co](https://www.alphavantage.co)
- **래리 윌리엄스 전략**: [투자 전략 참고 자료]

## ⚠️ 면책 조항

이 애플리케이션은 **교육 및 연구 목적**으로 제작되었습니다.

- **투자 조언 아님**: 실제 투자 결정에 사용하지 마세요
- **데이터 정확성**: 실시간 데이터의 정확성을 보장하지 않습니다
- **투자 위험**: 모든 투자에는 손실 위험이 있습니다
- **개인 책임**: 투자 결정은 본인의 책임하에 하시기 바랍니다

---

<div align="center">

**📈 성공적인 투자를 위한 첫 걸음! 📈**

Made with ❤️ by [munlucky](https://github.com/munlucky)

</div>