# Icons 폴더 룰

## 목적
PWA 아이콘과 이미지 리소스를 관리하는 폴더입니다.

## 파일 구조
PWA 필수 아이콘들:
- `icon-72x72.png` - 홈 스크린 아이콘 (iOS)
- `icon-96x96.png` - 홈 스크린 아이콘 (Android)
- `icon-128x128.png` - Chrome 앱 아이콘
- `icon-144x144.png` - 홈 스크린 아이콘 (Windows)
- `icon-152x152.png` - 홈 스크린 아이콘 (iPad)
- `icon-192x192.png` - 홈 스크린 아이콘 (Android)
- `icon-384x384.png` - 스플래시 스크린 아이콘
- `icon-512x512.png` - 마스커블 아이콘

## 아이콘 규칙

### 크기별 용도
```javascript
// manifest.json에서 사용되는 아이콘 정의
{
  "src": "icons/icon-192x192.png",
  "sizes": "192x192",
  "type": "image/png",
  "purpose": "any maskable"
}
```

### 디자인 가이드라인
1. **일관된 스타일**: 모든 크기에서 동일한 디자인 유지
2. **명확한 가독성**: 작은 크기에서도 식별 가능
3. **브랜딩**: 앱의 정체성을 나타내는 디자인
4. **접근성**: 색상 대비 및 시각적 명확성 고려

### 파일 형식
- **PNG 권장**: 투명도 지원 및 무손실 압축
- **JPG 허용**: 파일 크기가 중요한 경우
- **SVG 지원**: 벡터 그래픽 (최신 브라우저)

### 최적화
```bash
# ImageOptim 또는 TinyPNG를 사용한 최적화
# 파일 크기 최소화 (모바일 환경 고려)
```

### 색상 팔레트
```css
/* 앱 브랜딩 색상 */
:root {
  --primary-color: #007bff;    /* 파란색 */
  --success-color: #28a745;    /* 초록색 (돌파) */
  --warning-color: #ffc107;    /* 노란색 (대기) */
  --error-color: #dc3545;      /* 빨간색 (에러) */
}
```

## 브라우저별 지원

### iOS Safari
- 152x152px: iPad 홈 스크린
- 180x180px: iPhone 홈 스크린

### Chrome (Android)
- 192x192px: 홈 스크린 아이콘
- 512x512px: 스플래시 스크린

### Windows
- 144x144px: 타일 아이콘

## 파일 명명 규칙
```
icon-{width}x{height}.png
favicon-{size}.png
apple-touch-icon-{size}.png
```

## 금지사항
- 저작권이 있는 이미지 사용 금지
- 과도하게 큰 파일 크기 (100KB 이상) 금지
- 브랜딩과 일치하지 않는 디자인 금지
- 접근성 가이드라인 위반 금지