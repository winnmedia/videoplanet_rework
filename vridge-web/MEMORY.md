# 프로젝트 메모리 - VLANET/VRidge

## 프로젝트 구조 및 환경 정보
- **프로젝트명**: VLANET/VRidge
- **프론트엔드**: Next.js 15.5 (App Router)
- **백엔드**: Django (Railway 배포)
- **데이터베이스**: PostgreSQL
- **캐시**: Redis
- **아키텍처**: Feature-Sliced Design (FSD)

### 디렉토리 구조
```
vridge-web/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx          # 랜딩 페이지
│   ├── globals.css       # 전역 스타일
│   └── dashboard/        # 대시보드 페이지
├── styles/               # 스타일 모듈
│   └── home.module.scss # 랜딩 페이지 CSS Module
├── widgets/              # FSD 위젯 레이어
│   └── Header/          # 헤더 위젯
├── shared/              # 공유 컴포넌트
└── public/              # 정적 자산
    └── images/          # 이미지 파일
```

---

## 작업 히스토리 (시간 역순)

### 2025-08-26 - 랜딩 페이지 CSS Module 리팩토링 완료
- **작업 내용**: 
  - CSS 중복 문제 완전 해결
  - CSS Modules 패턴으로 전환
  - 폰트 로딩 문제 해결 (시스템 폰트로 임시 대체)
  - 레이아웃 헤더 조건부 숨김 처리
  
- **주요 변경사항**:
  1. `styles/home.module.scss` 생성 - 클린한 모듈 기반 스타일
  2. `app/page.tsx` - CSS Module import로 변경
  3. `app/globals.css` - 랜딩 페이지 특별 처리 규칙 추가
  4. Contents, Brand Identity 섹션 제거

- **해결된 문제**:
  - CSS 클래스 충돌 및 중복 제거
  - 레이아웃 헤더와 랜딩 헤더 충돌 해결
  - 스타일 격리를 통한 유지보수성 향상

- **기술적 결정**:
  - CSS Modules 사용으로 스타일 스코프 격리
  - body 클래스를 통한 페이지별 레이아웃 제어
  - 시스템 폰트 우선 사용 (suit 폰트 파일 추가 필요)

### 2025-08-25 - 랜딩 페이지 레거시 디자인 복원
- **작업 내용**: vridge_front (React 18) 레거시 디자인을 Next.js로 마이그레이션
- **문제 발생**: SCSS 컴파일 에러, CSS 중복 및 요소 겹침
- **해결**: sass 패키지 설치, CSS Module 패턴 적용

### 2025-08-24 - 초기 프로젝트 설정
- **작업 내용**: VideoPlanet 프로젝트를 VLANET/VRidge로 브랜딩 변경
- **Redux Provider 이슈 해결**: StoreProvider 컴포넌트 수정
- **FSD 아키텍처 적용**: widgets, features, shared 레이어 구성

---

## 주요 결정사항 및 정책

### CSS 아키텍처
1. **CSS Modules 우선**: 모든 페이지별 스타일은 CSS Module 사용
2. **중복 방지**: 새 파일 생성 전 기존 파일 수정 가능성 검토
3. **디자인 토큰**: 하드코딩 대신 CSS 변수 사용
4. **!important 금지**: CSS 특정성으로 해결

### 개발 원칙
1. **클린 코드**: 중복 없는 통합형 코딩
2. **점진적 개선**: 한 번에 모든 것을 바꾸지 않음
3. **파일 네이밍**: Fix, Improved 접미사 금지
4. **버전 관리**: Git으로 관리, 파일명 변경 금지

---

## 다음 작업 예정
- [ ] suit 폰트 파일 추가
- [ ] 로그인 페이지 구현
- [ ] 대시보드 기능 강화
- [ ] API 연동 설정