# Changelog

모든 주목할 만한 변경 사항이 이 파일에 문서화됩니다.

이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

## [미출시] - Unreleased

### 추가됨 (Added)
- 없음

### 변경됨 (Changed)
- 없음

### 수정됨 (Fixed)
- 없음

### 제거됨 (Removed)
- 없음

### 보안 (Security)
- 없음

## [2.1.0] - 2025-08-26

### 추가됨 (Added)
- **레거시 UI 디자인 시스템 통합**
  - FSD 아키텍처 기반 사이드바 위젯 구현
  - 레거시 아이콘 리소스 전체 이식 (home, calendar, projects, feedback, content)
  - 슬라이딩 서브메뉴 네비게이션 시스템
  - 프로젝트 카운트 배지 기능
- **디자인 토큰 호환성 계층**
  - `$color-accent: #3dcdbf` 레거시 색상 추가
  - `$color-text-primary`, `$color-text-secondary` 추가
  - 레거시 버튼 스타일 및 인터랙션 패턴 지원
- **네비게이션 라우팅 시스템**
  - 대시보드, 프로젝트, 피드백, 캘린더, 콘텐츠 페이지 통합
  - 현재 경로 기반 활성 메뉴 자동 감지
  - 프로젝트 생성 페이지 추가
- **브라우저 메타데이터 개선**
  - 탭 제목: "VLANET 영상 협업툴의 신세계, 비디오플래닛"
  - SEO 최적화된 description 추가
- **버전 관리 전략 문서화**
  - 시맨틱 버전 관리 규칙 정립
  - Git Flow 브랜치 전략 정의
  - 커밋 메시지 표준화
  - 릴리스 관리 프로세스 수립

### 변경됨 (Changed)
- **대시보드 레이아웃 개선**
  - 고정 사이드바 (300px 폭) 적용
  - 메인 컨텐츠 영역 반응형 조정 (`ml-[300px]`)
  - 모든 페이지에 일관된 레이아웃 적용
- **디자인 시스템 업데이트**
  - 기존 디자인 토큰에 레거시 호환성 추가
  - 레거시 스타일 패턴과 현대적 CSS Modules 통합
- **프로젝트 구조 최적화**
  - widgets/SideBar/ FSD 계층 구조 완성
  - TypeScript 타입 정의 체계화 (SideBarItem, SubMenuItem)

### 수정됨 (Fixed)
- **Railway 배포 오류 해결**
  - `django-storages>=1.14.2` 모듈 의존성 추가
  - 안전한 import 처리 (try/except 블록)
  - Railway 환경 변수 및 설정 최적화
- **Django 설정 안정화**
  - storages 모듈 ImportError 방지
  - 환경별 설정 파일 호환성 개선
- **스타일 충돌 방지**
  - CSS 모듈 격리를 통한 스타일 안정성 확보
  - 하드코딩 제거 및 디자인 토큰 활용

### 보안 (Security)
- **의존성 보안 강화**
  - django-storages 최신 안정 버전 적용
  - 안전한 모듈 import 패턴 적용

---

## [2.0.0] - 2025-08-25

### 추가됨 (Added)
- **Next.js 15.5 + React 19 기반 신규 프로젝트 초기 설정**
  - FSD (Feature-Sliced Design) 아키텍처 적용
  - TypeScript 5.7 완전 지원
  - Tailwind CSS v4 + SCSS 하이브리드 디자인 시스템
  - Redux Toolkit 2.0 상태 관리
- **HTTP 에러 핸들링 시스템**
  - 표준화된 에러 응답 형식
  - 404, 500 에러 페이지 UI 개선
  - API 에러 테스트 인프라 구축 (12개 시나리오, 100% 성공률)
- **인증 시스템 개선**
  - 로그인 페이지 레거시 UI 재현
  - "아이디 저장" 기능 (localStorage 활용)
  - 회원가입 및 비밀번호 재설정 페이지
  - SendGrid API 연동 이메일 인증 시스템
- **이메일 템플릿 디자인**
  - 인증 이메일 템플릿 (verify_email.html)
  - 비밀번호 재설정 이메일 템플릿 (reset_password_email.html)
  - VRidge 브랜딩 및 전문적 디자인 적용

### 변경됨 (Changed)
- **프로젝트 구조 대대적 개편**
  - 레거시 CRA → Next.js App Router 마이그레이션
  - 모놀리식 → FSD 레이어드 아키텍처 전환
- **개발 환경 현대화**
  - Turbopack 번들러 적용
  - Vitest + Playwright 테스트 스택
  - ESLint + Prettier 코드 품질 도구

### 수정됨 (Fixed)
- **CSS 하이드레이션 이슈**
  - 랜딩 페이지 헤더 요소 0.1초 후 사라지는 문제 해결
  - `body.landing-page header:first-of-type { display: none !important }` 제거
- **SCSS 컴파일 오류**
  - `$color-gray-50: #fafafa` 누락 변수 추가
  - 디자인 토큰 일관성 확보

### 제거됨 (Removed)
- **Live Comment 섹션**
  - 랜딩 페이지에서 제거
  - 레거시 UI 디자인과 일치하도록 조정

---

## [1.0.0] - 2025-08-24

### 추가됨 (Added)
- **초기 프로젝트 설정**
  - Django 4.2 백엔드 기반 구조
  - React 18 (CRA) 프론트엔드
  - PostgreSQL + Redis 데이터베이스 스택
  - Railway 배포 환경 구성

### 변경됨 (Changed)
- 없음 (초기 릴리스)

### 수정됨 (Fixed)
- 없음 (초기 릴리스)

---

## 버전 관리 정책

### 버전 번호 체계
- **MAJOR**: 하위 호환성이 깨지는 변경
- **MINOR**: 새로운 기능 추가 (하위 호환성 유지)
- **PATCH**: 버그 수정 및 성능 개선

### 릴리스 주기
- **Major 릴리스**: 분기별 (3개월)
- **Minor 릴리스**: 월별 또는 기능 완성 시
- **Patch 릴리스**: 필요 시 (버그 수정, 보안 패치)

### 지원 정책
- **최신 Major 버전**: 전체 지원
- **이전 Major 버전**: 보안 패치만 지원 (6개월)
- **그 이전 버전**: 지원 중단

---

*이 CHANGELOG는 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/) 형식을 따릅니다.*