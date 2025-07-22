# CSS 폴더 룰

## 목적
UI 스타일링과 반응형 디자인을 관리하는 폴더입니다.

## 파일 구조
- `style.css` - 메인 스타일시트

## 코딩 룰

### CSS 작성 원칙
1. **반응형 우선**: 모바일 퍼스트 디자인
2. **Flexbox/Grid 활용**: 모던 레이아웃 기법 사용
3. **시맨틱 클래스명**: 의미있는 클래스명 사용
4. **재사용성**: 공통 컴포넌트 스타일링

### 네이밍 컨벤션
```css
/* BEM 방법론 활용 */
.component__element--modifier
.scanner__button--primary
.dashboard__card--highlighted
```

### 미디어 쿼리
```css
/* 모바일: 기본 */
.component { }

/* 태블릿: 768px 이상 */
@media (min-width: 768px) { }

/* 데스크탑: 1024px 이상 */
@media (min-width: 1024px) { }
```

### 색상 변수 활용
```css
:root {
  --primary-color: #007bff;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --error-color: #dc3545;
}
```

## 금지사항
- 인라인 스타일 사용 금지
- `!important` 남용 금지
- 절대 단위 (px) 남용 금지 (rem, em 권장)
- 하드코딩된 색상값 사용 금지